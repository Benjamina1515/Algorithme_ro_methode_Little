import React, { useState, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Calculator } from 'lucide-react';
import { City, LittleStep, TSPResult } from '../App';
import { StepDisplay } from './StepDisplay';
import { TreeVisualization } from './TreeVisualization';

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
  includedArcs: Array<[number, number]>; // Changé de path à includedArcs
  excluded: Array<[number, number]>;
  level: number;
}

// Union-Find pour tracker les composants connectés
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) {
      return false; // Déjà connectés
    }
    
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    return true;
  }

  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
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
      let min = 1e9;
      for (let j = 0; j < n; j++) {
        if (newMatrix[i][j] !== 1e9 && newMatrix[i][j] !== -999 && newMatrix[i][j] < min) {
          min = newMatrix[i][j];
        }
      }
      
      if (min !== 1e9 && min > 0) {
        totalReduction += min;
        for (let j = 0; j < n; j++) {
          if (newMatrix[i][j] !== 1e9 && newMatrix[i][j] !== -999) {
            newMatrix[i][j] -= min;
          }
        }
      }
    }

    // Column reduction
    for (let j = 0; j < n; j++) {
      let min = 1e9;
      for (let i = 0; i < n; i++) {
        if (newMatrix[i][j] !== 1e9 && newMatrix[i][j] !== -999 && newMatrix[i][j] < min) {
          min = newMatrix[i][j];
        }
      }
      
      if (min !== 1e9 && min > 0) {
        totalReduction += min;
        for (let i = 0; i < n; i++) {
          if (newMatrix[i][j] !== 1e9 && newMatrix[i][j] !== -999) {
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
          let rowMin = 1e9;
          for (let k = 0; k < n; k++) {
            if (k !== j && matrix[i][k] !== -999 && matrix[i][k] < rowMin) {
              rowMin = matrix[i][k];
            }
          }

          // Find minimum in column j (excluding row i)
          let colMin = 1e9;
          for (let k = 0; k < n; k++) {
            if (k !== i && matrix[k][j] !== -999 && matrix[k][j] < colMin) {
              colMin = matrix[k][j];
            }
          }

          regrets[i][j] = (rowMin === 1e9 ? 0 : rowMin) + (colMin === 1e9 ? 0 : colMin);
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

  // Fonction pour détecter les cycles avec DFS
  const hasCycle = (includedArcs: Array<[number, number]>): boolean => {
    if (includedArcs.length === 0) return false;
    
    // Construire le graphe
    const graph: Map<number, number[]> = new Map();
    for (const [from, to] of includedArcs) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
    }
    
    const colors = new Array(Math.max(...Array.from(graph.keys())) + 1).fill(0); // 0: white, 1: gray, 2: black
    
    const dfs = (node: number): boolean => {
      colors[node] = 1; // gray
      
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (colors[neighbor] === 1) {
          return true; // back edge to gray node = cycle
        }
        if (colors[neighbor] === 0 && dfs(neighbor)) {
          return true;
        }
      }
      
      colors[node] = 2; // black
      return false;
    };
    
    // DFS depuis chaque nœud non visité
    for (const node of graph.keys()) {
      if (colors[node] === 0 && dfs(node)) {
        return true;
      }
    }
    
    return false;
  };

  // Fonction pour bloquer les subtours
  const blockSubtours = (matrix: number[][], includedArcs: Array<[number, number]>, uf: UnionFind): { matrix: number[][], blockedArcs: Array<[number, number]>, description: string } => {
    const n = matrix.length;
    const newMatrix = deepCopy(matrix);
    const blockedArcs: Array<[number, number]> = [];
    let description = '';
    
    if (includedArcs.length === 0) {
      return { matrix: newMatrix, blockedArcs, description };
    }
    
    // Construire le graphe pour trouver les chemins
    const graph: Map<number, number[]> = new Map();
    for (const [from, to] of includedArcs) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
    }
    
    // Trouver les extrémités des chemins
    const findPathEnds = (start: number): { start: number, end: number } => {
      let current = start;
      let end = start;
      
      // Suivre le chemin jusqu'à la fin
      while (graph.has(current)) {
        const neighbors = graph.get(current)!;
        if (neighbors.length > 0) {
          current = neighbors[0];
          end = current;
        } else {
          break;
        }
      }
      
      return { start, end };
    };
    
    // Pour chaque arc inclus, vérifier les subtours potentiels
    for (const [from, to] of includedArcs) {
      const { start: startFrom, end: endFrom } = findPathEnds(from);
      const { start: startTo, end: endTo } = findPathEnds(to);
      
      // Bloquer l'arc qui fermerait le subtour
      if (newMatrix[endTo][startFrom] !== -999 && newMatrix[endTo][startFrom] !== 1e9) {
        newMatrix[endTo][startFrom] = -999;
        blockedArcs.push([endTo, startFrom]);
        description += `Arc (${endTo+1},${startFrom+1}) bloqué pour éviter le subtour ${startFrom+1}-...-${endTo+1}-${startFrom+1}\n`;
      }
    }
    
    return { matrix: newMatrix, blockedArcs, description };
  };

  // Fonction pour construire le chemin complet à partir des arcs inclus
  const buildCompletePath = (includedArcs: Array<[number, number]>): number[] => {
    if (includedArcs.length === 0) return [];
    
    const graph: Map<number, number[]> = new Map();
    for (const [from, to] of includedArcs) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
    }
    
    const path: number[] = [];
    let current = 0; // Commencer par le nœud 0
    
    // Suivre le chemin
    while (graph.has(current) && path.length < includedArcs.length) {
      path.push(current);
      const neighbors = graph.get(current)!;
      if (neighbors.length > 0) {
        current = neighbors[0];
      } else {
        break;
      }
    }
    
    // Ajouter le dernier nœud
    if (path.length > 0 && path[path.length - 1] !== current) {
      path.push(current);
    }
    
    return path;
  };

  const solveTSP = useCallback((): TSPResult | null => {
    const n = costMatrix.length;
    if (n < 3) return null;

    const allSteps: LittleStep[] = [];
    let stepCounter = 1;

    // Convert cost matrix to working matrix (replace 0s on diagonal with 1e9)
    const initialMatrix = costMatrix.map((row, i) => 
      row.map((cell, j) => i === j ? 1e9 : cell)
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
      includedArcs: [], // Changé de path à includedArcs
      excluded: [],
      level: 0
    }];

    let bestCost = 1e9;
    let bestPath: number[] = [];

    while (queue.length > 0) {
      // Sort queue by bound (best-first search)
      queue.sort((a, b) => a.bound - b.bound);
      const currentNode = queue.shift()!;

      // If this node's bound is already worse than our best solution, prune it
      if (currentNode.bound >= bestCost) {
        continue;
      }

      // Si on a n arcs inclus, vérifier si c'est un cycle complet
      if (currentNode.level === n) {
        const completePath = buildCompletePath(currentNode.includedArcs);
        if (completePath.length === n && !hasCycle(currentNode.includedArcs)) {
          const tourCost = calculateTourCost(completePath, costMatrix);
          
          if (tourCost < bestCost) {
            bestCost = tourCost;
            bestPath = completePath;
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
        description: `Arc sélectionné: (${cities[maxI]?.name || `Ville ${maxI+1}`}, ${cities[maxJ]?.name || `Ville ${maxJ+1}`}) avec regret maximum: ${maxRegret}`,
        selectedArc: [maxI, maxJ],
        regrets: deepCopy(regrets)
      });

      // TYPE 2: Exclude the arc (i, j)
      const excludeMatrix = deepCopy(currentNode.matrix);
      excludeMatrix[maxI][maxJ] = -999;
      
      const { matrix: reducedExcludeMatrix, reduction: excludeReduction } = reduceMatrix(excludeMatrix);
      const excludeBound = currentNode.bound + excludeReduction;

      if (excludeBound < bestCost) {
        queue.push({
          matrix: reducedExcludeMatrix,
          bound: excludeBound,
          includedArcs: [...currentNode.includedArcs],
          excluded: [...currentNode.excluded, [maxI, maxJ]],
          level: currentNode.level
        });
      }

      // TYPE 1: Include the arc (i, j)
      const arcCost = currentNode.matrix[maxI][maxJ];
      const includeMatrix = deepCopy(currentNode.matrix);
      
      // Étape 1: Supprimer la ligne x et la colonne y
      for (let k = 0; k < n; k++) {
        includeMatrix[maxI][k] = -999;
        includeMatrix[k][maxJ] = -999;
      }
      
      // Étape 2: Bloquer l'arc inverse
      includeMatrix[maxJ][maxI] = -999;
      
      // Étape 3: Vérifier les cycles et subtours
      const newIncludedArcs = [...currentNode.includedArcs, [maxI, maxJ]];
      
      // Vérifier si l'ajout de cet arc créerait un cycle prématuré
      if (hasCycle(newIncludedArcs)) {
        allSteps.push({
          step: stepCounter++,
          type: 'branch',
          title: `Cycle détecté - Branche élaguée`,
          matrix: deepCopy(includeMatrix),
          bound: currentNode.bound + arcCost,
          description: `L'arc (${maxI+1},${maxJ+1}) créerait un cycle prématuré. Branche élaguée.`
        });
        continue; // Ne pas ajouter cette branche à la queue
      }
      
      // Bloquer les subtours
      const uf = new UnionFind(n);
      for (const [u, v] of newIncludedArcs) {
        if (!uf.union(u, v)) {
          // Déjà connectés = cycle
          continue;
        }
      }
      
      const { matrix: matrixWithoutSubtours, blockedArcs, description: subtourDescription } = blockSubtours(includeMatrix, newIncludedArcs, uf);
      
      const { matrix: reducedIncludeMatrix, reduction: includeReduction } = reduceMatrix(matrixWithoutSubtours);
      const includeBound = currentNode.bound + arcCost + includeReduction;

      // Créer une description des arcs bloqués
      let subtourInfo = '';
      if (blockedArcs.length > 0) {
        subtourInfo = `\n  → Subtours bloqués:\n${subtourDescription}`;
      }

      allSteps.push({
        step: stepCounter++,
        type: 'branch',
        title: `Évaluation des branches`,
        matrix: deepCopy(reducedIncludeMatrix),
        bound: includeBound,
        description: `TYPE 2 (exclure arc): ${excludeBound.toFixed(1)} = ${currentNode.bound} + ${excludeReduction} (réductions) [arc désactivé]\nTYPE 1 (inclure arc): ${includeBound.toFixed(1)} = ${currentNode.bound} + ${arcCost} (coût arc) + ${includeReduction} (réductions)\n  → Ligne ${maxI+1} et colonne ${maxJ+1} supprimées\n  → Arc inverse (${maxJ+1},${maxI+1}) bloqué pour éviter sous-cycle${subtourInfo}`
      });

      if (includeBound < bestCost) {
        queue.push({
          matrix: reducedIncludeMatrix,
          bound: includeBound,
          includedArcs: newIncludedArcs,
          excluded: [...currentNode.excluded],
          level: currentNode.level + 1
        });
      }
    }

    // Créer une matrice finale avec seulement les arcs du chemin optimal
    const finalMatrix = Array(n).fill(null).map(() => Array(n).fill(-999));
    
    // Activer seulement les arcs du chemin optimal
    for (let i = 0; i < bestPath.length; i++) {
      const from = bestPath[i];
      const to = bestPath[(i + 1) % bestPath.length];
      finalMatrix[from][to] = costMatrix[from][to];
    }
    
    // Garder la diagonale comme désactivée
    for (let i = 0; i < n; i++) {
      finalMatrix[i][i] = -999;
    }

    allSteps.push({
      step: stepCounter++,
      type: 'reduction',
      title: 'Suppression des arcs parasites',
      matrix: finalMatrix,
      bound: bestCost,
      description: `Matrice nettoyée : seuls les arcs du chemin optimal sont conservés. Tous les autres arcs sont désactivés (—).`
    });

    allSteps.push({
      step: stepCounter++,
      type: 'final',
      title: 'Solution optimale trouvée',
      matrix: finalMatrix,
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
                  onClick={prevStep}
                  disabled={currentStepIndex <= 0 || isAutoPlaying}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 
                           text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <SkipForward className="h-4 w-4 rotate-180" />
                  <span>Précédent</span>
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
            
            {/* Skip to Result Button */}
            {steps.length > 0 && (
              <button
                onClick={() => {
                  // Complete the algorithm and show final result
                  const finalResult: TSPResult = {
                    path: [0, 1, 2, 0], // Example path
                    cost: steps[steps.length - 1]?.bound || 0,
                    steps: steps
                  };
                  onComplete(finalResult);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg 
                         transition-colors duration-200 flex items-center space-x-2"
              >
                <SkipForward className="h-4 w-4" />
                <span>Passer au résultat</span>
              </button>
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
        <StepDisplay 
          step={steps[currentStepIndex]} 
          cities={cities}
        />
      )}

      {/* Tree Visualization */}
      {steps.length > 0 && (
        <TreeVisualization
          steps={steps}
          cities={cities}
          currentStepIndex={currentStepIndex}
        />
      )}
    </div>
  );
};