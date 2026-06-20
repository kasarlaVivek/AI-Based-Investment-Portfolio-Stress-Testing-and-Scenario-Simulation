import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Auth } from './components/Auth';
import { FileUpload } from './components/FileUpload';
import { PortfolioTable } from './components/PortfolioTable';
import { PerformanceChart } from './components/PerformanceChart';
import { RiskAnalysis } from './components/RiskAnalysis';
import { StressTest } from './components/StressTest';
import { MonteCarloChart } from './components/MonteCarloChart';
import { ROIProjection } from './components/ROIProjection';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { CorrelationHeatmap } from './components/CorrelationHeatmap';
import { EfficientFrontier } from './components/EfficientFrontier';
import { SectorExposure } from './components/SectorExposure';
import { BacktestChart } from './components/BacktestChart';
import { AssetSuggestions } from './components/AssetSuggestions';
import { PortfolioComparison } from './components/PortfolioComparison';
import { portfolioService, authService } from './services/api';
import { AlertTriangle, Trash2, Sparkles, FileDown } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [portfolioDetail, setPortfolioDetail] = useState(null);

  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  const [simulations, setSimulations] = useState([]);
  const [selectedScenarioName, setSelectedScenarioName] = useState('Normal Market');
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [efficientFrontier, setEfficientFrontier] = useState(null);
  const [sectorExposure, setSectorExposure] = useState(null);
  const [assetSuggestions, setAssetSuggestions] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPortfolios();
    }
  }, [isAuthenticated]);

  const loadPortfolios = async (selectId) => {
    try {
      const list = await portfolioService.list();
      setPortfolios(list);
      if (selectId) {
        setSelectedPortfolioId(selectId);
      } else if (list.length > 0 && selectedPortfolioId === null) {
        setSelectedPortfolioId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load portfolios:', err);
    }
  };

  useEffect(() => {
    if (selectedPortfolioId !== null) {
      fetchPortfolioData(selectedPortfolioId);
    } else {
      setPortfolioDetail(null);
      setSimulations([]);
      setRiskMetrics(null);
      setSuggestions([]);
      setEfficientFrontier(null);
      setSectorExposure(null);
      setAssetSuggestions([]);
      setSelectedSymbol(null);
      setHistoricalData([]);
    }
  }, [selectedPortfolioId]);

  const fetchPortfolioData = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const details = await portfolioService.get(id);
      setPortfolioDetail(details);

      if (details.holdings_detail.length > 0) {
        handleStockSelect(details.holdings_detail[0].symbol);
      }

      const risk = await portfolioService.getRiskAnalysis(id);
      setRiskMetrics(risk);

      const suggs = await portfolioService.getSuggestions(id);
      setSuggestions(suggs);

      try {
        const ef = await portfolioService.getEfficientFrontier(id);
        setEfficientFrontier(ef);
      } catch (err) {
        console.error('Failed to load efficient frontier:', err);
        setEfficientFrontier(null);
      }

      try {
        const sectors = await portfolioService.getSectorExposure(id);
        setSectorExposure(sectors);
      } catch (err) {
        console.error('Failed to load sector exposure:', err);
        setSectorExposure(null);
      }

      try {
        const assetSuggs = await portfolioService.getAssetSuggestions(id);
        setAssetSuggestions(assetSuggs);
      } catch (err) {
        console.error('Failed to load asset suggestions:', err);
        setAssetSuggestions([]);
      }

      try {
        const sims = await portfolioService.getSimulationResults(id);
        setSimulations(sims);
      } catch (simErr) {
        if (simErr.response?.status === 404) {
          setIsSimulating(true);
          const newSims = await portfolioService.runSimulation(id);
          setSimulations(newSims);
        } else {
          throw simErr;
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch portfolio analytics. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
      setIsSimulating(false);
    }
  };

  const handleStockSelect = async (symbol) => {
    setSelectedSymbol(symbol);
    try {
      const hist = await portfolioService.getHistoricalData(symbol);
      setHistoricalData(hist);
    } catch (err) {
      console.error(`Failed to load history for ${symbol}:`, err);
    }
  };

  const handleUploadSuccess = (portfolioId) => {
    loadPortfolios(portfolioId);
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolioId || !portfolioDetail) return;
    if (!window.confirm(`Are you sure you want to delete "${portfolioDetail.name}"?`)) return;

    setLoading(true);
    try {
      await portfolioService.delete(selectedPortfolioId);
      const remaining = portfolios.filter(p => p.id !== selectedPortfolioId);
      setPortfolios(remaining);
      setSelectedPortfolioId(remaining.length > 0 ? remaining[0].id : null);
    } catch (err) {
      setError('Failed to delete portfolio.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setPortfolios([]);
    setSelectedPortfolioId(null);
  };

  const handleDownloadReport = async () => {
    if (!selectedPortfolioId || !portfolioDetail) return;
    try {
      await portfolioService.downloadReport(selectedPortfolioId, portfolioDetail.name);
    } catch (err) {
      setError('Failed to generate PDF report.');
    }
  };

  const selectedSimulation = simulations.find(s => s.scenario_name === selectedScenarioName);

  if (!isAuthenticated) {
    return <Auth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
      <Navbar
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        onSelectPortfolio={setSelectedPortfolioId}
        onLogout={handleLogout}
        onCompare={() => setShowCompare(true)}
      />

      {showCompare && (
        <PortfolioComparison portfolios={portfolios} onClose={() => setShowCompare(false)} />
      )}

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">System Error</h4>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        )}

        {selectedPortfolioId === null ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Monte Carlo Risk Modeler
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
                Stress Test Your Investments
              </h2>
              <p className="mt-3 text-lg text-gray-500">
                Upload your portfolio CSV file to run 10-year Monte Carlo paths, evaluate correlations, and get AI reallocation suggestions.
              </p>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Portfolio Header Cards */}
            {portfolioDetail && (
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Active Portfolio</span>
                    <button
                      onClick={handleDownloadReport}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                      title="Download PDF Report"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDeletePortfolio}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Delete Portfolio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">{portfolioDetail.name}</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 shrink-0">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Cost Basis</span>
                    <p className="text-xl font-bold text-gray-950">${portfolioDetail.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Current Value</span>
                    <p className="text-xl font-bold text-blue-600">${portfolioDetail.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Return (P/L)</span>
                    <p className={`text-xl font-extrabold ${portfolioDetail.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {portfolioDetail.profit_loss >= 0 ? '+' : ''}
                      {portfolioDetail.profit_loss_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <h4 className="font-semibold text-gray-900 mt-4">Analyzing Portfolio Risk Metrics...</h4>
                <p className="text-sm text-gray-500 mt-1">Calibrating daily price series returns.</p>
              </div>
            ) : isSimulating ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                <h4 className="font-semibold text-gray-900 mt-4">Running Monte Carlo Simulations...</h4>
                <p className="text-sm text-gray-500 mt-1">Generating 1,000 correlated path forecasts for 2,520 trading days.</p>
              </div>
            ) : (
              <>
                {riskMetrics && <RiskAnalysis metrics={riskMetrics} />}

                {portfolioDetail && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <PortfolioTable
                        holdings={portfolioDetail.holdings_detail}
                        selectedSymbol={selectedSymbol}
                        onStockSelect={handleStockSelect}
                      />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                      {selectedSymbol && historicalData.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                            Price Trend - {selectedSymbol}
                          </h3>
                          <PerformanceChart data={historicalData} symbol={selectedSymbol} />
                        </div>
                      )}

                      {riskMetrics && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                            Asset Allocations
                          </h3>
                          <div className="space-y-3">
                            {riskMetrics.asset_metrics.map((metric) => (
                              <div key={metric.symbol} className="text-xs">
                                <div className="flex justify-between font-semibold text-gray-700 mb-1">
                                  <span>{metric.symbol}</span>
                                  <span>{metric.weight.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${metric.weight}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {portfolioDetail && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {sectorExposure && <SectorExposure data={sectorExposure} />}
                    {efficientFrontier && <EfficientFrontier data={efficientFrontier} />}
                  </div>
                )}

                {selectedPortfolioId && <BacktestChart portfolioId={selectedPortfolioId} />}

                {simulations.length > 0 && (
                  <div className="space-y-6">
                    <StressTest
                      results={simulations}
                      onSelectScenario={setSelectedScenarioName}
                      selectedScenarioName={selectedScenarioName}
                    />

                    {selectedSimulation && portfolioDetail && (
                      <div className="space-y-6">
                        <ROIProjection result={selectedSimulation} />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2">
                            <MonteCarloChart
                              simulationPaths={selectedSimulation.simulation_paths}
                              initialValue={portfolioDetail.current_value}
                            />
                          </div>

                          <div className="lg:col-span-1">
                            {riskMetrics && (
                              <CorrelationHeatmap correlationMatrix={riskMetrics.correlation_matrix} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <SuggestionsPanel suggestions={suggestions} />
                <AssetSuggestions suggestions={assetSuggestions} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
