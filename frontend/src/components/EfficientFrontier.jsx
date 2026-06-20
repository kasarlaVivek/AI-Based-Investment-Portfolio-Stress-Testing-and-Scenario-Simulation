import React from 'react';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

export function EfficientFrontier({ data }) {
  if (!data || data.error || !data.frontier || data.frontier.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <LineChartIcon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Efficient Frontier</h3>
        </div>
        <p className="text-sm text-gray-500">
          Not enough historical data or holdings to compute an efficient frontier (requires at least 2 holdings).
        </p>
      </div>
    );
  }

  const frontierData = data.frontier
    .map((p) => ({
      volatility: parseFloat(p.volatility.toFixed(2)),
      return: parseFloat(p.return.toFixed(2)),
    }))
    .sort((a, b) => a.volatility - b.volatility);

  const currentPoint = [{
    volatility: parseFloat(data.current_portfolio.volatility.toFixed(2)),
    return: parseFloat(data.current_portfolio.return.toFixed(2)),
  }];
  const minVarPoint = [{
    volatility: parseFloat(data.min_variance_portfolio.volatility.toFixed(2)),
    return: parseFloat(data.min_variance_portfolio.return.toFixed(2)),
  }];
  const maxSharpePoint = [{
    volatility: parseFloat(data.max_sharpe_portfolio.volatility.toFixed(2)),
    return: parseFloat(data.max_sharpe_portfolio.return.toFixed(2)),
  }];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <LineChartIcon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Efficient Frontier</h3>
          <p className="text-sm text-gray-500 font-normal">
            Modern Portfolio Theory: risk/return tradeoff across optimal portfolio mixes.
          </p>
        </div>
      </div>

      <div className="h-96 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="volatility"
              type="number"
              name="Volatility"
              unit="%"
              stroke="#9ca3af"
              label={{ value: 'Annualized Volatility (%)', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              dataKey="return"
              type="number"
              name="Return"
              unit="%"
              stroke="#9ca3af"
              label={{ value: 'Expected Annual Return (%)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value) => `${Number(value).toFixed(2)}%`}
            />
            <Legend />
            <Line
              data={frontierData}
              type="monotone"
              dataKey="return"
              stroke="#94a3b8"
              dot={false}
              name="Efficient Frontier"
              legendType="line"
            />
            <Scatter data={currentPoint} dataKey="return" name="Your Portfolio" fill="#2563eb" shape="circle" />
            <Scatter data={minVarPoint} dataKey="return" name="Min Variance" fill="#16a34a" shape="diamond" />
            <Scatter data={maxSharpePoint} dataKey="return" name="Max Sharpe" fill="#9333ea" shape="star" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="font-bold text-blue-700">Your Portfolio</p>
          <p className="text-gray-600">Return {data.current_portfolio.return.toFixed(1)}% / Vol {data.current_portfolio.volatility.toFixed(1)}%</p>
        </div>
        <div className="p-3 bg-green-50 rounded-xl">
          <p className="font-bold text-green-700">Minimum Variance</p>
          <p className="text-gray-600">Return {data.min_variance_portfolio.return.toFixed(1)}% / Vol {data.min_variance_portfolio.volatility.toFixed(1)}%</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl">
          <p className="font-bold text-purple-700">Max Sharpe Ratio</p>
          <p className="text-gray-600">Return {data.max_sharpe_portfolio.return.toFixed(1)}% / Vol {data.max_sharpe_portfolio.volatility.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
