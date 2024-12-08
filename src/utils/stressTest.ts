import * as tf from '@tensorflow/tfjs';
import { Stock } from '../types/portfolio';

export interface StressTestScenario {
  name: string;
  marketChange: number;
  volatilityChange: number;
  interestRateChange: number;
}

export const scenarios: StressTestScenario[] = [
  {
    name: 'Market Crash',
    marketChange: -0.30,
    volatilityChange: 0.80,
    interestRateChange: -0.01,
  },
  {
    name: 'Economic Recession',
    marketChange: -0.20,
    volatilityChange: 0.50,
    interestRateChange: -0.02,
  },
  {
    name: 'High Inflation',
    marketChange: -0.10,
    volatilityChange: 0.30,
    interestRateChange: 0.03,
  },
];

export interface StressTestResult {
  scenario: string;
  potentialLoss: number;
  riskScore: number;
  impactedStocks: Array<{
    symbol: string;
    potentialValue: number;
    percentageChange: number;
  }>;
}

export async function runStressTest(
  stocks: Stock[],
  historicalData: { [symbol: string]: number[] }
): Promise<StressTestResult[]> {
  const results: StressTestResult[] = [];

  for (const scenario of scenarios) {
    const impactedStocks = stocks.map(stock => {
      const stockData = historicalData[stock.symbol] || [];
      const volatility = calculateVolatility(stockData);
      const beta = calculateBeta(stockData);
      
      const impactMultiplier = 1 + (scenario.marketChange * beta);
      const potentialValue = (stock.currentPrice || 0) * impactMultiplier;
      const percentageChange = ((potentialValue - (stock.currentPrice || 0)) / (stock.currentPrice || 1)) * 100;

      return {
        symbol: stock.symbol,
        potentialValue,
        percentageChange,
      };
    });

    const totalPotentialLoss = impactedStocks.reduce(
      (sum, stock) => sum + (stock.percentageChange < 0 ? Math.abs(stock.percentageChange) : 0),
      0
    );

    results.push({
      scenario: scenario.name,
      potentialLoss: totalPotentialLoss,
      riskScore: calculateRiskScore(totalPotentialLoss, scenario.volatilityChange),
      impactedStocks,
    });
  }

  return results;
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252);
}

function calculateBeta(prices: number[]): number {
  if (prices.length < 2) return 1;
  const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  return returns.reduce((sum, r) => sum + Math.abs(r), 0) / returns.length * 1.5;
}

function calculateRiskScore(potentialLoss: number, volatilityChange: number): number {
  return Math.min(100, Math.round(potentialLoss * (1 + volatilityChange) * 100) / 100);
}