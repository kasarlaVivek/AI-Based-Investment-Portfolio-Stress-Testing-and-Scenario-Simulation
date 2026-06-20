import React from 'react';
import { Lightbulb, AlertOctagon, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export function SuggestionsPanel({ suggestions }) {
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'HIGH':
        return {
          bg: 'bg-red-50 border-red-100',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800',
          icon: <AlertOctagon className="h-5 w-5 text-red-600 mt-0.5" />
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-50 border-amber-100',
          text: 'text-amber-800',
          badge: 'bg-amber-100 text-amber-800',
          icon: <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-100',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          icon: <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
          <Lightbulb className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Optimization Insights</h3>
          <p className="text-sm text-gray-500">Actionable advice to restructure allocation and mitigate risk exposure.</p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
          <h4 className="font-semibold text-gray-900">Portfolio Looks Good!</h4>
          <p className="text-sm text-gray-500 max-w-sm mt-1">
            No significant concentration risk, high correlation, or valuation discrepancies detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => {
            const styles = getSeverityStyles(suggestion.severity);
            return (
              <div
                key={index}
                className={`p-5 rounded-2xl border ${styles.bg} flex gap-4 transition-all`}
              >
                {styles.icon}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <h4 className={`font-semibold text-base ${styles.text}`}>{suggestion.title}</h4>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${styles.badge}`}>
                      {suggestion.severity} Severity
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {suggestion.description}
                  </p>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Recommended Action</p>
                    <p className="text-sm text-gray-800 font-medium">{suggestion.action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
