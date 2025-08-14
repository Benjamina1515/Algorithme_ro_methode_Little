import React, { useState, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Calculator } from 'lucide-react';
import { City, LittleStep, TSPResult } from '../App';
import { StepDisplay } from './StepDisplay';
import { DecisionTree } from './DecisionTree';

interface LittleAlgorithmProps {
  cities: City[];
  costMatrix: number[][];
  onComplete: (result: TSPResult) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

interface BranchNode {
  matrix: number[][];
  bound: number;
  path: number[];
  excluded: Array<[number, number]>;
  level: number;
}

export const LittleAlgorithm: React.FC<LittleAlgorithmProps> = ({
  cities,
  costMatrix,
  onComplete,
  isRunning,
  setIsRunning
}) => {
  const [steps, setSteps] = useState<LittleStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1000);

  const deepCopy = (matrix: number[][]): number[][] => {
    return matrix.map(row => [...row]);
  };

  const reduceMatrix = (matrix: number[][]): { matrix: number[][], reduction: number } => {
    const n = matrix.length;
    const newMatrix = deepCopy(matrix);
    let totalReduction = 0;

    // Row reduction
    for (let i = 0; i < n; i++) {
      let min = Infinity;
      for (let j = 0; j < n; j++) {
        if (newMatrix[i][j] !== Infinity && newMatrix[i][j] < min) {
          min = newMatrix[i][j];
        }
      }
      
      if (min !== Infinity && min > 0) {
        totalReduction += min;
        for (let j = 0; j < n; j++) {
          if (newMatrix[i][j] !== Infinity) {
            newMatrix[i][j] -= min;
          }
        }
      }
    }

    // Column reduction
    for (let j = 0; j < n; j++) {
      let min = Infinity;
      for (let i = 0; i < n; i++) {
        if (newMatrix[i][j] !== Infinity && newMatrix[i][j] < min) {
          min = newMatrix[i][j];
        }
      }
      
      if (min !== Infinity && min > 0) {
        totalReduction += min;
        for (let i = 0; i < n; i++) {
          if (newMatrix[i][j] !== Infinity) {
            newMatrix[i][j] -= min;
          }
        }
      }
    }

    return { matrix: newMatrix, reduction: totalReduction };
  };

