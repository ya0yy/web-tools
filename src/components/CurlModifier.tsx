import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Plus, Trash2 } from 'lucide-react';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
  formatJsonBody,
  parseCurlCommand,
  replaceCurlBody,
  replaceUrlInCurlCommand,
  type CurlBodySegment,
  type QueryParam,
} from '../utils/curlModifierUtils';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const BASE_URL_HISTORY_KEY = 'baseUrlHistory';
const MAX_BASE_URL_HISTORY = 20;
const INPUT_DEBOUNCE_MS = 150;

function loadBaseUrlHistory(): string[] {
  try {
    const saved = localStorage.getItem(BASE_URL_HISTORY_KEY);
    if (!saved) {
      return [DEFAULT_BASE_URL];
    }

    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((item) => typeof item === 'string');
    }
  } catch (error) {
    console.error('读取 Base URL 历史记录失败', error);
  }

  return [DEFAULT_BASE_URL];
}
export default function CurlModifier() {
  const [inputCurl, setInputCurl] = useState('');
  const debouncedInputCurl = useDebouncedValue(inputCurl, INPUT_DEBOUNCE_MS);
  const [parsedUrl, setParsedUrl] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [baseUrlHistory, setBaseUrlHistory] = useState<string[]>(loadBaseUrlHistory);
  const [outByJq, setOutByJq] = useState(false);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);
  const [bodySegment, setBodySegment] = useState<CurlBodySegment | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [hasBodyFlag, setHasBodyFlag] = useState(false);
  const [bodyFormatError, setBodyFormatError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 对输入做防抖后再解析，避免每次按键都重建 URL、Query 和 body 编辑状态。
    const parsedResult = parseCurlCommand(debouncedInputCurl);
    setParsedUrl(parsedResult.parsedUrl);
    setQueryParams(parsedResult.params);
    setBodySegment(parsedResult.bodySegment);
    setBodyText(parsedResult.bodySegment?.bodyText ?? '');
    setHasBodyFlag(parsedResult.hasBodyFlag);
    setBodyFormatError('');
  }, [debouncedInputCurl]);

  const outputCurl = useMemo(() => {
    if (!debouncedInputCurl) {
      return '';
    }

    try {
      // 先基于原始命令替换 body，再替换 URL，避免原始 body 位置索引在 URL 长度变化后失效。
      let result = replaceCurlBody(debouncedInputCurl, bodyText, bodySegment);
      result = replaceUrlInCurlCommand(result, parsedUrl, baseUrl, queryParams);
      if (outByJq) {
        result += ' | jq';
      }

      return result;
    } catch (error) {
      console.error('生成修改后的 cURL 失败', error);
      return debouncedInputCurl + (outByJq ? ' | jq' : '');
    }
  }, [debouncedInputCurl, parsedUrl, baseUrl, queryParams, bodyText, bodySegment, outByJq]);

  const saveBaseUrlToHistory = (url: string) => {
    const trimmed = url.trim();
    if (trimmed) {
      const newHistory = [trimmed, ...baseUrlHistory.filter((item) => item !== trimmed)].slice(
        0,
        MAX_BASE_URL_HISTORY,
      );
      setBaseUrlHistory(newHistory);
      localStorage.setItem(BASE_URL_HISTORY_KEY, JSON.stringify(newHistory));
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputCurl);
    setCopied(true);
    
    // Save to history
    saveBaseUrlToHistory(baseUrl);

    setTimeout(() => setCopied(false), 2000);
  };

  const addParam = () => {
    setQueryParams([...queryParams, { id: Math.random().toString(), key: '', value: '', enabled: true }]);
  };

  const updateParam = (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    setQueryParams(queryParams.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeParam = (id: string) => {
    setQueryParams(queryParams.filter((p) => p.id !== id));
  };

  const handleFormatBody = () => {
    const formatResult = formatJsonBody(bodyText);

    if ('message' in formatResult) {
      setBodyFormatError(formatResult.message);
      return;
    }

    setBodyText(formatResult.formatted);
    setBodyFormatError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">cURL Modifier</h2>
        <p className="text-slate-500 mt-1">
          Paste a cURL command to easily change its Base URL, query parameters, and body text.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Original cURL Command</label>
            <textarea
              className="w-full h-32 p-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none"
              placeholder="curl 'https://api.example.com/v1/data?id=123' -H 'Authorization: Bearer token'..."
              value={inputCurl}
              onChange={(e) => setInputCurl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Target Base URL</label>
            <input
              type="text"
              list="baseUrlHistory"
              className="w-full p-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              placeholder="http://localhost:8080"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                // If the user selects from datalist, save it immediately
                if (baseUrlHistory.includes(e.target.value)) {
                  saveBaseUrlToHistory(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveBaseUrlToHistory(baseUrl);
                }
              }}
            />
            <datalist id="baseUrlHistory">
              {baseUrlHistory.map((h, i) => (
                <option key={i} value={h} />
              ))}
            </datalist>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Query Parameters</label>
              <button
                onClick={addParam}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Param
              </button>
            </div>
            
            {queryParams.length === 0 ? (
              <div className="text-sm text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                No query parameters found.
              </div>
            ) : (
              <div className="space-y-2">
                {queryParams.map((param) => (
                  <div key={param.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      onChange={(e) => updateParam(param.id, 'enabled', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Key"
                      value={param.key}
                      onChange={(e) => updateParam(param.id, 'key', e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => updateParam(param.id, 'value', e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                    <button
                      onClick={() => removeParam(param.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-slate-700">Body</label>
              <button
                onClick={handleFormatBody}
                disabled={!bodyText}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Format JSON
              </button>
            </div>

            <textarea
              className="w-full min-h-[180px] p-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-y"
              placeholder="Request body text. If valid JSON, you can format it with the button above."
              value={bodyText}
              onChange={(e) => {
                setBodyText(e.target.value);
                if (bodyFormatError) {
                  setBodyFormatError('');
                }
              }}
            />

            {bodyFormatError ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {bodyFormatError}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                {hasBodyFlag && !bodySegment
                  ? 'A body flag was detected, but its original value could not be read. Editing here will overwrite the output body.'
                  : hasBodyFlag
                    ? 'The body text here stays editable as raw text. JSON formatting is optional.'
                    : 'No body detected. Typing here will append --data-raw to the output cURL.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-2 flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="block text-sm font-medium text-slate-700">Modified cURL</label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={outByJq}
                  onChange={(e) => setOutByJq(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                out by jq
              </label>
            </div>
            <button
              onClick={handleCopy}
              disabled={!outputCurl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            className="w-full flex-1 min-h-[300px] p-4 bg-slate-900 text-slate-50 border border-slate-800 rounded-xl shadow-inner font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            readOnly
            value={outputCurl}
            placeholder="Modified cURL will appear here..."
          />
        </div>
      </div>
    </div>
  );
}
