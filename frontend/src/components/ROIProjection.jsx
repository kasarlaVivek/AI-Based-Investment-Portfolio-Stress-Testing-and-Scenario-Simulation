import React from 'react';
import { TrendingUp, ShieldAlert, ArrowDownRight } from 'lucide-react';

export function ROIProjection({ result }) {
  const {
    best_case_return,
    avg_case_return,
    worst_case_return,
    roi_5y,
    roi_10y,
    simulation_paths
  } = result;

  const prob_loss_5y = simulation_paths?.prob_loss_5y ?? 0;
  const prob_loss_10y = simulation_paths?.prob_loss_10y ?? 0;
  const max_drawdown = simulation_paths?.max_drawdown ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 5-Year & 10-Year Expected ROI */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-500 font-medium text-sm">Expected Return (ROI)</h4>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">5-Year Median Projection</p>
              <p className={`text-2xl font-bold ${roi_5y >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi_5y >= 0 ? '+' : ''}{roi_5y.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">10-Year Median Projection</p>
              <p className={`text-2xl font-bold ${roi_10y >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi_10y >= 0 ? '+' : ''}{roi_10y.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Based on 50th percentile (median) paths.
        </p>
      </div>

      {/* Downside Risk Bounds */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-500 font-medium text-sm">Downside Boundaries</h4>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Worst Case (10-Year 5th %)</p>
              <p className="text-2xl font-bold text-red-600">
                {worst_case_return >= 0 ? '+' : ''}{worst_case_return.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Best Case (10-Year 95th %)</p>
              <p className="text-2xl font-bold text-green-600">
                {best_case_return >= 0 ? '+' : ''}{best_case_return.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          90% of simulated results fall between these outcomes.
        </p>
      </div>

      {/* Maximum Drawdown & Risk Stats */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-500 font-medium text-sm">Simulated Stress Metrics</h4>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Simulated Max Drawdown</p>
              <p className="text-2xl font-bold text-red-500">
                -{max_drawdown.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Probability of Capital Loss</p>
              <p className="text-2xl font-bold text-gray-800">
                {prob_loss_10y.toFixed(1)}% <span className="text-xs text-gray-400 font-normal">at 10y</span>
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Likelihood of finishing with less than the starting capital.
        </p>
      </div>
    </div>
  );
}
