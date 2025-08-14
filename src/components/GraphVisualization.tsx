import React, { useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import { City, TSPResult } from '../App';

interface GraphVisualizationProps {
  cities: City[];
  costMatrix: number[][];
  result?: TSPResult | null;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  cities,
  costMatrix,
  result
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cities.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const margin = 60;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate city positions in a circle if not provided
    const positions = cities.map((city, index) => {
      if (city.x !== undefined && city.y !== undefined) {
        return { x: city.x, y: city.y };
      }
      
      const angle = (2 * Math.PI * index) / cities.length - Math.PI / 2;
      const radius = Math.min(width, height) / 2 - margin;
      const centerX = width / 2;
      const centerY = height / 2;
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // Draw edges (all connections)
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        if (costMatrix[i] && costMatrix[i][j] > 0) {
          ctx.beginPath();
          ctx.moveTo(positions[i].x, positions[i].y);
          ctx.lineTo(positions[j].x, positions[j].y);
          ctx.stroke();

          // Draw cost labels
          const midX = (positions[i].x + positions[j].x) / 2;
          const midY = (positions[i].y + positions[j].y) / 2;
          
          ctx.fillStyle = '#6B7280';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Background for text
          const text = costMatrix[i][j].toString();
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = 'white';
          ctx.fillRect(midX - textWidth/2 - 3, midY - 8, textWidth + 6, 16);
          
          ctx.fillStyle = '#6B7280';
          ctx.fillText(text, midX, midY);
        }
      }
    }

    // Draw optimal path if available
    if (result && result.path.length > 0) {
      ctx.setLineDash([]);
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 3;

      for (let i = 0; i < result.path.length; i++) {
        const from = result.path[i];
        const to = result.path[(i + 1) % result.path.length];
        
        ctx.beginPath();
        ctx.moveTo(positions[from].x, positions[from].y);
        ctx.lineTo(positions[to].x, positions[to].y);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(
          positions[to].y - positions[from].y,
          positions[to].x - positions[from].x
        );
        
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        const endX = positions[to].x - 25 * Math.cos(angle);
        const endY = positions[to].y - 25 * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
      }
    }

    // Draw cities
    cities.forEach((city, index) => {
      const pos = positions[index];
      
      // City circle
      ctx.fillStyle = result && result.path.includes(index) ? '#DC2626' : '#2563EB';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
      ctx.fill();

      // City border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      // City number
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), pos.x, pos.y);

      // City name
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(city.name, pos.x, pos.y + 25);
    });

  }, [cities, costMatrix, result]);

  if (cities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center text-gray-500">
          <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>La visualisation apparaîtra une fois les villes définies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden h-fit">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Eye className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Visualisation du graphe</h3>
            {result && (
              <p className="text-sm text-green-600 font-medium">
                Circuit optimal: coût {result.cost}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-80 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <span className="text-gray-600">Villes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-300"></div>
              <span className="text-gray-600">Connexions</span>
            </div>
            {result && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-red-600"></div>
                <span className="text-gray-600">Circuit optimal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};