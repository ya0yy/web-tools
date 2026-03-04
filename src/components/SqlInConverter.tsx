import React, { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import useDebouncedValue from '../hooks/useDebouncedValue';

type Separator = 'whitespace' | 'newline' | 'comma';
type QuoteChar = 'single' | 'double' | 'none';

type ConvertResult = {
  output: string;
  sourceItemCount: number;
  displayedItemCount: number;
  truncatedByInput: boolean;
  truncatedByItemCount: boolean;
};

const INPUT_DEBOUNCE_MS = 150;
const PREVIEW_INPUT_CHAR_LIMIT = 1_000_000;
const PREVIEW_ITEM_LIMIT = 5_000;

function splitItemsBySeparator(input: string, separator: Separator): string[] {
  if (separator === 'newline') {
    return input.split(/\r?\n/);
  }
  if (separator === 'comma') {
    return input.split(',');
  }
  return input.split(/[\s,]+/);
}

function wrapItemByQuote(item: string, quoteChar: QuoteChar): string {
  if (quoteChar === 'single') {
    return `'${item}'`;
  }
  if (quoteChar === 'double') {
    return `"${item}"`;
  }
  return item;
}

function buildSqlInOutput(
  rawInput: string,
  separator: Separator,
  quoteChar: QuoteChar,
  removeDuplicates: boolean,
  options?: { previewMode?: boolean },
): ConvertResult {
  if (!rawInput.trim()) {
    return {
      output: '',
      sourceItemCount: 0,
      displayedItemCount: 0,
      truncatedByInput: false,
      truncatedByItemCount: false,
    };
  }

  const previewMode = options?.previewMode ?? false;
  let workingInput = rawInput;
  let truncatedByInput = false;

  if (previewMode && rawInput.length > PREVIEW_INPUT_CHAR_LIMIT) {
    // 预览阶段仅处理前 1MB，避免超长输入在每次更新时造成大对象分配。
    workingInput = rawInput.slice(0, PREVIEW_INPUT_CHAR_LIMIT);
    truncatedByInput = true;
  }

  let items = splitItemsBySeparator(workingInput, separator)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (removeDuplicates) {
    items = Array.from(new Set(items));
  }

  const sourceItemCount = items.length;
  let displayedItems = items;
  let truncatedByItemCount = false;

  if (previewMode && items.length > PREVIEW_ITEM_LIMIT) {
    // 预览输出限制条数，避免在文本框中保留过长字符串副本。
    displayedItems = items.slice(0, PREVIEW_ITEM_LIMIT);
    truncatedByItemCount = true;
  }

  const output = displayedItems.map((item) => wrapItemByQuote(item, quoteChar)).join(', ');

  return {
    output,
    sourceItemCount,
    displayedItemCount: displayedItems.length,
    truncatedByInput,
    truncatedByItemCount,
  };
}

export default function SqlInConverter() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [separator, setSeparator] = useState<Separator>('whitespace');
  const [quoteChar, setQuoteChar] = useState<QuoteChar>('single');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const debouncedInput = useDebouncedValue(input, INPUT_DEBOUNCE_MS);

  // 预览输出改为派生值，避免 input + output 双份大字符串常驻内存。
  const previewResult = useMemo(
    () => buildSqlInOutput(debouncedInput, separator, quoteChar, removeDuplicates, { previewMode: true }),
    [debouncedInput, separator, quoteChar, removeDuplicates],
  );

  const handleCopy = async () => {
    // 复制时按当前完整输入实时生成，避免额外维护全量 output state。
    const fullResult = buildSqlInOutput(input, separator, quoteChar, removeDuplicates);
    await navigator.clipboard.writeText(fullResult.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">SQL IN Converter</h2>
        <p className="text-slate-500 mt-1">Convert TSV, Excel columns, or raw lists into a SQL IN clause format.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Input */}
        <div className="lg:col-span-5 flex flex-col space-y-2">
          <label className="block text-sm font-medium text-slate-700">Input Data</label>
          <textarea
            className="w-full flex-1 min-h-[300px] p-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none"
            placeholder="Paste your data here...&#10;123&#10;456&#10;789"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        {/* Middle: Options */}
        <div className="lg:col-span-2 flex flex-col justify-center space-y-6 bg-slate-100/50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Split By</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" checked={separator === 'whitespace'} onChange={() => setSeparator('whitespace')} className="text-indigo-600 focus:ring-indigo-500" />
                Whitespace / TSV
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" checked={separator === 'newline'} onChange={() => setSeparator('newline')} className="text-indigo-600 focus:ring-indigo-500" />
                Newline Only
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" checked={separator === 'comma'} onChange={() => setSeparator('comma')} className="text-indigo-600 focus:ring-indigo-500" />
                Comma
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Quote</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" checked={quoteChar === 'single'} onChange={() => setQuoteChar('single')} className="text-indigo-600 focus:ring-indigo-500" />
                Single ('a')
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" checked={quoteChar === 'double'} onChange={() => setQuoteChar('double')} className="text-indigo-600 focus:ring-indigo-500" />
                Double ("a")
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" checked={quoteChar === 'none'} onChange={() => setQuoteChar('none')} className="text-indigo-600 focus:ring-indigo-500" />
                None (1, 2)
              </label>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={removeDuplicates} onChange={(e) => setRemoveDuplicates(e.target.checked)} className="text-indigo-600 focus:ring-indigo-500 rounded" />
              Remove Duplicates
            </label>
          </div>
        </div>

        {/* Right: Output */}
        <div className="lg:col-span-5 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">SQL IN Clause</label>
            <button
              onClick={handleCopy}
              disabled={!previewResult.output}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {(previewResult.truncatedByInput || previewResult.truncatedByItemCount) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {previewResult.truncatedByInput
                ? `预览仅处理前 ${PREVIEW_INPUT_CHAR_LIMIT.toLocaleString()} 个字符。`
                : ''}
              {previewResult.truncatedByItemCount
                ? ` 预览仅展示前 ${PREVIEW_ITEM_LIMIT.toLocaleString()} 项（当前 ${previewResult.sourceItemCount.toLocaleString()} 项）。`
                : ''}
              {' '}复制按钮会按完整输入重新生成结果。
            </div>
          )}
          <textarea
            className="w-full flex-1 min-h-[300px] p-4 bg-slate-900 text-slate-50 border border-slate-800 rounded-xl shadow-inner font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            readOnly
            value={previewResult.output}
            placeholder="'123', '456', '789'"
          />
        </div>
      </div>
    </div>
  );
}
