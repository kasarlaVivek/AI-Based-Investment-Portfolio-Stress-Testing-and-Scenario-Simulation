import React from 'react';

export function PortfolioTable({ holdings, selectedSymbol, onStockSelect }) {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-5 border-b border-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Current Portfolio Holdings</h3>
          <p className="text-sm text-gray-500">Click a row to select ticker and view historical trend chart & risk summary.</p>
        </div>
      </div>
      
      <table className="min-w-full divide-y divide-gray-100 text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Symbol</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Price</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Price</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Value</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">P/L</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">P/L %</th>
            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sector</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {holdings.map((holding) => {
            const isSelected = selectedSymbol === holding.symbol;
            return (
              <tr
                key={holding.id || holding.symbol}
                onClick={() => onStockSelect && onStockSelect(holding.symbol)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-gray-50/50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{holding.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{holding.quantity.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${holding.purchase_price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${holding.current_price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${holding.cost.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${holding.current_value.toFixed(2)}</td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {holding.pnl >= 0 ? '+' : ''}${holding.pnl.toFixed(2)}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    holding.pnl_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {holding.pnl_percentage >= 0 ? '+' : ''}{holding.pnl_percentage.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {holding.sector}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
