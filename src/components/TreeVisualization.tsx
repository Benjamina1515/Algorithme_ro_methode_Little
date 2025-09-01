import React, { useEffect, useRef } from 'react';
import { GitBranch } from 'lucide-react';

interface TreeNode {
  id: string;
  type: 'include' | 'exclude' | 'root';
  arc?: [number, number];
  bound: number;
  level: number;
  x: number;
  y: number;
  parent?: string;
  children: string[];
  isActive: boolean;
  branchValue?: number;
}

interface TreeVisualizationProps {
  steps: any[];
  cities: any[];
  currentStepIndex: number;
}

export const TreeVisualization: React.FC<TreeVisualizationProps> = ({ 
  steps, 
  cities, 
  currentStepIndex 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = React.useState<Map<string, TreeNode>>(new Map());
  
  // Zoom and pan state
  const [zoom, setZoom] = React.useState(0.5); // Start with smaller zoom
  const [panX, setPanX] = React.useState(0);
  const [panY, setPanY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Vérifier si c'est l'étape finale
  const isFinalStep = currentStepIndex >= 0 && currentStepIndex < steps.length && 
                     steps[currentStepIndex]?.type === 'final' && 
                     steps[currentStepIndex]?.title === 'Solution optimale trouvée';

  useEffect(() => {
    buildTree();
  }, [steps, currentStepIndex]);

  useEffect(() => {
    drawTree();
  }, [nodes, zoom, panX, panY]);

  // Show message if no cities
  if (cities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center text-gray-500">
          <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>L'arbre de décision apparaîtra une fois les villes définies</p>
        </div>
      </div>
    );
  }
  const buildTree = () => {
    const nodeMap = new Map<string, TreeNode>();
    
    // Always create at least a root node
    const rootNode: TreeNode = {
        id: 'root',
      type: 'root',
      bound: steps.length > 0 ? steps[0]?.bound || 0 : 100,
        level: 0,
      x: 0,
      y: 0,
      children: [],
      isActive: true
    };
    nodeMap.set('root', rootNode);

    // Build progressively up to currentStepIndex
    if (steps.length > 0) {
      let nodeCounter = 1;
      let currentParent = 'root';

      // Only show nodes up to current step (progressive building)
      const filteredSteps = steps.filter((_, index) => index <= currentStepIndex);

      filteredSteps.forEach((step, i) => {
        if (step.type === 'regret' && step.selectedArc) {
          const [arcI, arcJ] = step.selectedArc;

          const parentNode = nodeMap.get(currentParent);
          if (!parentNode) return;

          // Find the following branch step
          const branchStep = steps.find(s => s.type === 'branch' && s.step === step.step + 1);

          // Parse bounds from branchStep description if available
          let parsedExcludeBound: number | null = null;
          let parsedIncludeBound: number | null = null;
          if (branchStep && typeof branchStep.description === 'string') {
            const exclMatch = branchStep.description.match(/exclure\)\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
            const inclMatch = branchStep.description.match(/inclure\)\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
            if (exclMatch) parsedExcludeBound = parseFloat(exclMatch[1]);
            if (inclMatch) parsedIncludeBound = parseFloat(inclMatch[1]);
          }

          const includeBound = parsedIncludeBound ?? branchStep?.bound ?? parentNode.bound;
          const excludeIncrement = step.regrets?.[arcI]?.[arcJ] ?? 0;
          const excludeBound = parsedExcludeBound ?? (parentNode.bound + excludeIncrement);

          // Exclude branch (red) - left branch
          const excludeId = `exclude_${nodeCounter}`;
          const excludeNode: TreeNode = {
            id: excludeId,
            type: 'exclude',
            arc: [arcI, arcJ],
            bound: excludeBound,
            level: parentNode.level + 1,
            x: 0,
            y: 0,
            parent: currentParent,
            children: [],
            isActive: true,
            branchValue: excludeBound - parentNode.bound
          };
          nodeMap.set(excludeId, excludeNode);

          // Include branch (blue) - right branch
          const includeId = `include_${nodeCounter}`;
          const includeNode: TreeNode = {
            id: includeId,
            type: 'include',
            arc: [arcI, arcJ],
            bound: includeBound,
            level: parentNode.level + 1,
            x: 0,
            y: 0,
            parent: currentParent,
            children: [],
            isActive: true,
            branchValue: includeBound - parentNode.bound
          };
          nodeMap.set(includeId, includeNode);

          // Update parent's children
          parentNode.children.push(excludeId, includeId);

          // Choose next parent based on better bound (smaller is better)
          currentParent = excludeNode.bound <= includeNode.bound ? excludeId : includeId;
          nodeCounter++;
        }
      });
    }

    // Calculate positions
    calculatePositions(nodeMap);
    setNodes(nodeMap);
  };

  const calculatePositions = (nodeMap: Map<string, TreeNode>) => {
    // Get actual canvas dimensions
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 800;

    // Group nodes by level and find max depth
    const levelNodes = new Map<number, TreeNode[]>();
    let maxLevel = 0;
    nodeMap.forEach(node => {
      if (!levelNodes.has(node.level)) {
        levelNodes.set(node.level, []);
      }
      levelNodes.get(node.level)!.push(node);
      if (node.level > maxLevel) maxLevel = node.level;
    });

    // Layout parameters
    const topMargin = 60;
    const verticalSpacing = 120;
    const minHorizontalSpacing = 120;

    // Position root node at the top center
    const rootNode = nodeMap.get('root');
    if (rootNode) {
      rootNode.x = width / 2;
      rootNode.y = topMargin;
    }

    // Position nodes level by level in a hierarchical manner
    for (let level = 1; level <= maxLevel; level++) {
      const nodesAtLevel = levelNodes.get(level) || [];
      const y = topMargin + level * verticalSpacing;

      // Horizontal offset shrinks with depth to create a tidy-tree look
      const computedOffset = Math.max(minHorizontalSpacing, width / Math.pow(2, level + 1));

      nodesAtLevel.forEach(node => {
        const parent = node.parent ? nodeMap.get(node.parent) : undefined;
        if (!parent) {
          // Fallback: center if no parent reference found
          node.x = width / 2;
          node.y = y;
          return;
        }

        // Place exclude to the left and include to the right of the parent
        const direction = node.type === 'exclude' ? -1 : 1;
        node.x = parent.x + direction * computedOffset;
        node.y = y;
      });
    }
  };

  const drawTree = () => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.size === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw connections
    nodes.forEach(node => {
      if (node.parent) {
        const parent = nodes.get(node.parent);
        if (parent) {
          // Calculate connection points (avoiding overlap with nodes)
          const angle = Math.atan2(node.y - parent.y, node.x - parent.x);
          const nodeRadius = 30;
          const startX = parent.x + nodeRadius * Math.cos(angle);
          const startY = parent.y + nodeRadius * Math.sin(angle);
          const endX = node.x - nodeRadius * Math.cos(angle);
          const endY = node.y - nodeRadius * Math.sin(angle);
          
          // Draw connection line
          ctx.strokeStyle = node.isActive ? '#374151' : '#D1D5DB';
          ctx.lineWidth = node.isActive ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const radius = 30;
      
      // Node circle
      ctx.fillStyle = getNodeColor(node);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Node border (dashed)
      ctx.strokeStyle = node.isActive ? '#FFFFFF' : '#D1D5DB';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid

      // Node label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (node.type === 'root') {
        ctx.fillText('R', node.x, node.y - 5);
      } else if (node.arc) {
        const [i, j] = node.arc;
        const cityI = cities[i]?.name.charAt(0) || String.fromCharCode(65 + i);
        const cityJ = cities[j]?.name.charAt(0) || String.fromCharCode(65 + j);
        ctx.fillText(`${cityI}${cityJ}`, node.x, node.y - 5);
      }

      // Bound value above node
      ctx.fillStyle = node.isActive ? '#374151' : '#9CA3AF';
      ctx.font = '12px Arial';
      ctx.fillText(node.bound.toString(), node.x, node.y - radius - 15);
    });

    ctx.restore();
  };

  const getNodeColor = (node: TreeNode): string => {
    if (!node.isActive) return '#E5E7EB';
    
    switch (node.type) {
      case 'root': return '#60A5FA'; // Light blue
      case 'include': return '#3B82F6'; // Blue
      case 'exclude': return '#EF4444'; // Red
      default: return '#6B7280';
    }
  };

  // Event handlers for zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    // Désactiver complètement le zoom dans l'étape finale
    if (isFinalStep) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Only zoom if the event is on a zoom control button
    const target = e.target as HTMLElement;
    if (target.closest('.zoom-control')) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(2, zoom * delta));
      setZoom(newZoom);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(0.5);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GitBranch className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Arbre de décision (Progressif)</h3>
              <p className="text-sm text-gray-600">
                {isFinalStep 
                  ? 'Étape finale - Zoom désactivé, déplacement autorisé' 
                  : 'Construction étape par étape de l\'algorithme'
                }
              </p>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2 zoom-control">
            <button
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              disabled={isFinalStep}
              className={`px-2 py-1 rounded text-sm ${
                isFinalStep 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              −
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              disabled={isFinalStep}
              className={`px-2 py-1 rounded text-sm ${
                isFinalStep 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              +
            </button>
            <button
              onClick={resetView}
              disabled={isFinalStep}
              className={`px-3 py-1 rounded text-sm ${
                isFinalStep 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200'
              } ${!isFinalStep ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-400'}`}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div 
          className="relative"
          onWheel={isFinalStep ? (e) => e.preventDefault() : undefined}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-[400px] border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              // Bloquer complètement le zoom par molette dans l'étape finale
              touchAction: isFinalStep ? 'pan-x pan-y' : 'auto'
            }}
          />
          
                    {/* Instructions overlay */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {isFinalStep ? 'Drag: déplacer • Zoom désactivé' : 'Drag: déplacer • Boutons: zoom'}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
              <span className="text-gray-600">Racine</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <span className="text-gray-600">Inclure arc</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              <span className="text-gray-600">Exclure arc</span>
            </div>
          </div>
          <div className="text-gray-600">
            Étape {currentStepIndex + 1} / {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
};
