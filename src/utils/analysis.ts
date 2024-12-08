export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (returns.length - 1);
  
  return Math.sqrt(variance * 252); // Annualized volatility
}

export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  const meanReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const excessReturns = returns.map(r => r - riskFreeRate);
  const stdDev = Math.sqrt(excessReturns.reduce((sum, value) => sum + Math.pow(value - meanReturn, 2), 0) / (returns.length - 1));
  
  return (meanReturn - riskFreeRate) / stdDev;
}