import React from 'react';
import { ShieldAlert, HelpCircle } from 'lucide-react';

export function RiskAnalysis({ metrics }) {
  const {
    portfolio_volatility,
    portfolio_beta,
    sharpe_ratio,
    value_at_risk_95,
    conditional_value_at_risk_95
  } = metrics;

  const getRiskLevel = (vol) => {
    if (vol < 12.0) return { label: 'Low Risk', color: 'bg-green-50 text-green-700 border-green-200' };
    if (vol < 22.0) return { label: 'Medium Risk', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    return { label: 'High Risk', color: 'bg-red-50 text-red-700 border-red-200' };
  };

  const riskTier = getRiskLevel(portfolio_volatility);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Risk Analysis</h3>
            <p className="text-sm text-gray-500 font-normal">Modern Portfolio Theory risk statistics.</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${riskTier.color}`}>
          {riskTier.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Volatility */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Annual Volatility</span>
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50">
                Measures portfolio fluctuation size. Lower is calmer, higher is wilder.
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{portfolio_volatility.toFixed(2)}%</p>
        </div>

        {/* Beta */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Portfolio Beta</span>
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50">
                Sensitivity to the S&P 500. 1.0 matches the market; &gt;1.0 is more volatile.
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{portfolio_beta.toFixed(2)}</p>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Sharpe Ratio</span>
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50">
                Risk-adjusted return ratio. Above 1.0 is good; above 2.0 is excellent.
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{sharpe_ratio.toFixed(2)}</p>
        </div>

        {/* Value at Risk */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Value at Risk (95%)</span>
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50">
                Maximum expected loss in a year with 95% confidence under normal markets.
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{value_at_risk_95.toFixed(2)}%</p>
        </div>

        {/* Conditional Value at Risk */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Expected Shortfall</span>
            <div className="group relative cursor-help">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50">
                Average loss in the worst 5% of outcomes (Conditional VaR).
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-red-800">{conditional_value_at_risk_95.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}
