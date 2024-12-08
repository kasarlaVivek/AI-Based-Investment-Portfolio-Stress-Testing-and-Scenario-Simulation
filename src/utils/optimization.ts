import { Stock } from '../types/portfolio';

export interface OptimizationSuggestion {
  type: 'DIVERSIFICATION' | 'REBALANCING' | 'RISK_REDUCTION' | 'COST_EFFICIENCY';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actions: string[];
}

export function generateOptimizationSuggestions(
  stocks: Stock[],
  stressTestResults: any
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  // Check portfolio concentration
  const totalValue = stocks.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
  const concentrationThreshold = 0.25; // 25%
  
  const highConcentrationStocks = stocks.filter(
    stock => (stock.totalValue || 0) / totalValue > concentrationThreshold
  );

  if (highConcentrationStocks.length > 0) {
    suggestions.push({
      type: 'DIVERSIFICATION',
      title: 'Reduce Portfolio Concentration',
      description: 'Some positions represent a large portion of your portfolio, increasing risk.',
      impact: 'HIGH',
      actions: highConcentrationStocks.map(
        stock => `Consider reducing position in ${stock.symbol} to below 25% of portfolio value`
      ),
    });
  }

  // Analyze risk levels
  const highRiskStocks = stocks.filter(stock => {
    const stressImpact = stressTestResults[0]?.impactedStocks.find(
      (s: any) => s.symbol === stock.symbol
    );
    return stressImpact && Math.abs(stressImpact.percentageChange) > 25;
  });

  if (highRiskStocks.length > 0) {
    suggestions.push({
      type: 'RISK_REDUCTION',
      title: 'Reduce High-Risk Exposure',
      description: 'Some positions show high sensitivity to market stress scenarios.',
      impact: 'HIGH',
      actions: highRiskStocks.map(
        stock => `Consider hedging or reducing position in ${stock.symbol}`
      ),
    });
  }

  // Check sector diversification
  if (stocks.length < 5) {
    suggestions.push({
      type: 'DIVERSIFICATION',
      title: 'Increase Sector Diversification',
      description: 'Portfolio may benefit from exposure to more sectors.',
      impact: 'MEDIUM',
      actions: [
        'Consider adding positions in different market sectors',
        'Look into ETFs for broader market exposure',
      ],
    });
  }

  return suggestions;
}