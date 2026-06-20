import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function MonteCarloChart({ simulationPaths, initialValue }) {
  const { paths, days } = simulationPaths;

  if (!paths || !days || !paths["50"]) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-gray-500">No simulation path data available.</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = days.map((day, idx) => ({
    day: `Day ${day}`,
    dayNum: day,
    p5: parseFloat(paths["5"][idx].toFixed(2)),
    p25: parseFloat(paths["25"][idx].toFixed(2)),
    p50: parseFloat(paths["50"][idx].toFixed(2)),
    p75: parseFloat(paths["75"][idx].toFixed(2)),
    p95: parseFloat(paths["95"][idx].toFixed(2)),
  }));

  const formatYAxis = (value) => `$${(value / 1000).toFixed(0)}k`;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 border-b pb-1 mb-2">{data.day}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600 flex justify-between gap-4">
              <span>95th Percentile (Best Case):</span>
              <span className="font-mono">${data.p95.toLocaleString()}</span>
            </p>
            <p className="text-blue-600 flex justify-between gap-4">
              <span>75th Percentile (Optimistic):</span>
              <span className="font-mono">${data.p75.toLocaleString()}</span>
            </p>
            <p className="text-purple-600 font-semibold flex justify-between gap-4">
              <span>50th Percentile (Median):</span>
              <span className="font-mono">${data.p50.toLocaleString()}</span>
            </p>
            <p className="text-amber-600 flex justify-between gap-4">
              <span>25th Percentile (Pessimistic):</span>
              <span className="font-mono">${data.p25.toLocaleString()}</span>
            </p>
            <p className="text-red-600 flex justify-between gap-4">
              <span>5th Percentile (Worst Case):</span>
              <span className="font-mono">${data.p5.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">10-Year Monte Carlo Projections</h3>
        <p className="text-sm text-gray-500">
          Simulated trajectory of initial ${initialValue.toLocaleString()} investment.
        </p>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorOuter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#fca5a5" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorInner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />

            <XAxis
              dataKey="dayNum"
              type="number"
              domain={[0, 'dataMax']}
              tickFormatter={(day) => `Y${(day / 252).toFixed(0)}`}
              stroke="#9ca3af"
              tickLine={false}
            />

            <YAxis
              tickFormatter={formatYAxis}
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area type="monotone" dataKey="p95" stroke="none" fill="url(#colorOuter)" fillOpacity={1} />
            <Area type="monotone" dataKey="p5" stroke="#f87171" strokeDasharray="4 4" strokeWidth={1.5} fill="none" />
            <Area type="monotone" dataKey="p75" stroke="none" fill="url(#colorInner)" fillOpacity={1} />
            <Area type="monotone" dataKey="p25" stroke="#60a5fa" strokeDasharray="3 3" strokeWidth={1.5} fill="none" />
            <Area type="monotone" dataKey="p50" stroke="#8b5cf6" strokeWidth={3} fill="none" name="Median (50th %)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-6 mt-4 text-xs font-medium text-gray-500">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
          Median Projection (50th %)
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-200 border border-blue-400 rounded mr-2"></span>
          Likely Range (25th - 75th %)
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-red-100 border border-red-400 border-dashed rounded mr-2"></span>
          Extreme Outliers (5th - 95th %)
        </div>
      </div>
    </div>
  );
}
