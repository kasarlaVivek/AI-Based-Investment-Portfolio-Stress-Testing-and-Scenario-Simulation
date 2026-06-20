import React from 'react';
import { Sprout, TrendingDown, TrendingUp } from 'lucide-react';

export function AssetSuggestions({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
          <Sprout className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Suggested Assets to Add</h3>
          <p className="text-sm text-gray-500">
            Candidates that could improve return and/or cut risk if added as a 10% position.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {suggestions.map((s) => {
          const helpsVol = s.projected_volatility_change_pct < 0;
          return (
            <div key={s.symbol} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-bold text-gray-900">{s.symbol}</span>
                  <span className="text-sm text-gray-500 ml-2">{s.name}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
                  {s.sector}
                </span>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed mb-3">{s.rationale}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-gray-400 uppercase font-bold tracking-wider">Correlation</p>
                  <p className="font-bold text-gray-800">{s.correlation_with_portfolio.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase font-bold tracking-wider">Exp. Return</p>
                  <p className="font-bold text-gray-800">{s.expected_annual_return_pct.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase font-bold tracking-wider">Volatility</p>
                  <p className="font-bold text-gray-800">{s.annual_volatility_pct.toFixed(1)}%</p>
                </div>
                <div className="flex items-center gap-1">
                  {helpsVol ? (
                    <TrendingDown className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-gray-400 uppercase font-bold tracking-wider">Risk Impact</p>
                    <p className={`font-bold ${helpsVol ? 'text-green-600' : 'text-red-500'}`}>
                      {helpsVol ? '' : '+'}{s.projected_volatility_change_pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
