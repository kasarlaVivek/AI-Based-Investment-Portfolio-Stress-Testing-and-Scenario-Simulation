import React from 'react';
import { OptimizationSuggestion } from '../utils/optimization';
import { Lightbulb, ArrowRight } from 'lucide-react';

interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
}

export function OptimizationSuggestions({ suggestions }: OptimizationSuggestionsProps) {
  const impactColors = {
    HIGH: 'text-red-500',
    MEDIUM: 'text-amber-500',
    LOW: 'text-green-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
        <h2 className="text-xl font-semibold">Portfolio Optimization Suggestions</h2>
      </div>

      <div className="space-y-6">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">{suggestion.title}</h3>
              <span className={`text-sm font-medium ${impactColors[suggestion.impact]}`}>
                {suggestion.impact} Impact
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">{suggestion.description}</p>
            
            <div className="space-y-2">
              {suggestion.actions.map((action, actionIndex) => (
                <div key={actionIndex} className="flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 text-blue-500 mr-2" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}