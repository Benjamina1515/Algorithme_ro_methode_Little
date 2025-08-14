import React from 'react';
import { Calculator, TrendingDown, GitBranch, CheckCircle } from 'lucide-react';
import { LittleStep, City } from '../App';

interface StepDisplayProps {
  step: LittleStep;
  cities: City[];
}

export const StepDisplay: React.FC<StepDisplayProps> = ({ step, cities }) => {
  const getStepIcon = () => {
    switch (step.type) {
      case 'reduction': return <Calculator className="h-5 w-5" />;
      case 'regret': return <TrendingDown className="h-5 w-5" />;
      case 'branch': return <GitBranch className="h-5 w-5" />;
      case 'final': return <CheckCircle className="h-5 w-5" />;
      default: return <Calculator className="h-5 w-5" />;
    }
  };

  const getStepColor = () => {
    switch (step.type) {
      case 'reduction': return 'blue';
      case 'regret': return 'purple';
      case 'branch': return 'orange';
      case 'final': return 'green';
      default: return 'blue';
    }
  };

  const renderMatrix = (matrix: number[][], title: string, highlight?: [number, number]) => {
    if (!matrix || matrix.length === 0) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-white p-2 font-semibold">
                  i\j
                </th>
                {cities.map((_, j) => (
                  <th key={j} className="border border-gray-300 bg-white p-2 font-semibold">
                    {j + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 bg-white p-2 font-semibold">
                    {i + 1}
                  </td>
                  {row.map((cell, j) => {
                    const isHighlighted = highlight && highlight[0] === i && highlight[1] === j;
                    const isInfinity = cell === Infinity;
                    
                    return (
                      <td key={j} className={`
                        border border-gray-300 p-2 text-center
                        ${isHighlighted ? 'bg-yellow-200' : 'bg-white'}
                        ${cell === 0 && !isInfinity ? 'bg-green-100 font-bold' : ''}
                      `}>
                        {isInfinity ? '∞' : cell.toFixed(cell % 1 === 0 ? 0 : 1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRegrets = (regrets: number[][]) => {
    if (!regrets || regrets.length === 0) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Matrice des regrets</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-white p-2 font-semibold">
                  i\j
                </th>
                {cities.map((_, j) => (
                  <th key={j} className="border border-gray-300 bg-white p-2 font-semibold">
                    {j + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regrets.map((row, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 bg-white p-2 font-semibold">
                    {i + 1}
                  </td>
                  {row.map((cell, j) => (
                    <td key={j} className={`
                      border border-gray-300 p-2 text-center
                      ${cell > 0 ? 'bg-blue-100 font-semibold' : 'bg-white'}
                    `}>
                      {cell > 0 ? cell.toFixed(1) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const color = getStepColor();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden h-fit">
      {/* Header */}
      <div className={`bg-${color}-600 p-6 text-white`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 bg-${color}-700 rounded-lg`}>
            {getStepIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-bold">Étape {step.step}</h3>
              <span className={`px-3 py-1 bg-${color}-700 rounded-full text-sm font-medium`}>
                Borne: {step.bound.toFixed(1)}
              </span>
            </div>
            <p className="text-lg font-medium mt-1">{step.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Description */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-800 whitespace-pre-line">{step.description}</p>
        </div>

        {/* Matrices */}
        <div className="space-y-6">
          {step.matrix.length > 0 && renderMatrix(
            step.matrix, 
            'Matrice des coûts', 
            step.selectedArc
          )}
          
          {step.regrets && renderRegrets(step.regrets)}
        </div>

        {/* Additional info for specific step types */}
        {step.type === 'final' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h4 className="text-lg font-bold text-green-900">Solution optimale</h4>
                <p className="text-sm text-green-700">L'algorithme LITTLE a trouvé le meilleur circuit</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};