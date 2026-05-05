import { create } from 'zustand';
import type { ToolType } from '@/types';

interface ToolState {
  currentTool: ToolType;
  brushSize: number;
  transparency: number;
  scale: number;
  setTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setTransparency: (v: number) => void;
  setScale: (v: number) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'mover',
  brushSize: 10,
  transparency: 0,
  scale: 1,
  setTool: (tool: ToolType) => set({ currentTool: tool }),
  setBrushSize: (size: number) => set({ brushSize: size }),
  setTransparency: (v: number) => set({ transparency: v }),
  setScale: (v: number) => set({ scale: v }),
}));
