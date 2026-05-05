import { forwardRef, useEffect, useRef, useState, useImperativeHandle, useCallback } from 'react';
import { Layer, Stage, Image as KonvaImage } from 'react-konva';
import { message } from 'antd';
import useImage from 'use-image';
import type { Annotation, Label, ToolType } from '@/services/types';
import type { PPDrawToolRet, PPRenderFuncProps } from '../PPDrawTool/drawUtils';
import PPRectangle from '../PPDrawTool/PPRectangle';
import PPPolygon from '../PPDrawTool/PPPolygon';
import PPBrush from '../PPDrawTool/PPBrush';
import PPInteractor from '../PPDrawTool/PPInteractor';
import type Konva from 'konva';

export type pageRef = {
  image: HTMLImageElement | undefined;
  scaleImage?: number;
  setDragEndPos?: (pos: { x: number; y: number }) => void;
};

export type PPStageProps = {
  imgSrc?: string;
  scale: number;
  annotations?: Annotation[];
  currentTool: ToolType;
  currentAnnotation?: Annotation;
  currentLabel?: Label;
  labels?: Label[];
  setCurrentAnnotation: (annotation: Annotation | undefined) => void;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationModify: (annotation: Annotation) => void;
  onAnnotationModifyComplete?: () => void;
  onAnnotationModifyUP?: (annotation: Annotation) => void;
  transparency?: number;
  threshold?: number;
  drawTool?: { polygon?: PPDrawToolRet; rectangle?: PPDrawToolRet; brush?: PPDrawToolRet; rubber?: PPDrawToolRet; interactor?: PPDrawToolRet };
  hideLabel?: number[];
  frontendIdOps?: { frontendId: number; setFrontendId: (id: number) => void };
  refresh?: number;
  image?: HTMLImageElement | undefined;
  tool?: { curr: ToolType; setCurr: (tool: ToolType) => void };
  scaleChange?: (scale: number) => void;
  taskIndex?: number;
  brushSize?: number;
  annotationDelete?: (annotations: Annotation[] | undefined) => void;
  onMousepoint?: () => void;
  onMousepoint2?: () => void;
  ChanegeTool?: (tool: string) => void;
  preTools?: string;
  changePreTools?: (tool: string) => void;
  interactorData?: { active: boolean; mousePoints: number[][]; predictData: number[][] };
  radius?: number;
  pathName?: string;
};

function getPointer(toolType: ToolType) {
  switch (toolType) {
    case 'mover': return 'move';
    case 'rectangle':
    case 'polygon': return 'crosshair';
    default: return 'default';
  }
}

function makearc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _s: number, _e: number, color: string) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

