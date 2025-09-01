import React, { useState } from 'react';
import { CityManager } from './components/CityManager';
import { MatrixEditor } from './components/MatrixEditor';
import { LittleAlgorithm } from './components/LittleAlgorithm';
import { GraphVisualization } from './components/GraphVisualization';
import { DecisionTree } from './components/DecisionTree';
import { ResultDisplay } from './components/ResultDisplay';
import { MapPin, Settings, Play, RotateCcw } from 'lucide-react';

export interface City {
  id: string;
  name: string;
  x?: number;
  y?: number;
}

export interface LittleStep {
  step: number;
  type: 'reduction' | 'regret' | 'branch' | 'final';
  title: string;
  matrix: number[][];
  bound: number;
  description: string;
  selectedArc?: [number, number];
  regrets?: number[][];
  eliminated?: boolean;
}

export interface TSPResult {
  path: number[];
  cost: number;
  steps: LittleStep[];
}

function App() {
  const [currentStep, setCurrentStep] = useState<'cities' | 'matrix' | 'algorithm' | 'result'>('cities');
  const [cities, setCities] = useState<City[]>([]);
  const [costMatrix, setCostMatrix] = useState<number[][]>([]);
  const [result, setResult] = useState<TSPResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleCitiesConfirmed = (newCities: City[]) => {
    setCities(newCities);
    const n = newCities.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    setCostMatrix(matrix);
    setCurrentStep('matrix');
  };

  const handleMatrixConfirmed = (matrix: number[][]) => {
    setCostMatrix(matrix);
    setCurrentStep('algorithm');
  };

  const handleAlgorithmComplete = (tspResult: TSPResult) => {
    setResult(tspResult);
    setCurrentStep('result');
    setIsRunning(false);
  };

  const resetApp = () => {
    setCities([]);
    setCostMatrix([]);
    setResult(null);
    setCurrentStep('cities');
    setIsRunning(false);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'cities': return 'Étape 1: Définition des villes';
      case 'matrix': return 'Étape 2: Matrice des coûts';
      case 'algorithm': return 'Étape 3: Algorithme LITTLE';
      case 'result': return 'Résultat final';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Voyageur de Commerce - Méthode LITTLE
                </h1>
                <p className="text-sm text-gray-600">
                  Résolution optimale par séparation et évaluation
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Settings className="h-4 w-4" />
                <span>{getStepTitle()}</span>
              </div>
              
              {currentStep !== 'cities' && (
                <button
                  onClick={resetApp}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 
                           rounded-lg transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Recommencer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center space-x-4">
          {['cities', 'matrix', 'algorithm', 'result'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-all duration-300 ${
                  currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : index < ['cities', 'matrix', 'algorithm', 'result'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`
                  w-12 h-1 mx-2 rounded transition-all duration-300 ${
                    index < ['cities', 'matrix', 'algorithm', 'result'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-12">
        {currentStep === 'cities' && (
          <CityManager onCitiesConfirmed={handleCitiesConfirmed} />
        )}

        {currentStep === 'matrix' && (
          <MatrixEditor 
            cities={cities}
            initialMatrix={costMatrix}
            onMatrixConfirmed={handleMatrixConfirmed}
          />
        )}

        {currentStep === 'algorithm' && (
          <div className="space-y-6">
            <LittleAlgorithm
              cities={cities}
              costMatrix={costMatrix}
              onComplete={handleAlgorithmComplete}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
            />
            

            
            {/* Results summary */}
            {result && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Résumé de la solution
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Circuit optimal:</span>
                    <span className="font-semibold">
                      {result.path.map(i => cities[i]?.name || `V${i+1}`).join(' → ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coût total:</span>
                    <span className="font-bold text-green-600">{result.cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Étapes calculées:</span>
                    <span className="font-semibold">{result.steps.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'result' && result && (
          <ResultDisplay
            cities={cities}
            result={result}
            costMatrix={costMatrix}
          />
        )}
      </main>
    </div>
  );
}

export default App;