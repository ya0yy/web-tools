import React, { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2 } from 'lucide-react';

export default function CurlModifier() {
  const [inputCurl, setInputCurl] = useState('');
  const [parsedUrl, setParsedUrl] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:8080');
  const [baseUrlHistory, setBaseUrlHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('baseUrlHistory');
    return saved ? JSON.parse(saved) : ['http://localhost:8080'];
  });
  const [outByJq, setOutByJq] = useState(false);
  const [queryParams, setQueryParams] = useState<{ id: string; key: string; value: string; enabled: boolean }[]>([]);
  const [outputCurl, setOutputCurl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleParse = (val: string) => {
    setInputCurl(val);
    const urlRegex = /(https?:\/\/[^\s'"]+)/;
    const match = val.match(urlRegex);
    if (match) {
      try {
        const url = new URL(match[0]);
        setParsedUrl(match[0]);

        const params: any[] = [];
        url.searchParams.forEach((value, key) => {
          params.push({ id: Math.random().toString(), key, value, enabled: true });
        });
        setQueryParams(params);
      } catch (e) {
        console.error("Failed to parse URL", e);
      }
    } else {
      setParsedUrl('');
      setQueryParams([]);
    }
  };

  useEffect(() => {
    if (!inputCurl) {
      setOutputCurl('');
      return;
    }
    if (!parsedUrl) {
      setOutputCurl(inputCurl + (outByJq ? ' | jq' : ''));
      return;
    }

    try {
      const url = new URL(parsedUrl);
      if (baseUrl) {
        const newBase = new URL(baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`);
        url.protocol = newBase.protocol;
        url.host = newBase.host;
        url.port = newBase.port;
      }

      url.search = '';
      queryParams
        .filter((p) => p.enabled && p.key)
        .forEach((p) => {
          url.searchParams.append(p.key, p.value);
        });

      let result = inputCurl.replace(parsedUrl, url.toString());
      if (outByJq) {
        result += ' | jq';
      }
      setOutputCurl(result);
    } catch (e) {
      setOutputCurl(inputCurl + (outByJq ? ' | jq' : ''));
    }
  }, [inputCurl, parsedUrl, baseUrl, queryParams, outByJq]);

  const saveBaseUrlToHistory = (url: string) => {
    const trimmed = url.trim();
    if (trimmed) {
      const newHistory = [trimmed, ...baseUrlHistory.filter(h => h !== trimmed)].slice(0, 20);
      setBaseUrlHistory(newHistory);
      localStorage.setItem('baseUrlHistory', JSON.stringify(newHistory));
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
              onChange={(e) => handleParse(e.target.value)}
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
