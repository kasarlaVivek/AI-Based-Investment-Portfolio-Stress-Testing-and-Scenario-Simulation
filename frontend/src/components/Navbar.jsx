import React from 'react';
import { BarChart3, Upload, LogOut, GitCompare } from 'lucide-react';

export function Navbar({ portfolios, selectedPortfolioId, onSelectPortfolio, onLogout, onCompare }) {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">AI Portfolio Intelligence</span>
          </div>

          <div className="flex items-center gap-4">
            {portfolios.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Portfolio:</span>
                <select
                  value={selectedPortfolioId || ''}
                  onChange={(e) => onSelectPortfolio(e.target.value ? Number(e.target.value) : null)}
                  className="bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-700 py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Portfolio</option>
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {portfolios.length >= 2 && (
              <button
                onClick={onCompare}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 px-4 py-2 rounded-xl transition-all"
              >
                <GitCompare className="h-4 w-4" />
                <span>Compare</span>
              </button>
            )}

            <button
              onClick={() => onSelectPortfolio(null)}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-4 py-2 rounded-xl transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>New Portfolio</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
