import type { Annotation, Label, ToolType } from '@/services/types';
import type { Stage as StageType } from 'konva/lib/Stage';
import type Konva from 'konva';
import type { ReactElement } from 'react';

export type PPRenderFuncProps = {
  annotation: Annotation;
  annotations?: Annotation[];
  onDrag: (annotation: Annotation) => void;
  onDragEnd: () => void;
  scale: number;
  currentTool: ToolType;
  onSelect: (annotation: Annotation) => void;
  onPointIndex: (index: number) => void;
  stageRef: React.RefObject<StageType>;
  layerRef: React.RefObject<any>;
  currentAnnotation?: Annotation;
  transparency: number;
  threshold?: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasRef2: React.RefObject<HTMLCanvasElement>;
  interactorData?: any;
  label?: Label;
  radius?: number;
  tool?: { curr: ToolType; setCurr: (tool: ToolType) => void };
  selectFinly?: Annotation;
  SelectAnnotation?: (annotation: Annotation) => void;
  onDragUP?: (annotation: Annotation) => void;
  pathName?: string;
  ChanegeTool?: (tool: string) => void;
  pointIndex?: number | null;
  ctx3?: CanvasRenderingContext2D | null;
  pointArr?: { x: number; y: number }[];
  canvasWidth: number;
  canvasHeight: number;
};

export type PPDrawToolProps = {
  frontendIdOps: { frontendId: number; setFrontendId: (id: number) => void };
  model?: any;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationModify: (annotation: Annotation) => void;
  onAnnotationupdata?: (annotation: Annotation) => void;
  modifyAnnoByFrontendId: (annotation: Annotation) => void;
  onMouseUp: () => void;
  currentLabel?: Label;
  brushSize?: number;
  scale: number;
  dataId?: number;
  currentTool?: ToolType;
  annotations?: Annotation[];
  currentAnnotation?: Annotation;
  onMouseDown?: () => void;
  labels?: Label[];
  finlyList?: Annotation[];
  selectFinly?: Annotation;
  isLabel: string;
  preTool?: string;
  ChanegeTool?: (tool: string) => void;
  pathName?: string;
};

export type EvtProps = {
  e: Konva.KonvaEventObject<MouseEvent>;
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  stageRef: React.RefObject<StageType>;
  img?: HTMLImageElement;
  pointIndex?: number | null;
  onPointIndex?: (index: any) => void;
  pathName?: string;
  currentAnnotation?: Annotation;
  flags?: boolean;
};

export type EvtType = (props: EvtProps) => void;

export type PPDrawToolRet = {
  onMouseDown: EvtType;
  onMouseMove: EvtType;
  onMouseUp: EvtType;
  drawAnnotation: (props: PPRenderFuncProps, flag?: boolean, offsetX?: number, offsetY?: number) => ReactElement;
  drawGuidewires?: (x: number, y: number, context: any, brushSize?: number) => void;
};

export function getMaxId(annotations?: Annotation[]): number {
  let maxId = 0;
  if (!annotations) return maxId;
  for (const annotation of annotations) {
    if (!annotation || annotation.frontendId == null) continue;
    if (annotation.frontendId > maxId) maxId = annotation.frontendId;
  }
  return maxId;
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

export function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
