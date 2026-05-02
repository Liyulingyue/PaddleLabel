import { create } from 'zustand';
import type { ToolType } from '@/types';

interface ToolState {
  currentTool: ToolType;
  brushSize: number;
  setTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'mover',
  brushSize: 10,
  setTool: (tool: ToolType) => set({ currentTool: tool }),
  setBrushSize: (size: number) => set({ brushSize: size }),
}));
