import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractCurlBodySegment,
  formatJsonBody,
  parseCurlCommand,
  replaceCurlBody,
} from '../utils/curlModifierUtils';

test('parseCurlCommand 能提取带单引号包裹的 body 文本', () => {
  const result = parseCurlCommand(
    `curl 'https://example.com/api/users?id=1' --data-raw '{"name":"Tom"}'`,
  );

  assert.equal(result.parsedUrl, 'https://example.com/api/users?id=1');
  assert.equal(result.bodySegment?.flag, '--data-raw');
  assert.equal(result.bodySegment?.bodyText, '{"name":"Tom"}');
  assert.equal(result.hasBodyFlag, true);
});

test('extractCurlBodySegment 能提取未加引号的 body 参数', () => {
  const result = extractCurlBodySegment(
    "curl 'https://example.com/api/users' --data-raw plain-text-body -H 'x-demo: 1'",
  );

  assert.ok(result);
  assert.equal(result.flag, '--data-raw');
  assert.equal(result.bodyText, 'plain-text-body');
});

test('replaceCurlBody 能替换已有 body 并安全转义单引号', () => {
  const inputCurl =
    `curl 'https://example.com/api/users' -H 'Content-Type: text/plain' --data-raw 'old body'`;
  const segment = extractCurlBodySegment(inputCurl);

  assert.ok(segment);

  const outputCurl = replaceCurlBody(inputCurl, `O'Reilly`, segment);

  assert.match(outputCurl, /--data-raw 'O'\\''Reilly'/);
  assert.match(outputCurl, /Content-Type: text\/plain/);
});

test('replaceCurlBody 能在原始命令没有 body 时新增 --data-raw', () => {
  const outputCurl = replaceCurlBody(`curl 'https://example.com/api/users'`, '{"name":"Tom"}', null);

  assert.equal(outputCurl, `curl 'https://example.com/api/users' --data-raw '{"name":"Tom"}'`);
});

test('replaceCurlBody 能在 body 清空时输出空字符串 body', () => {
  const inputCurl = `curl 'https://example.com/api/users' --data 'demo'`;
  const segment = extractCurlBodySegment(inputCurl);

  assert.ok(segment);

  const outputCurl = replaceCurlBody(inputCurl, '', segment);

  assert.equal(outputCurl, `curl 'https://example.com/api/users' --data ''`);
});

test('replaceCurlBody 会把格式化后的 JSON body 压回单行输出', () => {
  const inputCurl = `curl 'https://example.com/api/users' --data-raw '{"name":"Tom"}'`;
  const segment = extractCurlBodySegment(inputCurl);

  assert.ok(segment);

  const outputCurl = replaceCurlBody(
    inputCurl,
    `{\n  "name": "Tom",\n  "enabled": true\n}`,
    segment,
  );

  assert.equal(
    outputCurl,
    `curl 'https://example.com/api/users' --data-raw '{"name":"Tom","enabled":true}'`,
  );
});

test('formatJsonBody 能格式化合法 JSON 文本', () => {
  const result = formatJsonBody('{"name":"Tom","items":[1,2]}');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.formatted,
      `{\n  "name": "Tom",\n  "items": [\n    1,\n    2\n  ]\n}`,
    );
  }
});

test('formatJsonBody 会为非法 JSON 返回明确错误而不是抛异常', () => {
  const result = formatJsonBody('{"name":}');

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /JSON/);
  }
});
