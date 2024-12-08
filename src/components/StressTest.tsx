import React from 'react';
import { StressTestResult } from '../utils/stressTest';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface StressTestProps {
  results: StressTestResult[];
}

export function StressTest({ results }: StressTestProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
        <h2 className="text-xl font-semibold">Stress Test Results</h2>
      </div>
      
      <div className="space-y-6">
        {results.map((result) => (
          <div key={result.scenario} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">{result.scenario}</h3>
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 text-red-500 mr-1" />
                <span className="text-red-500 font-semibold">
                  -{result.potentialLoss.toFixed(2)}%
                </span>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">Risk Score</div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-red-500 h-2.5 rounded-full"
                  style={{ width: `${result.riskScore}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-gray-600 mt-1">
                {result.riskScore}/100
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Impact by Stock</h4>
              <div className="space-y-2">
                {result.impactedStocks.map((stock) => (
                  <div key={stock.symbol} className="flex justify-between text-sm">
                    <span>{stock.symbol}</span>
                    <span className={stock.percentageChange < 0 ? 'text-red-500' : 'text-green-500'}>
                      {stock.percentageChange.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}