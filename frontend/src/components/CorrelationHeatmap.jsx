import React from 'react';
import { Network } from 'lucide-react';

export function CorrelationHeatmap({ correlationMatrix }) {
  const symbols = Object.keys(correlationMatrix);

  if (symbols.length <= 1) {
    return null;
  }

  const getCellColor = (val) => {
    if (val >= 0.75) return 'bg-red-200 text-red-900 font-semibold';
    if (val >= 0.4) return 'bg-orange-100 text-orange-800';
    if (val >= 0.1) return 'bg-yellow-50 text-yellow-800';
    if (val >= -0.1) return 'bg-gray-50 text-gray-800';
    if (val >= -0.4) return 'bg-green-50 text-green-800';
    return 'bg-green-200 text-green-900 font-semibold';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Network className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Holding Correlation Matrix</h3>
          <p className="text-sm text-gray-500 font-normal">
            Measures how holdings move relative to each other. Values close to 1.0 mean identical movement.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full border-collapse border border-gray-100 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-xs font-semibold text-gray-500 border border-gray-100">Asset</th>
                {symbols.map((sym) => (
                  <th
                    key={sym}
                    className="p-3 text-center text-xs font-semibold text-gray-500 border border-gray-100 min-w-[70px]"
                  >
                    {sym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((rowSym) => (
                <tr key={rowSym} className="hover:bg-gray-50/50">
                  <td className="p-3 text-sm font-semibold text-gray-800 border border-gray-100 bg-gray-50/30">
                    {rowSym}
                  </td>
                  {symbols.map((colSym) => {
                    const val = correlationMatrix[rowSym]?.[colSym] ?? 1.0;
                    return (
                      <td
                        key={colSym}
                        className={`p-3 text-center text-sm font-mono border border-gray-100 transition-colors ${getCellColor(val)}`}
                        title={`Correlation between ${rowSym} and ${colSym}: ${val.toFixed(3)}`}
                      >
                        {val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 text-[11px] text-gray-400 font-semibold px-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-200 rounded"></span> Hedges (Negative)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-gray-50 border rounded"></span> Neutral (Low)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-100 rounded"></span> Aligned (Moderate)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-200 rounded"></span> Identical/Risk (High)</span>
      </div>
    </div>
  );
}
