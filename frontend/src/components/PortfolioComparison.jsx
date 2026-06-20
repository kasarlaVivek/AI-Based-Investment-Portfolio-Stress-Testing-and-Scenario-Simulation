import React, { useState } from 'react';
import { X, GitCompare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { portfolioService } from '../services/api';

export function PortfolioComparison({ portfolios, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      setError('Select at least 2 portfolios to compare.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await portfolioService.compare(selectedIds);
      setResult(res.portfolios);
    } catch (err) {
      setError('Failed to compare portfolios. Make sure each has holdings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <GitCompare className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Compare Portfolios</h3>
              <p className="text-sm text-gray-500">Select 2 or more portfolios to compare value, return, and risk.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleId(p.id)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-xl border transition-colors ${
                selectedIds.includes(p.id)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={loading}
          className="mb-6 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {result && (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs uppercase font-bold text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-4">Portfolio</th>
                    <th className="py-2 pr-4">Value</th>
                    <th className="py-2 pr-4">P/L %</th>
                    <th className="py-2 pr-4">Volatility</th>
                    <th className="py-2 pr-4">Beta</th>
                    <th className="py-2 pr-4">Sharpe</th>
                    <th className="py-2 pr-4">VaR 95%</th>
                  </tr>
                </thead>
                <tbody>
                  {result.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-semibold text-gray-900">{r.name}</td>
                      <td className="py-2.5 pr-4">${r.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={`py-2.5 pr-4 font-semibold ${r.profit_loss_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {r.profit_loss_percentage >= 0 ? '+' : ''}{r.profit_loss_percentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-4">{r.portfolio_volatility?.toFixed(1)}%</td>
                      <td className="py-2.5 pr-4">{r.portfolio_beta?.toFixed(2)}</td>
                      <td className="py-2.5 pr-4">{r.sharpe_ratio?.toFixed(2)}</td>
                      <td className="py-2.5 pr-4">{r.value_at_risk_95?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="portfolio_volatility" name="Volatility %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sharpe_ratio" name="Sharpe Ratio" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit_loss_percentage" name="Return %" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
