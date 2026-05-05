import { Circle, Group, Line } from 'react-konva';
import type { ReactElement } from 'react';
import type { EvtProps, PPDrawToolProps, PPDrawToolRet, PPRenderFuncProps } from './drawUtils';
import type { Annotation } from '@/services/types';
import { hexToRgb } from './drawUtils';

function getMaxId(annotations?: Annotation[]): number {
  let maxId = 0;
  if (!annotations) return maxId;
  for (const annotation of annotations) {
    if (!annotation || annotation.frontendId == null) continue;
    if (annotation.frontendId > maxId) maxId = annotation.frontendId;
  }
  return maxId;
}

function drawPolygon(props: PPRenderFuncProps, flag?: boolean, _offsetX?: number, _offsetY?: number): ReactElement {
  const annotation = props.annotation;
  if (!annotation || !annotation.result || annotation.result.length < 2 || !annotation.label?.color) return <></>;

  const points: number[] = annotation.result.split(',').map((item: string, index: number) => {
    const val = Number(item);
    return index % 2 === 0 ? val - props.canvasWidth / 2 : val - props.canvasHeight / 2;
  });

  const color = annotation.label.color;
  const rgb = hexToRgb(color);
  if (!rgb) return <></>;

  const selected = props.currentAnnotation?.frontendId == annotation.frontendId;
  const transparency = selected ? 0.5 : 0.2;
  let x: number | undefined;

  const pointElements: ReactElement[] = [];
  points.forEach((point, index) => {
    if (index % 2 === 0) { x = point; return; }
    pointElements.push(
      <Circle
        key={`dot-${index}`}
        onMouseDown={() => {
          if (props.currentTool !== 'rectangle') {
            if (props.ChanegeTool) props.ChanegeTool('polygon');
            props.onSelect(annotation);
            props.onPointIndex(index);
          }
        }}
        onDragEnd={(evt) => {
          evt.cancelBubble = true;
          points[index - 1] = evt.target.x();
          points[index] = evt.target.y();
          if (props.pathName === '/project/:id/label/ocr') {
            const strings = '||待识别|0|';
            const newdata = points.join('|') + strings;
            const newAnno = { ...annotation, result: newdata };
            if (props.onDragUP) props.onDragUP(newAnno);
          } else {
            const newAnno = { ...annotation, result: points.join(',') };
            if (props.onDragUP) props.onDragUP(newAnno);
          }
        }}
        onMouseOver={() => {
          if (props.stageRef?.current && props.currentTool !== 'rectangle')
            props.stageRef.current.container().style.cursor = 'cell';
          props.layerRef.current?.batchDraw();
        }}
        onMouseOut={() => {
          if (props.stageRef?.current) props.stageRef.current.container().style.cursor = 'default';
        }}
        x={x}
        y={point}
        radius={5 / props.scale}
        fill={color}
      />
    );
    x = undefined;
  });

  return (
    <Group key={annotation.frontendId} onClick={() => {
      if (props.currentTool === 'editor' || props.currentTool === 'mover') props.onSelect(annotation);
    }}>
      <Line
        stroke={color}
        strokeWidth={2 / props.scale}
        globalCompositeOperation="source-over"
        lineCap="round"
        points={points}
        tension={0}
        closed={flag}
        fill={`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${transparency})`}
      />
      {pointElements}
    </Group>
  );
}

export default function PPPolygon(props: PPDrawToolProps): PPDrawToolRet {
  const startNewPolygon = (mouseX: number, mouseY: number, selectFinly: Annotation | undefined, pathName?: string, annotations?: Annotation[]) => {
    const points = [mouseX, mouseY];
    let result = '';
    if (pathName === '/project/:id/label/ocr') {
      result = points.join('|') + '||待识别|0|';
    } else {
      result = points.join(',');
    }

    const anno: Annotation = {
      dataId: props.dataId,
      frontendId: selectFinly?.frontendId !== undefined ? selectFinly.frontendId : getMaxId(annotations) + 1,
      label: props.currentLabel,
      labelId: props.currentLabel?.labelId,
      result,
      type: pathName === '/project/:id/label/ocr' ? 'ocr_polygon' : 'polygon',
    };
    props.onAnnotationAdd(anno);
  };

  const addDotToPolygon = (mouseX: number, mouseY: number, pathName?: string, currentAnnotation?: Annotation) => {
    if (!currentAnnotation || !currentAnnotation.result || !props.currentLabel?.color) return;
    let result = '';
    if (pathName === '/project/:id/label/ocr') {
      const data = currentAnnotation.result?.split('||');
      if (!data) return;
      result = data[0] + `|${mouseX}|${mouseY}` + '||' + data[1];
    } else {
      result = currentAnnotation.result + `,${mouseX},${mouseY}`;
    }
    props.onAnnotationModify({ ...currentAnnotation, result });
  };

  const OnMouseDown = (param: EvtProps) => {
    if (props.currentTool !== 'polygon') return;
    const mouseX = param.mouseX;
    const mouseY = param.mouseY;
    const currentAnno = (param as any).currentAnnotation ?? props.currentAnnotation;
    if (param.flags) {
      startNewPolygon(mouseX, mouseY, props.selectFinly, param.pathName, props.annotations);
    } else {
      addDotToPolygon(mouseX, mouseY, param.pathName, currentAnno);
    }
    if (props.onMouseDown) props.onMouseDown();
  };

  const OnMousemove = (_param: EvtProps) => {};

  const OnMouseUp = (param: EvtProps) => {
    if (props.ChanegeTool && props.preTool) props.ChanegeTool(props.preTool);
    if (props.currentTool !== 'polygon') return;
    if (props.onMouseUp) props.onMouseUp();
  };

  return {
    onMouseDown: OnMouseDown,
    onMouseMove: OnMousemove,
    onMouseUp: OnMouseUp,
    drawAnnotation: drawPolygon,
  };
}
