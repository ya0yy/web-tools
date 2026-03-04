import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

export default function SqlInConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [separator, setSeparator] = useState<'whitespace' | 'newline' | 'comma'>('whitespace');
  const [quoteChar, setQuoteChar] = useState<'single' | 'double' | 'none'>('single');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);

  useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }

    let items: string[] = [];
    if (separator === 'whitespace') {
      items = input.split(/[\s,]+/);
    } else if (separator === 'newline') {
      items = input.split(/\r?\n/);
    } else if (separator === 'comma') {
      items = input.split(',');
    }

    items = items.map(item => item.trim()).filter(item => item.length > 0);

    if (removeDuplicates) {
      items = Array.from(new Set(items));
    }

    const formattedItems = items.map(item => {
      if (quoteChar === 'single') return `'${item}'`;
      if (quoteChar === 'double') return `"${item}"`;
      return item;
    });

    setOutput(formattedItems.join(', '));
  }, [input, separator, quoteChar, removeDuplicates]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
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
              disabled={!output}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            className="w-full flex-1 min-h-[300px] p-4 bg-slate-900 text-slate-50 border border-slate-800 rounded-xl shadow-inner font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            readOnly
            value={output}
            placeholder="'123', '456', '789'"
          />
        </div>
      </div>
    </div>
  );
}
