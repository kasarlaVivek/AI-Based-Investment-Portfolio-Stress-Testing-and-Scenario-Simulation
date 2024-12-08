import React from 'react';
import { Stock } from '../types/portfolio';
import { RISK_LEVELS } from '../config/constants';

interface RiskAnalysisProps {
  stock: Stock;
  historicalVolatility: number;
}

export function RiskAnalysis({ stock, historicalVolatility }: RiskAnalysisProps) {
  const getRiskLevel = (volatility: number) => {
    if (volatility < 0.15) return RISK_LEVELS.LOW;
    if (volatility < 0.25) return RISK_LEVELS.MEDIUM;
    return RISK_LEVELS.HIGH;
  };

  const riskLevel = getRiskLevel(historicalVolatility);
  const riskColor = {
    [RISK_LEVELS.LOW]: 'bg-green-100 text-green-800',
    [RISK_LEVELS.MEDIUM]: 'bg-yellow-100 text-yellow-800',
    [RISK_LEVELS.HIGH]: 'bg-red-100 text-red-800',
  }[riskLevel];

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Risk Analysis - {stock.symbol}</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Historical Volatility</p>
          <p className="text-lg font-medium">{(historicalVolatility * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Risk Level</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskColor}`}>
            {riskLevel}
          </span>
        </div>
      </div>
    </div>
  );
}