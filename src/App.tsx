/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Database, Wrench } from 'lucide-react';
import CurlModifier from './components/CurlModifier';
import SqlInConverter from './components/SqlInConverter';

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
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className={activeTab === 'curl' ? 'block' : 'hidden'}>
            <CurlModifier />
          </div>
          <div className={activeTab === 'sql' ? 'block' : 'hidden'}>
            <SqlInConverter />
          </div>
        </div>
      </main>
    </div>
  );
}
