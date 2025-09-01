import React, { useEffect, useRef } from 'react';
import { GitBranch } from 'lucide-react';
import { LittleStep, City } from '../App';

interface DecisionTreeProps {
  steps: LittleStep[];
  cities: City[];
  currentStep: number;
}

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
  isOptimal?: boolean;
  branchValue?: number; // Value on the branch leading to this node
}

export const DecisionTree: React.FC<DecisionTreeProps> = ({ steps, cities, currentStep }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = React.useState<Map<string, TreeNode>>(new Map());
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [viewOffset, setViewOffset] = React.useState({ x: 0, y: 0 });

  useEffect(() => {
    buildTree();
  }, [steps, currentStep]);

  useEffect(() => {
    drawTree();
  }, [nodes, viewOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragOffset({ x: x - viewOffset.x, y: y - viewOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setViewOffset({
      x: x - dragOffset.x,
      y: y - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? 1 - zoomFactor : 1 + zoomFactor;
    
    setViewOffset(prev => ({
      x: prev.x * delta,
      y: prev.y * delta
    }));
  };

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
      bound: steps.length > 0 ? steps[0]?.bound || 0 : 100, // Default bound if no steps
      level: 0,
      x: 0,
      y: 0,
      children: [],
      isActive: true
    };
    nodeMap.set('root', rootNode);

    // If we have steps, build the tree from steps
    if (steps.length > 0) {
      let nodeCounter = 1;
      let currentParent = 'root';

      // Build only from regret steps; fetch the subsequent branch step for bounds
      steps.forEach((step, i) => {
        if (step.type === 'regret' && step.selectedArc) {
          const [arcI, arcJ] = step.selectedArc;

          const parentNode = nodeMap.get(currentParent);
          if (!parentNode) return;

          // Find the following branch step (usually step.step + 1)
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

          // Fallbacks: include bound may be the branch step bound; exclude bound fallback uses regret increment
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
            isActive: i <= currentStep,
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
            isActive: i <= currentStep,
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
    } else {
      // Create demo tree structure if no steps yet
      const excludeId = 'exclude_1';
      const includeId = 'include_1';
      
      const excludeNode: TreeNode = {
        id: excludeId,
        type: 'exclude',
        arc: [0, 1],
        bound: rootNode.bound + 24,
        level: 1,
        x: 0,
        y: 0,
        parent: 'root',
        children: [],
        isActive: true,
        branchValue: 24
      };
      
      const includeNode: TreeNode = {
        id: includeId,
        type: 'include',
        arc: [0, 1],
        bound: rootNode.bound,
        level: 1,
        x: 0,
        y: 0,
        parent: 'root',
        children: [],
        isActive: true,
        branchValue: 0
      };
      
      nodeMap.set(excludeId, excludeNode);
      nodeMap.set(includeId, includeNode);
      rootNode.children.push(excludeId, includeId);
    }

    // Calculate positions
    calculatePositions(nodeMap);
    setNodes(nodeMap);
    
    // Debug log
    console.log('Tree built:', Array.from(nodeMap.values()).map(n => ({
      id: n.id,
      parent: n.parent,
      children: n.children,
      level: n.level,
      type: n.type,
      bound: n.bound,
      x: n.x,
      y: n.y
    })));
  };

  const calculatePositions = (nodeMap: Map<string, TreeNode>) => {
    // Get actual canvas dimensions
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 800; // Use actual width or fallback to 800
    const height = rect.height || 600; // Use actual height or fallback to 600

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
      console.log('Root positioned at:', rootNode.x, rootNode.y, 'Canvas width:', width);
    }

    // Position nodes level by level in a hierarchical (arborescent) manner
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

    // Debug log for positioning
    console.log('Positions calculated (hierarchical):', Array.from(nodeMap.values()).map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
      level: n.level,
      parent: n.parent
    })));
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

    // Apply view transformation
    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);

    // Debug: Draw background grid to see canvas bounds
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw connections with branch values
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

          // Draw branch value near the child node
          if (node.branchValue !== undefined && node.branchValue > 0) {
            // Position the value closer to the child node
            const midX = startX + (endX - startX) * 0.7;
            const midY = startY + (endY - startY) * 0.7;
            
            // Background for text
            const text = node.branchValue.toString();
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = 'white';
            ctx.fillRect(midX - textWidth/2 - 4, midY - 8, textWidth + 8, 16);
            
            // Border for text background
            ctx.strokeStyle = '#D1D5DB';
            ctx.lineWidth = 1;
            ctx.strokeRect(midX - textWidth/2 - 4, midY - 8, textWidth + 8, 16);
            
            // Text
            ctx.fillStyle = node.isActive ? '#374151' : '#9CA3AF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, midX, midY);
          }
        }
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const radius = 30;
      
      // Debug: Log node being drawn
      console.log(`Drawing node: ${node.id} at (${node.x}, ${node.y})`);
      
      // Node circle with dashed outline
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

    // Restore context
    ctx.restore();
  };

  const getNodeColor = (node: TreeNode): string => {
    if (!node.isActive) return '#E5E7EB';
    
    switch (node.type) {
      case 'root': return '#60A5FA'; // Light blue like in the image
      case 'include': return '#3B82F6'; // Blue
      case 'exclude': return '#EF4444'; // Red
      default: return '#6B7280';
    }
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
              <h3 className="text-lg font-semibold text-gray-900">Arbre de décision</h3>
              <p className="text-sm text-gray-600">
                Processus étape par étape de l'algorithme
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewOffset({ x: 0, y: 0 })}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            title="Remettre à la position initiale"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-[600px] border border-gray-200 rounded-lg"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
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
            Étape {currentStep + 1} / {steps.length}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          💡 Cliquez et glissez pour déplacer l'arbre • Molette pour zoomer • Bouton Reset pour repositionner
        </div>
      </div>
    </div>
  );
};