import React from 'react';
import { Stock } from '../types/portfolio';

interface PortfolioTableProps {
  stocks: Stock[];
}

export function PortfolioTable({ stocks }: PortfolioTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stocks.map((stock) => (
            <tr key={stock.symbol}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stock.symbol}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stock.quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stock.purchasePrice.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${stock.currentPrice?.toFixed(2) || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${stock.totalValue?.toFixed(2) || '-'}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                (stock.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${stock.profitLoss?.toFixed(2) || '-'}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                (stock.profitLossPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stock.profitLossPercentage?.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}