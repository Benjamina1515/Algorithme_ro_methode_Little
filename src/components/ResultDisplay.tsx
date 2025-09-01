import React from 'react';
import { CheckCircle, Download, BarChart3, Route } from 'lucide-react';
import { City, TSPResult } from '../App';
import { DecisionTree } from './DecisionTree';
import { GraphVisualization } from './GraphVisualization';

interface ResultDisplayProps {
  cities: City[];
  result: TSPResult;
  costMatrix: number[][];
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  cities,
  result,
  costMatrix
}) => {
  const exportResults = () => {
    const data = {
      cities: cities.map((city, index) => ({ ...city, index: index + 1 })),
      costMatrix,
      optimalPath: result.path.map(i => cities[i].name),
      optimalCost: result.cost,
      steps: result.steps.length,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tsp_result.json';
    a.click();
  };

  const getPathSegments = () => {
    return result.path.map((cityIndex, index) => {
      const nextIndex = (index + 1) % result.path.length;
      const nextCityIndex = result.path[nextIndex];
      const cost = costMatrix[cityIndex][nextCityIndex];

      return {
        from: cities[cityIndex].name,
        to: cities[nextCityIndex].name,
        cost: cost
      };
    });
  };

  const pathSegments = getPathSegments();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg text-white p-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Solution optimale trouvée !</h2>
            <p className="text-green-100 mt-2 text-lg">
              L'algorithme LITTLE a résolu le problème en {result.steps.length} étapes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Route className="h-6 w-6" />
              <div>
                <div className="text-2xl font-bold">{result.cost}</div>
                <div className="text-sm text-green-100">Coût total</div>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6" />
              <div>
                <div className="text-2xl font-bold">{cities.length}</div>
                <div className="text-sm text-green-100">Villes visitées</div>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6" />
              <div>
                <div className="text-2xl font-bold">{result.steps.length}</div>
                <div className="text-sm text-green-100">Étapes calculées</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decision Tree */}
        <DecisionTree
          steps={result.steps}
          cities={cities}
          currentStep={result.steps.length - 1}
        />

        {/* Graph of Optimal Circuit */}
        <GraphVisualization
          cities={cities}
          costMatrix={costMatrix}
          result={result}
        />
      </div>


    </div>
  );
};