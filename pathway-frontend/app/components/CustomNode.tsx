'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export type NodeData = {
  label: string;
  phase: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  onStatusChange?: (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => void;
};

const CustomNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as NodeData;

  const cycleStatus = () => {
    if (!nodeData.onStatusChange) return;
    const nextStatus = 
      nodeData.status === 'pending' ? 'in_progress' : 
      nodeData.status === 'in_progress' ? 'completed' : 'pending';
    nodeData.onStatusChange(id, nextStatus);
  };

  return (
    <div 
      onClick={cycleStatus}
      className={`w-72 p-4 rounded-xl border transition-all cursor-pointer shadow-lg backdrop-blur-md select-none ${
        nodeData.status === 'completed'
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
          : nodeData.status === 'in_progress'
          ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
          : 'bg-neutral-900/90 border-neutral-800 text-neutral-200 hover:border-neutral-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-500 !w-3 !h-3" />
      
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
          {nodeData.phase}
        </span>
        {nodeData.status === 'completed' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={13} /> Done</span>
        )}
        {nodeData.status === 'in_progress' && (
          <span className="flex items-center gap-1 text-xs text-amber-400"><Clock size={13} /> Active</span>
        )}
        {nodeData.status === 'pending' && (
          <span className="flex items-center gap-1 text-xs text-neutral-500"><Circle size={13} /> To Do</span>
        )}
      </div>

      <h3 className="text-sm font-semibold mb-1 text-white">{nodeData.label}</h3>
      <p className="text-xs text-neutral-400 leading-relaxed">{nodeData.description}</p>

      <Handle type="source" position={Position.Bottom} className="!bg-neutral-500 !w-3 !h-3" />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
export default CustomNode;