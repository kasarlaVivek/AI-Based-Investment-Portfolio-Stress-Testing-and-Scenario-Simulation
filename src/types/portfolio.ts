export interface Stock {
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  totalValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
}

export interface PortfolioStats {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}