/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState } from 'react';
import { Terminal, Database, Wrench } from 'lucide-react';
// @ts-ignore
import upyunLogo from './assets/upyun_logo_full.png';

const CurlModifier = lazy(() => import('./components/CurlModifier'));
const SqlInConverter = lazy(() => import('./components/SqlInConverter'));

export default function App() {
  const [activeTab, setActiveTab] = useState('curl');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-indigo-600" />
          <h1 className="font-bold text-lg tracking-tight">DevTools</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('curl')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'curl'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            cURL Modifier
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sql'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            SQL IN Converter
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto flex flex-col">
        <div className="max-w-5xl mx-auto flex-1 w-full">
          <Suspense
            fallback={
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                组件加载中...
              </div>
            }
          >
            {/* 只挂载当前 Tab 组件，避免隐藏组件持续占用状态与内存。 */}
            {activeTab === 'curl' ? <CurlModifier /> : <SqlInConverter />}
          </Suspense>
        </div>

        <footer className="mt-8 py-4 flex justify-center items-center">
          <a
            href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-base font-medium text-slate-500 hover:text-slate-800 transition-colors opacity-80 hover:opacity-100"
          >
            <span>本网站由</span>
            <img src={upyunLogo} alt="又拍云" className="h-6 w-auto" style={{ transform: 'translateY(-1px)' }} />
            <span>提供 CDN 加速 / 云存储服务</span>
          </a>
        </footer>
      </main>
    </div>
  );
}
