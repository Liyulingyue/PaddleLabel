import type { ToolType } from '@/services/types';
import type { ReactElement } from 'react';
import type { EvtProps, PPDrawToolProps, PPDrawToolRet, PPRenderFuncProps } from './drawUtils';
import type { Annotation } from '@/services/types';

type CanvasLineType = {
  frontendId: number;
  type: ToolType;
  width: number;
  color: string;
  points: number[];
};

function createLine(param: CanvasLineType): string {
  if (!param || !param.width || param.color == null || !param.points || param.points.length < 2 || param.frontendId == null) return '';
  const frontendId = param.type === 'rubber' ? 0 : param.frontendId;
  return `${param.width},${frontendId},${param.points.join(',')}`;
}

function drawAnnotation(param: PPRenderFuncProps): ReactElement {
  const { canvasRef2, annotation } = param;
  const canvasRef = canvasRef2;
  const result = annotation.result;
  if (!result) return <></>;
  const ctx = canvasRef.current?.getContext('2d');
  if (!ctx) return <></>;

  let points: number[] = [];
  let startIndex = 0;

  for (let i = 0; i < result.length; i++) {
    if (result.charAt(i) === ',') {
      points.push(parseFloat(result.slice(startIndex, i)));
      startIndex = i + 1;
    } else if (result.charAt(i) === '|') {
      points.push(parseFloat(result.slice(startIndex, i)));
      renderPoints(points, ctx, annotation);
      points = [];
      startIndex = i + 1;
    } else if (i === result.length - 1) {
      points.push(parseFloat(result.slice(startIndex, result.length)));
      renderPoints(points, ctx, annotation);
    }
  }
  return <></>;
}

function drawGuidewires(x: number, y: number, context: CanvasRenderingContext2D, brushSize: number = 10) {
  context.save();
  context.beginPath();
  context.arc(x, y, brushSize / 16, 0, 2 * Math.PI);
  context.strokeStyle = 'red';
  context.stroke();
  context.restore();
}

function renderPoints(points: number[], ctx: CanvasRenderingContext2D, annotation: Annotation) {
  if (points.length < 4) return;
  const width = points[0];
  const frontendId = points[1];
  if (width === 0) {
    renderPixel(ctx, points.slice(2), annotation.label?.color);
    return;
  }
  if (frontendId === 0) {
    renderBrush(ctx, width, points.slice(2), undefined);
    return;
  }
  renderBrush(ctx, width, points.slice(2), annotation.label?.color);
}

function renderBrush(ctx: CanvasRenderingContext2D, width: number, points: number[], color: string | undefined) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 0; i <= points.length / 2 - 1; i++) {
    ctx.lineTo(points[2 * i], points[2 * i + 1]);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  if (color) ctx.strokeStyle = color;
  ctx.globalCompositeOperation = color ? 'source-over' : 'destination-out';
  ctx.stroke();
}

function renderPixel(ctx: CanvasRenderingContext2D, points: number[], color: string | undefined) {
  ctx.globalCompositeOperation = color ? 'source-over' : 'destination-out';
  if (color) ctx.fillStyle = color;
  for (let i = 0; i <= points.length / 2 - 1; i++) {
    ctx.fillRect(points[2 * i], points[2 * i + 1], 1, 1);
  }
}

function getMaxFrontendId(annotations?: Annotation[]) {
  if (!annotations || annotations.length === 0) return 0;
  let max = 0;
  for (const annotation of annotations) {
    if (annotation.frontendId != null && annotation.frontendId > max) max = annotation.frontendId;
  }
  return max;
}

function getTool(currentTool: ToolType, mouseButton: number): ToolType {
  if (currentTool === 'rubber') return 'rubber';
  if (mouseButton === 2) return 'rubber';
  return 'brush';
}

export default function PPBrush(props: PPDrawToolProps): PPDrawToolRet {
  let finlyResult = '';

  const OnMouseDown = (param: EvtProps) => {
    if ((props.currentTool !== 'brush' && props.currentTool !== 'rubber') || !props.brushSize) return;
    const mouseX = param.mouseX;
    const mouseY = param.mouseY;
    const tool = getTool(props.currentTool, param.e.evt.button);

    let frontendId: number;
    if (props.finlyList && props.finlyList.length > 0 && props.selectFinly) {
      frontendId = props.selectFinly.frontendId ?? getMaxFrontendId(props.finlyList) + 1;
    } else if (props.finlyList && props.finlyList.length > 0 && !props.selectFinly) {
      frontendId = getMaxFrontendId(props.finlyList) + 1;
    } else if (props.finlyList?.length === 0 && !props.selectFinly) {
      frontendId = props.frontendIdOps.frontendId > 0 ? props.frontendIdOps.frontendId : getMaxFrontendId(props.annotations) + 1;
    } else {
      frontendId = props.frontendIdOps.frontendId > 0 ? props.frontendIdOps.frontendId : getMaxFrontendId(props.annotations) + 1;
    }

    if (frontendId !== props.frontendIdOps.frontendId) props.frontendIdOps.setFrontendId(frontendId);

    const line = createLine({
      width: props.brushSize || 10,
      color: tool === 'brush' ? (props.currentLabel?.color || 'blue') : '',
      points: [mouseX, mouseY, mouseX, mouseY],
      type: tool,
      frontendId,
    });
    if (!line) return;

    if (tool === 'brush' && props.currentLabel) {
      const anno: Annotation = {
        dataId: props.dataId,
        label: props.currentLabel,
        labelId: props.currentLabel?.labelId,
        frontendId,
        result: line,
        type: 'brush',
      };
      props.onAnnotationAdd(anno);
    } else if (tool === 'rubber') {
      const anno: Annotation = {
        dataId: props.dataId,
        label: props.currentAnnotation?.label || props.labels?.[0],
        labelId: props.currentAnnotation?.labelId || props.labels?.[0]?.labelId,
        frontendId,
        result: line,
        type: 'rubber',
      };
      props.onAnnotationAdd(anno);
    }
    finlyResult = line;
  };

  const OnMouseMove = (_param: EvtProps) => {
    // handled in PPStage
  };

  const OnMouseUp = (_param: EvtProps) => {
    if (!finlyResult) return;
    const LastAnnotations = props.annotations?.[props.annotations.length - 1];
    if (LastAnnotations && props.onAnnotationupdata) {
      props.onAnnotationupdata({ ...LastAnnotations, result: finlyResult });
    }
    finlyResult = '';
    if (props.onMouseUp) props.onMouseUp();
  };

  return {
    onMouseDown: OnMouseDown,
    onMouseMove: OnMouseMove,
    onMouseUp: OnMouseUp,
    drawGuidewires,
    drawAnnotation,
  };
}
