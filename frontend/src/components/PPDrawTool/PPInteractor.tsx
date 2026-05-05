import type { EvtProps, PPDrawToolProps, PPDrawToolRet, PPRenderFuncProps } from './drawUtils';
import type { Annotation, Label } from '@/services/types';

function getBase64Image(img?: HTMLImageElement) {
  if (!img) return '';
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, img.width, img.height);
  return canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, '');
}

function filterPoints(result: number[][], thresholdRaw?: number): number[] {
  const threshold = thresholdRaw ?? 0.5;
  const points: number[] = [];
  let rowNum = 0;
  for (const row of result) {
    let colNum = 0;
    for (const point of row) {
      if (point >= threshold) points.push(colNum, rowNum);
      colNum++;
    }
    rowNum++;
  }
  return points;
}

export function interactorToAnnotation(
  threshold: number,
  _annotations: Annotation[],
  interactorData: number[][] | undefined,
  dataId?: number,
  finlyList?: Annotation[],
  selectFinly?: Annotation,
  label?: Label
): Annotation | null {
  if (!dataId || !label || !interactorData) return null;
  const points = filterPoints(interactorData, threshold);
  const width = 0;
  let frontendId: number;
  if (selectFinly?.frontendId) {
    frontendId = selectFinly.frontendId;
  } else {
    frontendId = finlyList?.length ? getMaxFrontendId(finlyList) + 1 : 1;
  }
  const result = `${width},${frontendId},` + points.join(',');
  return {
    dataId,
    label,
    labelId: label.labelId,
    frontendId,
    result,
    type: 'brush',
  };
}

export function ectInteractorToAnnotation(
  frontendId?: number,
  result?: string,
  dataId?: number,
  label?: Label,
  predictedBy?: string,
  detection?: string
): Annotation | null {
  if (!dataId || !label || !result) return null;
  return {
    dataId,
    label,
    labelId: label.labelId,
    frontendId,
    result,
    type: detection as any || 'ocr_polygon',
    predictedBy,
  };
}

function getMaxFrontendId(annotations?: Annotation[]): number {
  if (!annotations || annotations.length === 0) return 0;
  let max = 0;
  for (const annotation of annotations) {
    if (annotation.frontendId != null && annotation.frontendId > max) max = annotation.frontendId;
  }
  return max;
}

function renderMousePoints(mousePoints: number[][], ctx: CanvasRenderingContext2D, radius: number = 10) {
  for (const [x, y, positive] of mousePoints) {
    ctx.beginPath();
    ctx.fillStyle = positive ? '#008000' : '#FF0000';
    ctx.arc(x as number, y as number, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x as number, y as number, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function renderPoints(points: number[], ctx: CanvasRenderingContext2D, color: string | undefined) {
  if (points.length < 4) return;
  renderPixel(ctx, points.slice(2), color);
}

function renderPixel(ctx: CanvasRenderingContext2D, points: number[], color: string | undefined) {
  ctx.globalCompositeOperation = color ? 'source-over' : 'destination-out';
  if (color) ctx.fillStyle = color;
  for (let i = 0; i <= points.length / 2 - 1; i++) {
    ctx.fillRect(points[2 * i], points[2 * i + 1], 1, 1);
  }
}

export default function PPInteractor(props: PPDrawToolProps): PPDrawToolRet {
  const OnMouseDown = async (param: EvtProps) => {
    if (props.currentTool !== 'interactor') return;
    if (!props.currentLabel?.color) {
      console.warn('Choose category first');
      return;
    }
    if (param.e.evt.button === 1) return;

    const mouseX = Math.round(param.mouseX);
    const mouseY = Math.round(param.mouseY);

    const frontendId = props.frontendIdOps.frontendId > 0
      ? props.frontendIdOps.frontendId
      : getMaxFrontendId(props.annotations) + 1;

    if (frontendId !== props.frontendIdOps.frontendId) props.frontendIdOps.setFrontendId(frontendId);

    // This is simplified - original uses interactorData from model
    // In practice, this would call the ML model via props.model.predict
    console.log('Interactor click:', mouseX, mouseY, 'frontendId:', frontendId);
  };

  const OnMouseMove = (_param: EvtProps) => {};

  const OnMouseUp = (_param: EvtProps) => {
    if (props.currentTool !== 'interactor') return;
    if (props.onMouseUp) props.onMouseUp();
  };

  const drawAnnotation = (param: PPRenderFuncProps): any => {
    const { canvasRef, interactorData, label, threshold } = param;
    if (!interactorData || !label?.color) return <></>;
    const result = interactorData.predictData as number[][];
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return <></>;
    const points = filterPoints(result, threshold);
    renderPoints(points, ctx, label.color);
    renderMousePoints(interactorData.mousePoints || [], ctx, param.radius || 10);
    return <></>;
  };

  return {
    onMouseDown: OnMouseDown,
    onMouseMove: OnMouseMove,
    onMouseUp: OnMouseUp,
    drawAnnotation,
  };
}
