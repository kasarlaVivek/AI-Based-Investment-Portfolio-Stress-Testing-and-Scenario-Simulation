import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function StressTest({ results, onSelectScenario, selectedScenarioName }) {
  const getScenarioClass = (name) => {
    const isSelected = selectedScenarioName === name;
    if (name.includes("Crash") || name.includes("Bear")) {
      return isSelected 
        ? 'border-red-500 bg-red-50/40 text-red-950 shadow-sm ring-1 ring-red-500' 
        : 'border-gray-200 hover:border-red-300 hover:bg-red-50/10';
    }
    if (name.includes("Inflation")) {
      return isSelected 
        ? 'border-orange-500 bg-orange-50/40 text-orange-950 shadow-sm ring-1 ring-orange-500' 
        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/10';
    }
    return isSelected 
      ? 'border-green-500 bg-green-50/40 text-green-950 shadow-sm ring-1 ring-green-500' 
      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/10';
  };

  const getScenarioColor = (name) => {
    if (name.includes("Crash") || name.includes("Bear")) return 'text-red-600';
    if (name.includes("Inflation")) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Macro Scenario Stress Testing</h3>
          <p className="text-sm text-gray-500">
            Compare portfolio simulation metrics. Click a card to display its detailed 10-year path chart below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {results.map((res) => {
          const isSelected = selectedScenarioName === res.scenario_name;
          const maxDd = res.simulation_paths?.max_drawdown ?? 0;
          return (
            <div
              key={res.scenario_name}
              onClick={() => onSelectScenario(res.scenario_name)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${getScenarioClass(
                res.scenario_name
              )}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm tracking-tight text-gray-800">{res.scenario_name}</h4>
                  {isSelected && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Projected ROI</span>
                  <p className={`text-lg font-extrabold ${getScenarioColor(res.scenario_name)}`}>
                    {res.roi_10y >= 0 ? '+' : ''}{res.roi_10y.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100/70 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Max Drawdown:</span>
                  <span className="font-semibold text-red-500">-{maxDd.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Worst Case:</span>
                  <span className="font-semibold">{res.worst_case_return.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
