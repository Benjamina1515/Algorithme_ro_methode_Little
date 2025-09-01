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

    // Debug logs
    console.log('GraphVisualization - Cities:', cities);
    console.log('GraphVisualization - Cost Matrix:', costMatrix);
    console.log('GraphVisualization - Matrix dimensions:', costMatrix.length, 'x', costMatrix[0]?.length);
    console.log('GraphVisualization - Valid connections found:', hasValidConnections);
    console.log('GraphVisualization - Sample costs:', costMatrix.slice(0, 3).map(row => row.slice(0, 3)));

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

    // Generate city positions in a more organized layout
    const positions = cities.map((city, index) => {
      let x, y;
      
      if (cities.length === 6) {
        // Special layout for 6 cities (like in the image)
        const positions6 = [
          { x: width * 0.2, y: height * 0.3 },  // A (top-left)
          { x: width * 0.4, y: height * 0.2 },  // B (top-center)
          { x: width * 0.6, y: height * 0.3 },  // C (top-right)
          { x: width * 0.3, y: height * 0.7 },  // D (bottom-left)
          { x: width * 0.5, y: height * 0.8 },  // E (bottom-center)
          { x: width * 0.7, y: height * 0.7 }   // F (bottom-right)
        ];
        return positions6[index];
      } else if (cities.length <= 4) {
        // Square layout for 4 or fewer cities
        const positions4 = [
          { x: width * 0.25, y: height * 0.25 }, // Top-left
          { x: width * 0.75, y: height * 0.25 }, // Top-right
          { x: width * 0.25, y: height * 0.75 }, // Bottom-left
          { x: width * 0.75, y: height * 0.75 }  // Bottom-right
        ];
        return positions4[index];
      } else {
        // Circular layout for other numbers
        const angle = (2 * Math.PI * index) / cities.length - Math.PI / 2;
        const radius = Math.min(width, height) / 2 - margin;
        const centerX = width / 2;
        const centerY = height / 2;
        
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
        return { x, y };
      }
    });

    // Draw directed edges (arrows) for all valid connections
    ctx.strokeStyle = '#8B4513'; // Brown color like in the image
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]); // Dashed lines

    for (let i = 0; i < cities.length; i++) {
      for (let j = 0; j < cities.length; j++) {
        if (i !== j && costMatrix[i] && costMatrix[i][j] > 0) {
          const from = positions[i];
          const to = positions[j];
          
          // Calculate arrow position (avoiding overlap with nodes)
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const nodeRadius = 30;
          const startX = from.x + nodeRadius * Math.cos(angle);
          const startY = from.y + nodeRadius * Math.sin(angle);
          const endX = to.x - nodeRadius * Math.cos(angle);
          const endY = to.y - nodeRadius * Math.sin(angle);
          
          // Draw arrow line
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Draw arrowhead
          const arrowLength = 15;
          const arrowAngle = Math.PI / 6;
          
          ctx.setLineDash([]); // Solid lines for arrowhead
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
          ctx.setLineDash([8, 4]); // Back to dashed for lines

          // Draw cost label on the edge
          const cost = costMatrix[i][j];
          if (cost > 0) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Background for cost label
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 1;
            
            const textWidth = ctx.measureText(cost.toString()).width;
            const padding = 4;
            const rectWidth = textWidth + padding * 2;
            const rectHeight = 16;
            
            ctx.fillRect(midX - rectWidth/2, midY - rectHeight/2, rectWidth, rectHeight);
            ctx.strokeRect(midX - rectWidth/2, midY - rectHeight/2, rectWidth, rectHeight);
            
            // Cost text
            ctx.fillStyle = '#8B4513';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cost.toString(), midX, midY);
          }
        }
      }
    }

    // Draw cities as white circles with dashed brown border
    cities.forEach((city, index) => {
      const pos = positions[index];
      
      // City circle (white fill)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 30, 0, 2 * Math.PI);
      ctx.fill();

      // City border (dashed brown)
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      // City label (single letter)
      ctx.fillStyle = '#8B4513';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(city.name.charAt(0).toUpperCase(), pos.x, pos.y);
    });

  }, [cities, costMatrix, result]);

  // Check if matrix has any valid connections
  const hasValidConnections = costMatrix.some((row, i) => 
    row.some((cost, j) => i !== j && cost > 0)
  );

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

  if (!hasValidConnections) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center text-gray-500">
          <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Définissez des coûts dans la matrice pour voir le graphe</p>
          <p className="text-sm text-gray-400 mt-2">
            Le graphe s'affichera automatiquement une fois les coûts saisis
          </p>
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
            <h3 className="text-lg font-semibold text-gray-900">Graphe du problème</h3>
            <p className="text-sm text-gray-600">
              Représentation des connexions entre villes avec coûts
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-96 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white border-2 border-brown-600 rounded-full"></div>
              <span className="text-gray-600">Villes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-brown-600 border-dashed border-brown-600"></div>
              <span className="text-gray-600">Connexions dirigées</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-4 bg-white border border-brown-600 text-xs text-brown-600 flex items-center justify-center">24</div>
              <span className="text-gray-600">Coûts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};