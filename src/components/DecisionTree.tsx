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
}

export const DecisionTree: React.FC<DecisionTreeProps> = ({ steps, cities, currentStep }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = React.useState<Map<string, TreeNode>>(new Map());

  useEffect(() => {
    buildTree();
  }, [steps, currentStep]);

  useEffect(() => {
    drawTree();
  }, [nodes]);

  const buildTree = () => {
    const nodeMap = new Map<string, TreeNode>();
    
    // Root node
    const rootNode: TreeNode = {
      id: 'root',
      type: 'root',
      bound: steps[0]?.bound || 0,
      level: 0,
      x: 0,
      y: 0,
      children: [],
      isActive: currentStep >= 0
    };
    nodeMap.set('root', rootNode);

    let nodeCounter = 1;
    let currentParent = 'root';

    // Process steps to build tree
    for (let i = 0; i < Math.min(steps.length, currentStep + 1); i++) {
      const step = steps[i];
      
      if (step.type === 'branch' && step.selectedArc) {
        const [arcI, arcJ] = step.selectedArc;
        
        // Exclude branch (red)
        const excludeId = `exclude_${nodeCounter}`;
        const excludeNode: TreeNode = {
          id: excludeId,
          type: 'exclude',
          arc: [arcI, arcJ],
          bound: step.bound + (step.regrets?.[arcI]?.[arcJ] || 0),
          level: step.step,
          x: 0,
          y: 0,
          parent: currentParent,
          children: [],
          isActive: i <= currentStep
        };
        nodeMap.set(excludeId, excludeNode);
        
        // Include branch (blue)
        const includeId = `include_${nodeCounter}`;
        const includeNode: TreeNode = {
          id: includeId,
          type: 'include',
          arc: [arcI, arcJ],
          bound: step.bound,
          level: step.step,
          x: 0,
          y: 0,
          parent: currentParent,
          children: [],
          isActive: i <= currentStep
        };
        nodeMap.set(includeId, includeNode);
        
        // Update parent's children
        const parent = nodeMap.get(currentParent);
        if (parent) {
          parent.children.push(excludeId, includeId);
        }
        
        // Choose next parent based on better bound
        currentParent = excludeNode.bound <= includeNode.bound ? excludeId : includeId;
        nodeCounter++;
      }
    }

    // Calculate positions
    calculatePositions(nodeMap);
    setNodes(nodeMap);
  };

  const calculatePositions = (nodeMap: Map<string, TreeNode>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const levels = Math.max(...Array.from(nodeMap.values()).map(n => n.level)) + 1;
    
    // Position nodes level by level
    const levelNodes = new Map<number, TreeNode[]>();
    
    nodeMap.forEach(node => {
      if (!levelNodes.has(node.level)) {
        levelNodes.set(node.level, []);
      }
      levelNodes.get(node.level)!.push(node);
    });

    levelNodes.forEach((nodes, level) => {
      const y = (height / (levels + 1)) * (level + 1);
      const spacing = width / (nodes.length + 1);
      
      nodes.forEach((node, index) => {
        node.x = spacing * (index + 1);
        node.y = y;
      });
    });
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

    // Draw connections
    nodes.forEach(node => {
      if (node.parent) {
        const parent = nodes.get(node.parent);
        if (parent) {
          ctx.strokeStyle = node.isActive ? '#374151' : '#D1D5DB';
          ctx.lineWidth = node.isActive ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(parent.x, parent.y);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        }
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const radius = 25;
      
      // Node circle
      ctx.fillStyle = getNodeColor(node);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Node border
      ctx.strokeStyle = node.isActive ? '#FFFFFF' : '#D1D5DB';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
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

      // Bound value
      ctx.fillStyle = node.isActive ? '#374151' : '#9CA3AF';
      ctx.font = '10px Arial';
      ctx.fillText(node.bound.toString(), node.x, node.y + 5);

      // Arc label below node
      if (node.arc) {
        ctx.fillStyle = node.isActive ? '#374151' : '#9CA3AF';
        ctx.font = '8px Arial';
        ctx.fillText(
          `${node.bound}`,
          node.x,
          node.y + radius + 15
        );
      }
    });
  };

  const getNodeColor = (node: TreeNode): string => {
    if (!node.isActive) return '#E5E7EB';
    
    switch (node.type) {
      case 'root': return '#10B981';
      case 'include': return '#3B82F6';
      case 'exclude': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <GitBranch className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Arbre de décision</h3>
            <p className="text-sm text-gray-600">
              Visualisation des branches d'inclusion/exclusion
            </p>
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
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
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
      </div>
    </div>
  );
};