import React, { useState, useEffect } from 'react';
import { ArrowRight, Download, Upload, RotateCcw } from 'lucide-react';
import { City } from '../App';

interface MatrixEditorProps {
  cities: City[];
  initialMatrix: number[][];
  onMatrixConfirmed: (matrix: number[][]) => void;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({ 
  cities, 
  initialMatrix, 
  onMatrixConfirmed 
}) => {
  const [matrix, setMatrix] = useState<number[][]>(initialMatrix);

  useEffect(() => {
    if (initialMatrix.length !== cities.length) {
      const n = cities.length;
      const newMatrix = Array(n).fill(null).map((_, i) => 
        Array(n).fill(null).map((_, j) => i === j ? 0 : 0)
      );
      setMatrix(newMatrix);
    }
  }, [cities, initialMatrix]);

  const updateMatrix = (i: number, j: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newMatrix = matrix.map(row => [...row]);
    newMatrix[i][j] = numValue;
    setMatrix(newMatrix);
  };

  const generateRandomMatrix = () => {
    const n = cities.length;
    const newMatrix = Array(n).fill(null).map((_, i) => 
      Array(n).fill(null).map((_, j) => {
        if (i === j) return 0;
        return Math.floor(Math.random() * 90) + 10; // Random between 10-99
      })
    );
    setMatrix(newMatrix);
  };

  const makeSymmetric = () => {
    const n = cities.length;
    const newMatrix = matrix.map(row => [...row]);
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const avg = (newMatrix[i][j] + newMatrix[j][i]) / 2;
        newMatrix[i][j] = avg;
        newMatrix[j][i] = avg;
      }
    }
    setMatrix(newMatrix);
  };

  const isValidMatrix = () => {
    const n = cities.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && (matrix[i][j] <= 0 || isNaN(matrix[i][j]))) {
          return false;
        }
      }
    }
    return true;
  };

  const handleConfirm = () => {
    if (!isValidMatrix()) {
      alert('Veuillez saisir des coûts valides (> 0) pour tous les trajets.');
      return;
    }
    onMatrixConfirmed(matrix);
  };

  const exportMatrix = () => {
    const csv = matrix.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matrice_couts.csv';
    a.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Matrice des coûts</h2>
          <p className="text-gray-600 mt-1">
            Définissez les coûts de déplacement entre chaque paire de villes
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={generateRandomMatrix}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 
                     rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Aléatoire</span>
          </button>
          
          <button
            onClick={makeSymmetric}
            className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 
                     rounded-lg transition-colors duration-200"
          >
            Symétrique
          </button>
          
          <button
            onClick={exportMatrix}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 
                     rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-50 p-3 text-center font-semibold">
                De \ Vers
              </th>
              {cities.map((city, index) => (
                <th key={city.id} className="border border-gray-300 bg-gray-50 p-3 text-center 
                                             font-semibold min-w-[100px]">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center 
                                   justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-xs">{city.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cities.map((fromCity, i) => (
              <tr key={fromCity.id}>
                <td className="border border-gray-300 bg-gray-50 p-3 font-semibold">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center 
                                   justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm">{fromCity.name}</span>
                  </div>
                </td>
                {cities.map((toCity, j) => (
                  <td key={toCity.id} className="border border-gray-300 p-2">
                    {i === j ? (
                      <div className="text-center text-gray-400 font-bold">—</div>
                    ) : (
                      <input
                        type="number"
                        value={matrix[i]?.[j] || 0}
                        onChange={(e) => updateMatrix(i, j, e.target.value)}
                        className="w-full px-2 py-2 text-center border-0 focus:ring-2 focus:ring-blue-500 
                                 rounded transition-all duration-200"
                        min="0"
                        step="0.1"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation */}
      <div className="flex items-center justify-between">
        <div>
          {!isValidMatrix() && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                ⚠️ Tous les coûts de déplacement doivent être positifs (sauf diagonale)
              </p>
            </div>
          )}
          
          {isValidMatrix() && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">
                ✓ Matrice valide ! Prêt pour lancer l'algorithme LITTLE.
              </p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleConfirm}
          disabled={!isValidMatrix()}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                   text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <span>Lancer l'algorithme</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};