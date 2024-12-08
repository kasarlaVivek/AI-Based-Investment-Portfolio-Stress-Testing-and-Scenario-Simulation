import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { PortfolioTable } from './components/PortfolioTable';
import { PerformanceChart } from './components/PerformanceChart';
import { RiskAnalysis } from './components/RiskAnalysis';
import { StressTest } from './components/StressTest';
import { OptimizationSuggestions } from './components/OptimizationSuggestions';
import { Stock } from './types/portfolio';
import { BarChart, AlertTriangle } from 'lucide-react';
import { fetchStockPrice, fetchHistoricalData } from './services/alphaVantageService';
import { calculateVolatility } from './utils/analysis';
import { runStressTest, StressTestResult } from './utils/stressTest';
import { generateOptimizationSuggestions, OptimizationSuggestion } from './utils/optimization';

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stressTestResults, setStressTestResults] = useState<StressTestResult[]>([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);

  const handleDataUpload = async (data: Stock[]) => {
    setLoading(true);
    setError(null);
    try {
      const updatedStocks = await Promise.all(
        data.map(async (stock) => {
          const currentPrice = await fetchStockPrice(stock.symbol);
          return {
            ...stock,
            currentPrice,
            totalValue: stock.quantity * currentPrice,
            profitLoss: stock.quantity * (currentPrice - stock.purchasePrice),
            profitLossPercentage: ((currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100,
          };
        })
      );
      setStocks(updatedStocks);
      
      // Fetch historical data for all stocks
      const historicalDataMap: { [symbol: string]: number[] } = {};
      for (const stock of updatedStocks) {
        const data = await fetchHistoricalData(stock.symbol);
        historicalDataMap[stock.symbol] = data.map(d => d.price);
      }
      
      // Run stress tests and generate optimization suggestions
      const stressResults = await runStressTest(updatedStocks, historicalDataMap);
      setStressTestResults(stressResults);
      
      const suggestions = generateOptimizationSuggestions(updatedStocks, stressResults);
      setOptimizationSuggestions(suggestions);
    } catch (err) {
      setError('Failed to fetch stock data. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = async (symbol: string) => {
    setSelectedStock(symbol);
    setLoading(true);
    try {
      const data = await fetchHistoricalData(symbol);
      setHistoricalData(data);
    } catch (err) {
      setError('Failed to fetch historical data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center mb-8">
            <BarChart className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Stock Portfolio Analyzer</h1>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          )}
          
          {stocks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <FileUpload onDataUpload={handleDataUpload} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <PortfolioTable 
                  stocks={stocks} 
                  onStockSelect={handleStockSelect}
                />
              </div>
              
              {selectedStock && historicalData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
                    <h2 className="text-xl font-semibold mb-4">Performance Chart - {selectedStock}</h2>
                    <PerformanceChart 
                      data={historicalData} 
                      symbol={selectedStock} 
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <RiskAnalysis
                      stock={stocks.find(s => s.symbol === selectedStock)!}
                      historicalVolatility={calculateVolatility(historicalData.map(d => d.price))}
                    />
                  </div>
                </div>
              )}

              {stressTestResults.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StressTest results={stressTestResults} />
                  <OptimizationSuggestions suggestions={optimizationSuggestions} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;