const PPStage = forwardRef<pageRef, PPStageProps>((props, ref) => {
  const [image] = useImage(props.imgSrc || '', 'anonymous');
  const transparency = props.transparency === undefined ? 0 : props.transparency * 0.01;

  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [imageWidth, setImageWidth] = useState(1);
  const [imageHeight, setImageHeight] = useState(1);
  const [shapes, setShapes] = useState<React.ReactElement[]>([]);
  const [dragEndPos, setDragEndPos] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [pointArr, setPointArr] = useState<{ x: number; y: number }[]>([]);
  const [isClick, setIsClick] = useState(false);
  const [flags, setFlags] = useState(true);
  const [frist, setFrist] = useState(true);
  const [pointIndex, setPointIndex] = useState<number | null>(null);
  const [refoce, setRefoce] = useState(0);
  const [DrawingSurfaceImageData, setDrawingSurfaceImageData] = useState<ImageData>();

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const canvasRef3 = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    image,
    setDragEndPos,
  }));

  // Native mousemove listener for real-time drawing preview
  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    const nativeOnMouseMove = (e: MouseEvent) => {
      if (props.currentTool === 'rectangle' || props.currentTool === 'editor') {
        const rect = container.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - dragEndPos.x - canvasWidth / 2) / props.scale + imageWidth / 2;
        const mouseY = (e.clientY - rect.top - dragEndPos.y - canvasHeight / 2) / props.scale + imageHeight / 2;
        if (isClick) {
          renderReact({ x: mouseX, y: mouseY });
        }
      }
    };
    container.addEventListener('mousemove', nativeOnMouseMove);
    return () => container.removeEventListener('mousemove', nativeOnMouseMove);
  }, [props.currentTool, isClick, dragEndPos, canvasWidth, canvasHeight, imageWidth, imageHeight, props.scale]);

  // Window resize
  useEffect(() => {
    const handleResize = () => {
      const parent = document.getElementById('dr');
      if (parent) {
        setCanvasWidth(parent.clientWidth);
        setCanvasHeight(parent.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate initial scale
  useEffect(() => {
    if (canvasHeight && canvasWidth && image && typeof image !== 'string' && props.scaleChange && props.taskIndex !== undefined) {
      const zoomlevel = canvasWidth / image.width;
      const zoomlevel2 = canvasHeight / image.height;
      let scaleImages2 = 0;
      if (zoomlevel > 1 && zoomlevel2 > 1) {
        scaleImages2 = zoomlevel > zoomlevel2 ? canvasHeight / image.height : canvasWidth / image.width;
      } else {
        scaleImages2 = zoomlevel > zoomlevel2 ? canvasHeight / image.height : canvasWidth / image.width;
      }
      props.scaleChange(scaleImages2);
      setImageHeight(image.height);
      setImageWidth(image.width);
    }
  }, [canvasHeight, canvasWidth, image]);

  // Save drawing surface
  useEffect(() => {
    if (canvasRef.current?.width && canvasRef.current?.height) {
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        setDrawingSurfaceImageData(data);
      }
    }
  }, [canvasRef.current?.width, canvasRef.current?.height]);

  // Cursor and ctx3 clear
  useEffect(() => {
    if (stageRef.current) stageRef.current.container().style.cursor = getPointer(props.currentTool);
    const ctx3 = canvasRef3.current?.getContext('2d', { willReadFrequently: true });
    if (ctx3) ctx3.clearRect(0, 0, ctx3.canvas.width, ctx3.canvas.height);
    setIsClick(false);
  }, [props.currentTool]);

  const renderReact = useCallback((endPos: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const width = Math.abs(startPos.x - endPos.x);
    const height = Math.abs(startPos.y - endPos.y);
    ctx.beginPath();
    if (endPos.x >= startPos.x) {
      if (endPos.y >= startPos.y) ctx.rect(startPos.x, startPos.y, width, height);
      else ctx.rect(startPos.x, startPos.y, width, -height);
    } else {
      if (endPos.y >= startPos.y) ctx.rect(startPos.x, startPos.y, -width, height);
      else ctx.rect(startPos.x, startPos.y, -width, -height);
    }
    ctx.strokeStyle = 'red';
    ctx.stroke();
    layerRef.current?.batchDraw();
  }, [startPos]);

  const restoreDrawingSurface = useCallback((data: ImageData | undefined) => {
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (ctx && data) ctx.putImageData(data, 0, 0);
  }, []);

  const renderShape = useCallback(() => {
    const newShapes: React.ReactElement[] = [];
    const param: PPRenderFuncProps = {
      annotation: {} as Annotation,
      onDrag: props.onAnnotationModify,
      onDragEnd: () => {},
      scale: props.scale,
      currentTool: props.currentTool,
      onSelect: props.setCurrentAnnotation,
      onPointIndex: setPointIndex,
      stageRef,
      layerRef,
      currentAnnotation: props.currentAnnotation,
      annotations: props.annotations,
      transparency,
      threshold: props.threshold,
      canvasRef,
      canvasRef2,
      interactorData: props.interactorData,
      label: props.currentLabel,
      radius: props.radius,
      pathName: props.pathName,
      ChanegeTool: props.ChanegeTool,
      pointIndex,
      canvasWidth: imageWidth,
      canvasHeight: imageHeight,
    };

    props.annotations?.forEach((annotation) => {
      const flagss = annotation.labelId != null && props.hideLabel?.includes(annotation.labelId);
      if (!annotation || flagss) return;
      param.annotation = annotation;

      let shape: React.ReactElement | null | undefined = null;
      if (annotation.type === 'polygon' || annotation.type === 'ocr_polygon') {
        const flag = flags || props.currentAnnotation?.result !== annotation.result;
        shape = props.drawTool?.polygon?.drawAnnotation(param, flag);
      } else if (annotation.type === 'rectangle' || annotation.type === 'ocr_rectangle') {
        shape = props.drawTool?.rectangle?.drawAnnotation(param);
      } else if (annotation.type === 'brush') {
        shape = props.drawTool?.brush?.drawAnnotation(param);
        layerRef.current?.batchDraw();
      } else if (annotation.type === 'rubber') {
        shape = props.drawTool?.rubber?.drawAnnotation(param);
        layerRef.current?.batchDraw();
      }
      if (shape && shape.key !== null) newShapes.push(shape);
    });
    setShapes(newShapes);
  }, [props.annotations, props.currentAnnotation, flags, props.currentTool, props.hideLabel, props.scale, transparency]);

  useEffect(() => {
    if (!stageRef.current) return;
    layerRef.current?.batchDraw();
  }, [props.drawTool, layerRef]);

  useEffect(() => {
    if (props.annotations) {
      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
      const ctx2 = canvasRef2.current?.getContext('2d', { willReadFrequently: true });
      const ctx3 = canvasRef3.current?.getContext('2d', { willReadFrequently: true });
      if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      if (ctx2) ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
      if (ctx3) ctx3.clearRect(0, 0, ctx3.canvas.width, ctx3.canvas.height);
      if (frist) {
        setTimeout(() => { renderShape(); setFrist(false); }, 500);
      } else {
        renderShape();
      }
    }
  }, [props.annotations, props.currentAnnotation, flags, props.currentTool, props.hideLabel]);

  useEffect(() => {
    layerRef.current?.batchDraw();
  }, [shapes]);

  const getEvtParam = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const mouseX = (e.evt.offsetX - dragEndPos.x - canvasWidth / 2) / props.scale + imageWidth / 2;
    const mouseY = (e.evt.offsetY - dragEndPos.y - canvasHeight / 2) / props.scale + imageHeight / 2;
    return {
      e,
      mouseX,
      mouseY,
      offsetX: -imageWidth / 2,
      offsetY: -imageHeight / 2,
      canvasRef,
      stageRef,
      img: image,
      pointIndex,
      onPointIndex: setPointIndex,
      pathName: props.pathName,
      currentAnnotation: props.currentAnnotation,
      flags,
    };
  };

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isDrawTool = ['rectangle', 'polygon', 'brush'].includes(props.currentTool as string);
    if (isDrawTool && !props.currentLabel) {
      message.warning('Please select a label first');
      return;
    }
    if (e.evt.button === 1) {
      if (props.currentTool === 'polygon') {
        props.changePreTools?.('polygon');
        props.tool?.setCurr('mover');
        return;
      }
      props.onMousepoint?.();
      return;
    }
    setIsClick(true);
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    const mouseX = (e.evt.offsetX - dragEndPos.x - canvasWidth / 2) / props.scale + imageWidth / 2;
    const mouseY = (e.evt.offsetY - dragEndPos.y - canvasHeight / 2) / props.scale + imageHeight / 2;

    if (props.currentTool === 'polygon') {
      if (e.evt.button === 2) {
        if (props.annotationDelete) {
          if (props.currentAnnotation?.result && props.currentAnnotation.result.split(',').length < 5) {
            props.annotationDelete(props.annotations?.filter(i => i.result !== props.currentAnnotation?.result));
          } else {
            props.annotationDelete(props.annotations);
          }
        }
        props.setCurrentAnnotation(undefined);
        setPointArr([]);
        if (!flags) setFlags(true);
      } else {
        if (pointIndex !== null && props.currentAnnotation && flags) {
          const newAnno = { ...props.currentAnnotation };
          const newAnnos = props.currentAnnotation.result?.split(',');
          if (!newAnnos) return;
          const starts = newAnnos.slice(pointIndex + 1, newAnnos.length);
          const ends = newAnnos.slice(0, pointIndex - 1);
          const finly = [...starts, ...ends];
          newAnno.result = finly.join(',');
          if (flags) setFlags(false);
          props.onAnnotationModify(newAnno);
          setPointArr(finly.map((v, i) => ({ x: Number(finly[i % 2 === 0 ? i : i - (i % 2 === 0 ? 0 : 1)]), y: Number(finly[i % 2 === 1 ? i : i + 1]) })).filter((_, i) => i % 2 === 0).map((_, i) => ({ x: Number(finly[i * 2]), y: Number(finly[i * 2 + 1]) })));
        } else {
          const evtParam = getEvtParam(e);
          (evtParam as any).currentAnnotation = props.currentAnnotation;
          props.drawTool?.polygon?.onMouseDown(evtParam);
          if (flags) setFlags(false);
          setPointArr([...pointArr, { x: mouseX, y: mouseY }]);
        }
      }
    } else if (props.currentTool === 'rectangle') {
      setStartPos({ x: mouseX, y: mouseY });
      props.drawTool?.rectangle?.onMouseDown(getEvtParam(e));
    } else if (props.currentTool === 'brush' || props.currentTool === 'rubber') {
      const evtParam = getEvtParam(e);
      (evtParam as any).currentAnnotation = props.currentAnnotation;
      props.drawTool?.brush?.onMouseDown?.(evtParam);
      if (isClick && ctx && props.brushSize) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = props.brushSize;
        ctx.strokeStyle = props.currentTool === 'brush' ? (props.currentLabel?.color || 'blue') : 'rgba(0,0,0,0)';
        ctx.moveTo(mouseX, mouseY);
        layerRef.current?.batchDraw();
      }
    } else {
      props.drawTool?.rectangle?.onMouseDown?.(getEvtParam(e));
      if (e.evt.button === 2) props.onMousepoint2?.();
    }
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const mouseX = (e.evt.offsetX - dragEndPos.x - canvasWidth / 2) / props.scale + imageWidth / 2;
    const mouseY = (e.evt.offsetY - dragEndPos.y - canvasHeight / 2) / props.scale + imageHeight / 2;
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    const ctx3 = canvasRef3.current?.getContext('2d', { willReadFrequently: true });

    if (props.currentTool === 'rectangle' || props.currentTool === 'editor') {
      if (ctx && DrawingSurfaceImageData) {
        restoreDrawingSurface(DrawingSurfaceImageData);
        props.drawTool?.rectangle?.drawGuidewires?.(mouseX, mouseY, ctx);
        if (isClick) renderReact({ x: mouseX, y: mouseY });
      }
      setRefoce(refoce + 1);
    } else if (props.currentTool === 'polygon' && ctx3 && !flags) {
      ctx3.strokeStyle = props.currentLabel?.color || 'red';
      ctx3.lineWidth = 4;
      makearc(ctx3, mouseX, mouseY, 4, 0, 180, props.currentLabel?.color || 'red');
      if (pointArr.length > 0) {
        ctx3.beginPath();
        ctx3.moveTo(pointArr[0].x, pointArr[0].y);
        for (let i = 1; i < pointArr.length; i++) ctx3.lineTo(pointArr[i].x, pointArr[i].y);
        ctx3.lineTo(mouseX, mouseY);
        ctx3.fillStyle = props.currentLabel?.color || 'red';
        ctx3.fill();
        ctx3.stroke();
        layerRef.current?.batchDraw();
      }
    } else if (props.currentTool === 'brush' || props.currentTool === 'rubber') {
      if (isClick && ctx && props.brushSize) {
        makearc(ctx3!, mouseX, mouseY, props.brushSize / 2, 0, 180, 'white');
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = props.currentTool === 'brush' ? (props.currentLabel?.color || 'blue') : '#ccc';
        ctx.stroke();
        layerRef.current?.batchDraw();
      } else {
        makearc(ctx3!, mouseX, mouseY, (props.brushSize || 10) / 2, 0, 180, 'white');
        layerRef.current?.batchDraw();
      }
    }
    props.drawTool?.polygon?.onMouseMove?.(getEvtParam(e));
    props.drawTool?.brush?.onMouseMove?.(getEvtParam(e));
  };

  const onMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 && props.preTools) {
      props.tool?.setCurr(props.preTools as ToolType);
      return;
    }
    setIsClick(false);
    props.drawTool?.rectangle?.onMouseUp?.(getEvtParam(e));
    props.drawTool?.polygon?.onMouseUp?.(getEvtParam(e));
    props.drawTool?.brush?.onMouseUp?.(getEvtParam(e));
    const ctx3 = canvasRef3.current?.getContext('2d', { willReadFrequently: true });
    if (ctx3) ctx3.clearRect(0, 0, ctx3.canvas.width, ctx3.canvas.height);
  };

  const onContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
  };

  const draggable = props.currentTool === 'mover';

  return (
    <div data-test-id="stage-container" data-label-length={props.annotations?.length || 0} data-image-src={props.imgSrc}>
      <canvas style={{ display: 'none' }} ref={canvasRef} width={imageWidth} height={imageHeight} />
      <canvas style={{ display: 'none' }} ref={canvasRef2} width={imageWidth} height={imageHeight} />
      <canvas style={{ display: 'none' }} ref={canvasRef3} width={imageWidth} height={imageHeight} />

      <Stage
        width={canvasWidth}
        height={canvasHeight}
        offsetX={-canvasWidth / 2}
        offsetY={-canvasHeight / 2}
        className="stage"
        ref={stageRef}
        draggable={draggable}
        onDragEnd={(evt) => {
          if (props.currentTool === 'mover') {
            setDragEndPos({ x: evt.target.x(), y: evt.target.y() });
          }
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onContextMenu={onContextMenu}
        x={dragEndPos.x}
        y={dragEndPos.y}
      >
        <Layer
          scaleX={props.scale}
          scaleY={props.scale}
          draggable={false}
        >
          <KonvaImage
            name="baseImage"
            draggable={false}
            image={image?.width === imageWidth ? image : undefined}
            x={-(imageWidth || 0) / 2}
            y={-(imageHeight || 0) / 2}
          />
        </Layer>
        <Layer
          ref={layerRef}
          name="annotation"
          scaleX={props.scale}
          scaleY={props.scale}
          opacity={transparency}
        >
          <KonvaImage
            x={-(imageWidth || 0) / 2}
            y={-(imageHeight || 0) / 2}
            displayName={refoce}
            image={canvasRef.current || undefined}
          />
          <KonvaImage
            x={-(imageWidth || 0) / 2}
            y={-(imageHeight || 0) / 2}
            displayName={refoce}
            image={canvasRef2.current || undefined}
          />
          <KonvaImage
            x={-(imageWidth || 0) / 2}
            y={-(imageHeight || 0) / 2}
            displayName={refoce}
            image={canvasRef3.current || undefined}
          />
          {shapes}
        </Layer>
      </Stage>
    </div>
  );
});

PPStage.displayName = 'PPStage';
export default PPStage;
