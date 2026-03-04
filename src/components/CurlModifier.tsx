import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Plus, Trash2 } from 'lucide-react';
import useDebouncedValue from '../hooks/useDebouncedValue';

type QueryParam = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

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

function parseCurlCommand(input: string): { parsedUrl: string; params: QueryParam[] } {
  if (!input.trim()) {
    return { parsedUrl: '', params: [] };
  }

  const urlRegex = /(https?:\/\/[^\s'"]+)/;
  const match = input.match(urlRegex);
  if (!match) {
    return { parsedUrl: '', params: [] };
  }

  try {
    const url = new URL(match[0]);
    const params: QueryParam[] = [];
    let index = 0;

    // 将 URL 查询参数拆分成可编辑结构，便于在 UI 上独立开关与修改。
    url.searchParams.forEach((value, key) => {
      index += 1;
      params.push({
        id: `param-${index}`,
        key,
        value,
        enabled: true,
      });
    });

    return { parsedUrl: match[0], params };
  } catch (error) {
    console.error('解析 cURL URL 失败', error);
    return { parsedUrl: '', params: [] };
  }
}

export default function CurlModifier() {
  const [inputCurl, setInputCurl] = useState('');
  const debouncedInputCurl = useDebouncedValue(inputCurl, INPUT_DEBOUNCE_MS);
  const [parsedUrl, setParsedUrl] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [baseUrlHistory, setBaseUrlHistory] = useState<string[]>(loadBaseUrlHistory);
  const [outByJq, setOutByJq] = useState(false);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 对输入做防抖后再解析，减少每次按键都进行 URL 解析和数组重建。
    const parsedResult = parseCurlCommand(debouncedInputCurl);
    setParsedUrl(parsedResult.parsedUrl);
    setQueryParams(parsedResult.params);
  }, [debouncedInputCurl]);

  const outputCurl = useMemo(() => {
    if (!debouncedInputCurl) {
      return '';
    }

    if (!parsedUrl) {
      return debouncedInputCurl + (outByJq ? ' | jq' : '');
    }

    try {
      const url = new URL(parsedUrl);
      const trimmedBaseUrl = baseUrl.trim();

      if (trimmedBaseUrl) {
        const normalizedBaseUrl = trimmedBaseUrl.startsWith('http')
          ? trimmedBaseUrl
          : `http://${trimmedBaseUrl}`;
        const newBase = new URL(normalizedBaseUrl);
        url.protocol = newBase.protocol;
        url.host = newBase.host;
      }

      url.search = '';
      queryParams
        .filter((param) => param.enabled && param.key)
        .forEach((param) => {
          url.searchParams.append(param.key, param.value);
        });

      let result = debouncedInputCurl.replace(parsedUrl, url.toString());
      if (outByJq) {
        result += ' | jq';
      }

      return result;
    } catch (error) {
      console.error('生成修改后的 cURL 失败', error);
      return debouncedInputCurl + (outByJq ? ' | jq' : '');
    }
  }, [debouncedInputCurl, parsedUrl, baseUrl, queryParams, outByJq]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">cURL Modifier</h2>
        <p className="text-slate-500 mt-1">Paste a cURL command to easily change its Base URL and query parameters.</p>
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