  const calculateRegrets = (matrix: number[][]): number[][] => {
    const n = matrix.length;
    const regrets = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 0) {
          // Find minimum in row i (excluding column j)
          let rowMin = Infinity;
          for (let k = 0; k < n; k++) {
            if (k !== j && matrix[i][k] < rowMin) {
              rowMin = matrix[i][k];
            }
          }

          // Find minimum in column j (excluding row i)
          let colMin = Infinity;
          for (let k = 0; k < n; k++) {
            if (k !== i && matrix[k][j] < colMin) {
              colMin = matrix[k][j];
            }
          }

          regrets[i][j] = (rowMin === Infinity ? 0 : rowMin) + (colMin === Infinity ? 0 : colMin);
        }
      }
    }

    return regrets;
  };

  const findMaxRegret = (matrix: number[][], regrets: number[][]): [number, number, number] => {
    const n = matrix.length;
    let maxRegret = -1;
    let maxI = -1, maxJ = -1;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 0 && regrets[i][j] > maxRegret) {
          maxRegret = regrets[i][j];
          maxI = i;
          maxJ = j;
        }
      }
    }

    return [maxI, maxJ, maxRegret];
  };

  const solveTSP = useCallback((): TSPResult | null => {
    const n = costMatrix.length;
    if (n < 3) return null;

    const allSteps: LittleStep[] = [];
    let stepCounter = 1;

    // Convert cost matrix to working matrix (replace 0s on diagonal with Infinity)
    const initialMatrix = costMatrix.map((row, i) => 
      row.map((cell, j) => i === j ? Infinity : cell)
    );

    // Step 1: Initial reduction
    const { matrix: reducedMatrix, reduction: initialBound } = reduceMatrix(initialMatrix);
    
    allSteps.push({
      step: stepCounter++,
      type: 'reduction',
      title: 'Réduction initiale de la matrice',
      matrix: deepCopy(reducedMatrix),
      bound: initialBound,
      description: `Réduction par ligne puis par colonne. Borne inférieure initiale: ${initialBound}`
    });

    // Initialize the branch and bound
    const queue: BranchNode[] = [{
      matrix: reducedMatrix,
      bound: initialBound,
      path: [],
      excluded: [],
      level: 0
    }];

    let bestCost = Infinity;
    let bestPath: number[] = [];

    while (queue.length > 0) {
      // Sort queue by bound (best-first search)
      queue.sort((a, b) => a.bound - b.bound);
      const currentNode = queue.shift()!;

      // If this node's bound is already worse than our best solution, prune it
      if (currentNode.bound >= bestCost) {
        continue;
      }

      // If we've made n-1 decisions, we have a complete tour
      if (currentNode.level === n - 1) {
        // Find the final edge to complete the tour
        const remainingNodes = Array.from({length: n}, (_, i) => i)
          .filter(i => !currentNode.path.includes(i));
        
        if (remainingNodes.length === 2) {
          const finalPath = [...currentNode.path, ...remainingNodes];
          const tourCost = calculateTourCost(finalPath, costMatrix);
          
          if (tourCost < bestCost) {
            bestCost = tourCost;
            bestPath = finalPath;
          }
        }
        continue;
      }

      // Calculate regrets for current matrix
      const regrets = calculateRegrets(currentNode.matrix);
      const [maxI, maxJ, maxRegret] = findMaxRegret(currentNode.matrix, regrets);

      if (maxI === -1) continue; // No zeros found

      allSteps.push({
        step: stepCounter++,
        type: 'regret',
        title: `Calcul des regrets - Niveau ${currentNode.level}`,
        matrix: deepCopy(currentNode.matrix),
        bound: currentNode.bound,
        description: `Arc sélectionné: (${maxI+1}, ${maxJ+1}) avec regret maximum: ${maxRegret}`,
        selectedArc: [maxI, maxJ],
        regrets: deepCopy(regrets)
      });

      // Branch 1: Exclude the arc (i, j)
      const excludeMatrix = deepCopy(currentNode.matrix);
      excludeMatrix[maxI][maxJ] = Infinity;
      
      const { matrix: reducedExcludeMatrix, reduction: excludeReduction } = reduceMatrix(excludeMatrix);
      const excludeBound = currentNode.bound + excludeReduction;

      if (excludeBound < bestCost) {
        queue.push({
          matrix: reducedExcludeMatrix,
          bound: excludeBound,
          path: [...currentNode.path],
          excluded: [...currentNode.excluded, [maxI, maxJ]],
          level: currentNode.level
        });
      }

      // Branch 2: Include the arc (i, j)
      const includeMatrix = deepCopy(currentNode.matrix);
      
      // Set row maxI and column maxJ to infinity
      for (let k = 0; k < n; k++) {
        includeMatrix[maxI][k] = Infinity;
        includeMatrix[k][maxJ] = Infinity;
      }
      
      // Set (maxJ, maxI) to infinity to prevent subtours
      includeMatrix[maxJ][maxI] = Infinity;
      
      const { matrix: reducedIncludeMatrix, reduction: includeReduction } = reduceMatrix(includeMatrix);
      const includeBound = currentNode.bound + includeReduction;

      allSteps.push({
        step: stepCounter++,
        type: 'branch',
        title: `Évaluation des branches`,
        matrix: deepCopy(reducedIncludeMatrix),
        bound: includeBound,
        description: `Branche 1 (exclure): ${excludeBound}, Branche 2 (inclure): ${includeBound}`
      });

      if (includeBound < bestCost) {
        queue.push({
          matrix: reducedIncludeMatrix,
          bound: includeBound,
          path: [...currentNode.path, maxI, maxJ],
          excluded: [...currentNode.excluded],
          level: currentNode.level + 1
        });
      }
    }

    allSteps.push({
      step: stepCounter++,
      type: 'final',
      title: 'Solution optimale trouvée',
      matrix: [],
      bound: bestCost,
      description: `Circuit optimal: ${bestPath.map(i => cities[i]?.name || `Ville ${i+1}`).join(' → ')} → ${cities[bestPath[0]]?.name || `Ville ${bestPath[0]+1}`}\nCoût total: ${bestCost}`
    });

    return {
      path: bestPath,
      cost: bestCost,
      steps: allSteps
    };
  }, [costMatrix, cities]);

  const calculateTourCost = (path: number[], matrix: number[][]): number => {
    let cost = 0;
    for (let i = 0; i < path.length; i++) {
      const from = path[i];
      const to = path[(i + 1) % path.length];
      cost += matrix[from][to];
    }
    return cost;
  };

  const startAlgorithm = () => {
    setIsRunning(true);
    const result = solveTSP();
    
    if (result) {
      setSteps(result.steps);
      setCurrentStepIndex(0);
      
      if (result.steps.length === 0) {
        onComplete(result);
        setIsRunning(false);
      }
    } else {
      setIsRunning(false);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (currentStepIndex === steps.length - 1) {
      // Algorithm completed
      const result = solveTSP();
      if (result) {
        onComplete(result);
      }
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  React.useEffect(() => {
    if (isAutoPlaying && currentStepIndex < steps.length - 1) {
      const timer = setTimeout(() => {
        nextStep();
      }, autoPlaySpeed);
      return () => clearTimeout(timer);
    } else if (isAutoPlaying && currentStepIndex === steps.length - 1) {
      setIsAutoPlaying(false);
      const result = solveTSP();
      if (result) {
        onComplete(result);
      }
    }
  }, [isAutoPlaying, currentStepIndex, steps.length, autoPlaySpeed, onComplete, solveTSP]);

  const reset = () => {
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsRunning(false);
    setIsAutoPlaying(false);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Algorithme LITTLE</h2>
              <p className="text-gray-600">Méthode de séparation et évaluation</p>
            </div>
          </div>
          
          {steps.length > 0 && (
            <div className="text-sm text-gray-600">
              Étape {currentStepIndex + 1} / {steps.length}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!isRunning ? (
              <button
                onClick={startAlgorithm}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg 
                         transition-colors duration-200 flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Démarrer</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleAutoPlay}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                    isAutoPlaying 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isAutoPlaying ? 'Pause' : 'Auto'}</span>
                </button>
                
                <button
                  onClick={nextStep}
                  disabled={currentStepIndex >= steps.length - 1 || isAutoPlaying}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                           text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Suivant</span>
                </button>
                
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg 
                           transition-colors duration-200 flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>
          
          {isAutoPlaying && (
            <div className="flex items-center space-x-3">
              <label className="text-sm text-gray-600">Vitesse:</label>
              <select
                value={autoPlaySpeed}
                onChange={(e) => setAutoPlaySpeed(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={500}>Rapide (0.5s)</option>
                <option value={1000}>Normal (1s)</option>
                <option value={2000}>Lent (2s)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Step Display */}
      {currentStepIndex >= 0 && currentStepIndex < steps.length && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <StepDisplay 
            step={steps[currentStepIndex]} 
            cities={cities}
          />
          <DecisionTree 
            steps={steps}
            cities={cities}
            currentStep={currentStepIndex}
          />
        </div>
      )}
    </div>
  );
};