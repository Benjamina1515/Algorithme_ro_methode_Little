import React from 'react';
import { CheckCircle, Download, BarChart3, Route } from 'lucide-react';
import { City, TSPResult } from '../App';

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
        {/* Optimal Path */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Circuit optimal</h3>
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                       transition-colors duration-200 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
          </div>

          <div className="space-y-4">
            {pathSegments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {segment.from} → {segment.to}
                    </div>
                    <div className="text-sm text-gray-600">
                      Étape {index + 1} du circuit
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {segment.cost}
                </div>
              </div>
            ))}
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Coût total du circuit:</span>
                <span className="text-green-600">{result.cost}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Statistiques de l'algorithme</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Étapes de résolution</h4>
              <div className="space-y-2">
                {['reduction', 'regret', 'branch', 'final'].map((type) => {
                  const count = result.steps.filter(step => step.type === type).length;
                  const labels = {
                    reduction: 'Réductions de matrice',
                    regret: 'Calculs de regrets',
                    branch: 'Évaluations de branches',
                    final: 'Solution finale'
                  };
                  
                  return (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-gray-600">{labels[type as keyof typeof labels]}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Efficacité</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Nombre de villes</span>
                  <span className="font-semibold">{cities.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Solutions possibles</span>
                  <span className="font-semibold">
                    {(function factorial(n: number): number {
                      return n <= 1 ? 1 : n * factorial(n - 1);
                    })(cities.length - 1) / 2}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Étapes calculées</span>
                  <span className="font-semibold text-green-600">{result.steps.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-800">
                <strong>Optimisation réussie !</strong><br />
                L'algorithme LITTLE a trouvé la solution optimale en explorant seulement une fraction 
                des solutions possibles grâce à la méthode de séparation et évaluation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};