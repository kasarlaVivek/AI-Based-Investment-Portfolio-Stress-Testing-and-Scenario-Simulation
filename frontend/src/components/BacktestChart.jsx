import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { History } from 'lucide-react';
import { portfolioService } from '../services/api';

const HORIZONS = [1, 3, 5, 10];

export function BacktestChart({ portfolioId }) {
  const [years, setYears] = useState(5);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!portfolioId) return;
    let active = true;
    setLoading(true);
    setError(null);
    portfolioService.getBacktest(portfolioId, years)
      .then((res) => { if (active) setData(res); })
      .catch(() => { if (active) setError('Backtest data unavailable for this horizon.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [portfolioId, years]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Historical Backtest</h3>
            <p className="text-sm text-gray-500 font-normal">Buy-and-hold performance vs market benchmarks.</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setYears(h)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                years === h ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {h}Y
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Loading backtest data...</div>
      ) : error ? (
        <div className="h-80 flex items-center justify-center text-gray-400 text-sm">{error}</div>
      ) : data && data.timeline ? (
        <>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} minTickGap={40} />
                <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}`} />
                <Legend />
                <Line type="monotone" dataKey="portfolio" name="Your Portfolio" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="SPY" name="S&P 500 (SPY)" stroke="#9ca3af" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="QQQ" name="NASDAQ (QQQ)" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
            <div>
              <p className="text-gray-400 uppercase font-bold tracking-wider">Total Return</p>
              <p className={`text-lg font-bold ${data.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.total_return_pct >= 0 ? '+' : ''}{data.total_return_pct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase font-bold tracking-wider">Annualized Return</p>
              <p className="text-lg font-bold text-gray-800">{data.annualized_return_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase font-bold tracking-wider">Volatility</p>
              <p className="text-lg font-bold text-gray-800">{data.annualized_volatility_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase font-bold tracking-wider">Max Drawdown</p>
              <p className="text-lg font-bold text-red-500">-{data.max_drawdown_pct.toFixed(1)}%</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
