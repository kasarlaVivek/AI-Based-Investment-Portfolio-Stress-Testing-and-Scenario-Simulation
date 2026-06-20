import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#059669'];

export function SectorExposure({ data }) {
  if (!data || !data.breakdown || data.breakdown.length === 0) {
    return null;
  }

  const chartData = data.breakdown.map((item) => ({
    name: item.sector,
    value: parseFloat(item.value.toFixed(2)),
    percentage: item.percentage,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
          <PieIcon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sector Exposure</h3>
          <p className="text-sm text-gray-500 font-normal">Portfolio composition by industry sector.</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, props) => [`$${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
