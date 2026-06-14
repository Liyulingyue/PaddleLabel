import { Circle, Group, Rect } from 'react-konva';
import type { ReactElement } from 'react';
import type { Annotation } from '@/services/types';
import type { EvtProps, PPDrawToolProps, PPDrawToolRet, PPRenderFuncProps } from './drawUtils';
import { getMaxId, hexToRgb } from './drawUtils';

function drawGuidewires(x: number, y: number, context: CanvasRenderingContext2D) {
  context.save();
  context.strokeStyle = 'rgba(0,0,230,0.9)';
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(0, y + 0.5);
  context.lineTo(context.canvas.width, y + 0.5);
  context.stroke();
  context.beginPath();
  context.moveTo(x + 0.5, 0);
  context.lineTo(x + 0.5, context.canvas.height);
  context.stroke();
  context.restore();
}

function drawRectangle(props: PPRenderFuncProps): ReactElement {
  let lengths = 0;
  if (props.annotation.type == 'ocr_rectangle') {
    const data = props.annotation.result?.split('||')[0];
    const results2 = data && data.split('|').join(',');
    lengths = results2?.split(',').length || 0;
  } else {
    lengths = props.annotation.result?.split(',').length || 0;
  }
  if (lengths && lengths < 4) return <></>;

  const annotation = props.annotation;
  if (!annotation || !annotation.result || !annotation.label?.color) return <></>;

  let pointsRaw: string[] = [];
  if (annotation.type == 'ocr_rectangle') {
    const data = annotation.result?.split('||')[0];
    const results2 = data && data.split('|').join(',');
    pointsRaw = results2.split(',');
  } else {
    pointsRaw = annotation.result.split(',');
  }

  const xmins = Number(pointsRaw[0]) - props.canvasWidth / 2;
  const ymins = Number(pointsRaw[1]) - props.canvasHeight / 2;
  const xmaxs = Number(pointsRaw[2]) - props.canvasWidth / 2;
  const ymaxs = Number(pointsRaw[3]) - props.canvasHeight / 2;

  const color = annotation.label.color;
  const rgb = hexToRgb(color);
  if (!rgb) return <></>;

  const selected = props.currentAnnotation?.frontendId == annotation.frontendId;
  const transparency = selected ? 0.5 : 0.2;

  const rect = xmaxs != undefined && ymaxs != undefined ? (
    <Rect
      onClick={() => {
        if (props.currentTool === 'editor' || props.currentTool === 'mover') props.onSelect(annotation);
      }}
      stroke={color}
      strokeWidth={2 / props.scale}
      globalCompositeOperation="source-over"
      lineCap="round"
      x={xmins}
      y={ymins}
      width={xmaxs - xmins}
      height={ymaxs - ymins}
      closed={true}
      fill={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${transparency})`}
    />
  ) : <></>;

  function createDot(isMin: boolean) {
    if (!isMin && (xmaxs == undefined || ymaxs == undefined)) return <></>;
    return (
      <Circle
        onMouseDown={() => {
          if (props.currentTool !== 'rectangle') {
            if (props.ChanegeTool) props.ChanegeTool('editor');
            props.onPointIndex(isMin ? 1 : 2);
          }
          props.onSelect(annotation);
        }}
        onMouseOver={() => {
          if (props.stageRef?.current && props.currentTool !== 'rectangle')
            props.stageRef.current.container().style.cursor = 'cell';
        }}
        onMouseOut={() => {
          if (props.stageRef?.current) props.stageRef.current.container().style.cursor = 'default';
        }}
        x={isMin ? xmins : xmaxs}
        y={isMin ? ymins : ymaxs}
        radius={5 / props.scale}
        fill={color}
      />
    );
  }

  return (
    <Group key={annotation.annotationId}>
      {rect}
      {createDot(true)}
      {createDot(false)}
    </Group>
  );
}

export default function PPRectangle(props: PPDrawToolProps): PPDrawToolRet {
  const startNewRectangle = (mouseX: number, mouseY: number, pathName?: string) => {
    const polygon = `${mouseX},${mouseY}`;
    if (!polygon || !props.dataId) {
      console.warn('[PPRectangle] Cannot create rectangle: missing polygon or dataId', { polygon, dataId: props.dataId });
      return;
    }
    const anno: Annotation = {
      dataId: props.dataId,
      type: 'rectangle',
      frontendId: getMaxId(props.annotations) + 1,
      label: props.currentLabel,
      labelId: props.currentLabel?.labelId,
    };
    if (pathName === '/project/:id/label/ocr') {
      const data = polygon.split(',').join('|');
      anno.result = data + '||待识别|0|';
      anno.type = 'ocr_rectangle';
    } else {
      anno.result = polygon;
    }
    console.log('[PPRectangle] Calling onAnnotationAdd with:', anno);
    props.onAnnotationAdd(anno);
  };

  const addDotToRectangle = (mouseX: number, mouseY: number, pathName?: string, pointIndex = 2) => {
    console.log('[PPRectangle] addDotToRectangle currentAnnotation:', props.currentAnnotation?.result, 'label color:', props.currentLabel?.color);
    if (!props.currentAnnotation || !props.currentAnnotation.result || !props.currentLabel?.color) return;
    let result = '';
    if (pathName === '/project/:id/label/ocr') {
      const data = props.currentAnnotation.result?.split('||');
      if (!data) return;
      const results2 = data[0].split('|');
      if (results2.length < 4) {
        result = results2.join('|') + `|${mouseX}|${mouseY}` + '||' + data[1];
      } else {
        if (pointIndex === 2) { results2[2] = mouseX + ''; results2[3] = mouseY + ''; }
        else { results2[0] = mouseX + ''; results2[1] = mouseY + ''; }
        result = results2.join('|') + '||' + data[1];
      }
    } else {
      if (props.currentAnnotation.result.length < 4) {
        result = props.currentAnnotation.result + `,${mouseX},${mouseY}`;
      } else {
        const results = props.currentAnnotation.result.split(',');
        if (pointIndex === 2) { results[2] = mouseX + ''; results[3] = mouseY + ''; }
        else { results[0] = mouseX + ''; results[1] = mouseY + ''; }
        result = results.join(',');
      }
    }
    props.onAnnotationModify({ ...props.currentAnnotation, result });
    if (props.ChanegeTool && props.preTool) props.ChanegeTool(props.preTool);
    if (props.onMouseUp) props.onMouseUp();
  };

  let isClick = false;

  const OnMouseDown = (param: EvtProps) => {
    isClick = true;
    if (props.currentTool === 'rectangle' || props.currentTool === 'editor') {
      const mouseX = param.mouseX;
      const mouseY = param.mouseY;
      if (!props.currentAnnotation) {
        console.log('[PPRectangle] Creating new rectangle at', mouseX, mouseY, 'currentLabel:', props.currentLabel);
        startNewRectangle(mouseX, mouseY, param.pathName);
      }
      if (props.onMouseDown) props.onMouseDown();
    }
  };

  const OnMousemove = (_param: EvtProps) => {
    // handled in PPStage
  };

  const OnMouseUp = (param: EvtProps) => {
    console.log('[PPRectangle] OnMouseUp currentTool:', props.currentTool, 'isClick:', isClick, 'pointIndex:', param.pointIndex);
    if (props.currentTool !== 'rectangle' && props.currentTool !== 'editor' && isClick) return;
    isClick = false;
    const mouseX = param.mouseX;
    const mouseY = param.mouseY;
    if (param.pointIndex) {
      addDotToRectangle(mouseX, mouseY, param.pathName, param.pointIndex as number);
    } else {
      addDotToRectangle(mouseX, mouseY, param.pathName);
    }
    if (param.onPointIndex) param.onPointIndex(null);
  };

  return {
    onMouseDown: OnMouseDown,
    onMouseMove: OnMousemove,
    onMouseUp: OnMouseUp,
    drawAnnotation: drawRectangle,
    drawGuidewires,
  };
}
