export type QueryParam = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type CurlBodySegment = {
  flag: string;
  bodyText: string;
  start: number;
  end: number;
};

export type ParsedCurlCommand = {
  parsedUrl: string;
  params: QueryParam[];
  bodySegment: CurlBodySegment | null;
  hasBodyFlag: boolean;
};

export type JsonFormatResult =
  | {
      ok: true;
      formatted: string;
    }
  | {
      ok: false;
      message: string;
    };

const BODY_FLAG_ONLY_REGEX = /(^|\s)(--data-raw|--data-binary|--data|-d)\b/;
const URL_REGEX = /(https?:\/\/[^\s'"]+)/;
const SHELL_SINGLE_QUOTE_ESCAPE = "'\\''";

/**
 * 读取 shell 单引号字符串，并兼容 `'\''` 这种 shell 常见的单引号转义形式。
 */
function readSingleQuotedShellValue(
  input: string,
  quoteStartIndex: number,
): { ok: true; value: string; end: number } | { ok: false } {
  let cursor = quoteStartIndex + 1;
  let value = '';

  while (cursor < input.length) {
    const nextQuoteIndex = input.indexOf("'", cursor);
    if (nextQuoteIndex === -1) {
      return { ok: false };
    }

    value += input.slice(cursor, nextQuoteIndex);

    if (input.slice(nextQuoteIndex, nextQuoteIndex + 4) === "'\\''") {
      value += "'";
      cursor = nextQuoteIndex + 4;
      continue;
    }

    return {
      ok: true,
      value,
      end: nextQuoteIndex + 1,
    };
  }

  return { ok: false };
}

/**
 * 读取 shell 双引号字符串，并把常见的反斜杠转义还原为可编辑文本。
 */
function readDoubleQuotedShellValue(
  input: string,
  quoteStartIndex: number,
): { ok: true; value: string; end: number } | { ok: false } {
  let cursor = quoteStartIndex + 1;
  let value = '';

  while (cursor < input.length) {
    const currentChar = input[cursor];

    if (currentChar === '\\') {
      const nextChar = input[cursor + 1];
      if (nextChar === undefined) {
        return { ok: false };
      }

      value += nextChar;
      cursor += 2;
      continue;
    }

    if (currentChar === '"') {
      return {
        ok: true,
        value,
        end: cursor + 1,
      };
    }

    value += currentChar;
    cursor += 1;
  }

  return { ok: false };
}

/**
 * 读取未加引号的 shell 参数，同时兼容 `\ ` 这种基于反斜杠的字符转义。
 */
function readUnquotedShellValue(
  input: string,
  startIndex: number,
): { ok: true; value: string; end: number } | { ok: false } {
  let cursor = startIndex;
  let value = '';

  while (cursor < input.length) {
    const currentChar = input[cursor];

    if (/\s/.test(currentChar)) {
      break;
    }

    if (currentChar === '\\') {
      const nextChar = input[cursor + 1];
      if (nextChar === undefined) {
        return { ok: false };
      }

      value += nextChar;
      cursor += 2;
      continue;
    }

    value += currentChar;
    cursor += 1;
  }

  return {
    ok: true,
    value,
    end: cursor,
  };
}

/**
 * 把任意 body 文本统一输出为安全的 shell 单引号字面量，避免空格和特殊字符破坏命令。
 */
function normalizeBodyTextForOutput(bodyText: string): string {
  try {
    // 如果 body 是合法 JSON，就在输出 cURL 时压成单行，避免右侧结果跟着格式化成多行。
    return JSON.stringify(JSON.parse(bodyText));
  } catch {
    return bodyText;
  }
}

/**
 * 把 body 文本转成适合输出区展示的一行 shell 字面量。
 */
function quoteShellBody(bodyText: string): string {
  const normalizedBodyText = normalizeBodyTextForOutput(bodyText);
  return `'${normalizedBodyText.replace(/'/g, SHELL_SINGLE_QUOTE_ESCAPE)}'`;
}

/**
 * 解析 cURL 中的 URL 和查询参数，供界面复用既有的 Base URL / Query 编辑能力。
 */
function extractUrlAndQueryParams(input: string): { parsedUrl: string; params: QueryParam[] } {
  if (!input.trim()) {
    return { parsedUrl: '', params: [] };
  }

  const matchedUrl = input.match(URL_REGEX);
  if (!matchedUrl) {
    return { parsedUrl: '', params: [] };
  }

  try {
    const url = new URL(matchedUrl[0]);
    const params: QueryParam[] = [];
    let index = 0;

    url.searchParams.forEach((value, key) => {
      index += 1;
      params.push({
        id: `param-${index}`,
        key,
        value,
        enabled: true,
      });
    });

    return { parsedUrl: matchedUrl[0], params };
  } catch (error) {
    console.error('解析 cURL URL 失败', error);
    return { parsedUrl: '', params: [] };
  }
}

/**
 * 提取 cURL 中第一个 body 参数，支持单引号、双引号和未加引号的普通文本。
 */
export function extractCurlBodySegment(input: string): CurlBodySegment | null {
  if (!input.trim()) {
    return null;
  }

  const flagMatch = BODY_FLAG_ONLY_REGEX.exec(input);
  if (!flagMatch || typeof flagMatch.index !== 'number') {
    return null;
  }

  const flag = flagMatch[2];
  let cursor = flagMatch.index + flagMatch[0].length;

  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor += 1;
  }

  if (cursor >= input.length) {
    return {
      flag,
      bodyText: '',
      start: cursor,
      end: cursor,
    };
  }

  let parsedValue: { ok: true; value: string; end: number } | { ok: false };

  if (input[cursor] === "'") {
    parsedValue = readSingleQuotedShellValue(input, cursor);
  } else if (input[cursor] === '"') {
    parsedValue = readDoubleQuotedShellValue(input, cursor);
  } else {
    parsedValue = readUnquotedShellValue(input, cursor);
  }

  if (!parsedValue.ok) {
    return null;
  }

  return {
    flag,
    bodyText: parsedValue.value,
    start: cursor,
    end: parsedValue.end,
  };
}

/**
 * 综合解析 cURL，统一返回 URL、查询参数和 body 片段，减少组件内的字符串处理分支。
 */
export function parseCurlCommand(input: string): ParsedCurlCommand {
  const { parsedUrl, params } = extractUrlAndQueryParams(input);

  return {
    parsedUrl,
    params,
    bodySegment: extractCurlBodySegment(input),
    hasBodyFlag: BODY_FLAG_ONLY_REGEX.test(input),
  };
}

/**
 * 按用户编辑结果替换 cURL 的 URL 和 Query 参数，不改动 body 及其他 header。
 */
export function replaceUrlInCurlCommand(
  inputCurl: string,
  parsedUrl: string,
  baseUrl: string,
  queryParams: QueryParam[],
): string {
  if (!inputCurl) {
    return '';
  }

  if (!parsedUrl) {
    return inputCurl;
  }

  try {
    const url = new URL(parsedUrl);
    const trimmedBaseUrl = baseUrl.trim();

    if (trimmedBaseUrl) {
      const normalizedBaseUrl = trimmedBaseUrl.startsWith('http') ? trimmedBaseUrl : `http://${trimmedBaseUrl}`;
      const newBaseUrl = new URL(normalizedBaseUrl);
      url.protocol = newBaseUrl.protocol;
      url.host = newBaseUrl.host;
    }

    url.search = '';

    queryParams
      .filter((param) => param.enabled && param.key)
      .forEach((param) => {
        url.searchParams.append(param.key, param.value);
      });

    return inputCurl.replace(parsedUrl, url.toString());
  } catch (error) {
    console.error('生成替换后的 cURL URL 失败', error);
    return inputCurl;
  }
}

/**
 * 把当前 body 文本写回 cURL。
 * 已有 body 时覆盖原值；没有 body 时，仅在输入了新文本后追加 `--data-raw`。
 */
export function replaceCurlBody(
  inputCurl: string,
  bodyText: string,
  bodySegment: CurlBodySegment | null,
): string {
  if (!inputCurl) {
    return '';
  }

  const quotedBody = quoteShellBody(bodyText);

  if (bodySegment) {
    return inputCurl.slice(0, bodySegment.start) + quotedBody + inputCurl.slice(bodySegment.end);
  }

  const flagMatch = BODY_FLAG_ONLY_REGEX.exec(inputCurl);
  if (flagMatch && typeof flagMatch.index === 'number') {
    const insertPosition = flagMatch.index + flagMatch[0].length;
    return inputCurl.slice(0, insertPosition) + ` ${quotedBody}` + inputCurl.slice(insertPosition);
  }

  if (bodyText === '') {
    return inputCurl;
  }

  return `${inputCurl} --data-raw ${quotedBody}`;
}

/**
 * 仅在用户点击“格式化 JSON”时尝试解析；失败时返回可展示的提示文案，不影响正常编辑。
 */
export function formatJsonBody(bodyText: string): JsonFormatResult {
  try {
    const parsedValue = JSON.parse(bodyText);
    return {
      ok: true,
      formatted: JSON.stringify(parsedValue, null, 2),
    };
  } catch {
    return {
      ok: false,
      message: 'Current body is not valid JSON, so it cannot be formatted.',
    };
  }
}
