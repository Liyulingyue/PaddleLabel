import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Line, Transformer } from 'react-konva';
import { useToolStore } from '@/stores/toolStore';
import { useLabelStore } from '@/stores/labelStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import type { Annotation, Data, Label } from '@/types';
import type Konva from 'konva';

interface PPStageProps {
  image: HTMLImageElement | null;
  imageUrl: string;
  data: Data | null;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Omit<Annotation, 'annotation_id'>) => void;
  onAnnotationUpdate: (frontendId: number, updates: Partial<Annotation>) => void;
  onAnnotationRemove: (frontendId: number) => void;
  onSave: () => void;
}

interface Point {
  x: number;
  y: number;
}

export default function PPStage({
  image,
  imageUrl,
  data,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationRemove,
  onSave,
}: PPStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageRef = useRef<Konva.Image>(null);

  const { currentTool, brushSize } = useToolStore();
  const { selectedLabel, labels } = useLabelStore();

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('ppstage-container');
      if (container) {
        setContainerSize({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (image && imageRef.current) {
      const stage = stageRef.current;
      if (!stage) return;

      const scaleX = stage.width() / image.width;
      const scaleY = stage.height() / image.height;
      const newScale = Math.min(scaleX, scaleY, 1);

      setScale(newScale);
      setPosition({
        x: (stage.width() - image.width * newScale) / 2,
        y: (stage.height() - image.height * newScale) / 2,
      });
    }
  }, [image]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawing(false);
        setCurrentPoints([]);
        setStartPoint(null);
        setSelectedId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId !== null) {
          onAnnotationRemove(selectedId as number);
          setSelectedId(null);
        }
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onAnnotationRemove, onSave]);

  const getPointerPosition = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale,
    };
  }, [position, scale]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectedLabel && currentTool !== 'mover') {
      alert('Please select a label first');
      return;
    }

    const pos = getPointerPosition();
    if (!pos) return;

    if (currentTool === 'mover') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    if (currentTool === 'rectangle') {
      setDrawing(true);
      setStartPoint(pos);
    } else if (currentTool === 'polygon' || currentTool === 'brush') {
      setDrawing(true);
      setCurrentPoints([...currentPoints, pos]);
    }
  }, [currentTool, selectedLabel, currentPoints, getPointerPosition]);

  const handleMouseMove = useCallback(() => {
    if (!drawing) return;
    const pos = getPointerPosition();
    if (!pos) return;

    if (currentTool === 'rectangle' && startPoint) {
      // Rectangle preview handled in render
    } else if (currentTool === 'polygon' || currentTool === 'brush') {
      setCurrentPoints([...currentPoints, pos]);
    }
  }, [drawing, currentTool, startPoint, currentPoints, getPointerPosition]);

  const handleMouseUp = useCallback(() => {
    if (!drawing) return;
    const pos = getPointerPosition();

    if (currentTool === 'rectangle' && startPoint && pos) {
      const x = Math.min(startPoint.x, pos.x);
      const y = Math.min(startPoint.y, pos.y);
      const width = Math.abs(pos.x - startPoint.x);
      const height = Math.abs(pos.y - startPoint.y);

      if (width > 5 && height > 5 && selectedLabel) {
        const labelId = selectedLabel.label_id || selectedLabel.id;
        if (labelId) {
          onAnnotationAdd({
            frontend_id: Date.now(),
            data_id: data?.data_id || 0,
            label_id: labelId as number,
            result: JSON.stringify({ x, y, width, height }),
            type: 'rectangle',
          });
        }
      }
    }

    setDrawing(false);
    setStartPoint(null);
  }, [drawing, currentTool, startPoint, selectedLabel, data, onAnnotationAdd, getPointerPosition]);

  const handlePolygonComplete = useCallback(() => {
    if (currentPoints.length >= 3 && selectedLabel) {
      const labelId = selectedLabel.label_id || selectedLabel.id;
      if (labelId) {
        onAnnotationAdd({
          frontend_id: Date.now(),
          data_id: data?.data_id || 0,
          label_id: labelId as number,
          result: JSON.stringify({ points: currentPoints.map(p => [p.x, p.y]) }),
          type: 'polygon',
        });
      }
    }
    setCurrentPoints([]);
    setDrawing(false);
  }, [currentPoints, selectedLabel, data, onAnnotationAdd]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, [scale, position]);

  const handleShapeClick = useCallback((annotation: Annotation) => {
    if (currentTool === 'mover') {
      setSelectedId(annotation.frontend_id);
    }
  }, [currentTool]);

  const handleShapeDragEnd = useCallback((annotation: Annotation, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const result = JSON.parse(annotation.result);

    if (annotation.type === 'rectangle') {
      result.x = node.x();
      result.y = node.y();
    } else if (annotation.type === 'polygon' && result.points) {
      const dx = node.x();
      const dy = node.y();
      result.points = result.points.map((p: number[]) => [p[0] + dx, p[1] + dy]);
      node.position({ x: 0, y: 0 });
    }

    onAnnotationUpdate(annotation.frontend_id, { result: JSON.stringify(result) });
  }, [onAnnotationUpdate]);

  const getLabelColor = (labelId: number) => {
    const label = labels.find(l => (l.label_id || l.id) === labelId);
    return label?.color || '#ff4d4f';
  };

  const renderAnnotation = (annotation: Annotation) => {
    const color = getLabelColor(annotation.label_id);
    const isSelected = selectedId === annotation.frontend_id;

    try {
      const result = JSON.parse(annotation.result);

      if (annotation.type === 'rectangle') {
        return (
          <Rect
            key={annotation.frontend_id}
            x={result.x * scale + position.x}
            y={result.y * scale + position.y}
            width={result.width * scale}
            height={result.height * scale}
            stroke={color}
            strokeWidth={2}
            fill={`${color}33`}
            draggable={currentTool === 'mover'}
            onClick={() => handleShapeClick(annotation)}
            onTap={() => handleShapeClick(annotation)}
            onDragEnd={(e) => handleShapeDragEnd(annotation, e)}
          />
        );
      }

      if (annotation.type === 'polygon') {
        const points = result.points.flat().map((p: number, i: number) =>
          i % 2 === 0 ? p * scale + position.x : p * scale + position.y
        );
        return (
          <Line
            key={annotation.frontend_id}
            points={points}
            stroke={color}
            strokeWidth={2}
            fill={`${color}33`}
            closed
            draggable={currentTool === 'mover'}
            onClick={() => handleShapeClick(annotation)}
            onTap={() => handleShapeClick(annotation)}
            onDragEnd={(e) => handleShapeDragEnd(annotation, e)}
          />
        );
      }

      if (annotation.type === 'brush' && result.points) {
        const points = result.points.flat().map((p: number, i: number) =>
          i % 2 === 0 ? p * scale + position.x : p * scale + position.y
        );
        return (
          <Line
            key={annotation.frontend_id}
            points={points}
            stroke={color}
            strokeWidth={(result.size || 5) * scale}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
          />
        );
      }
    } catch {
      return null;
    }

    return null;
  };

  const renderPreview = () => {
    if (!drawing) return null;
    const color = selectedLabel?.color || '#ff4d4f';

    if (currentTool === 'rectangle' && startPoint) {
      const stage = stageRef.current;
      if (!stage) return null;
      const pos = stage.getPointerPosition();
      if (!pos) return null;

      const scaledPos = {
        x: (pos.x - position.x) / scale,
        y: (pos.y - position.y) / scale,
      };

      const x = Math.min(startPoint.x, scaledPos.x) * scale + position.x;
      const y = Math.min(startPoint.y, scaledPos.y) * scale + position.y;
      const width = Math.abs(scaledPos.x - startPoint.x) * scale;
      const height = Math.abs(scaledPos.y - startPoint.y) * scale;

      return (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={color}
          strokeWidth={2}
          fill={`${color}33`}
          dash={[5, 5]}
        />
      );
    }

    if ((currentTool === 'polygon' || currentTool === 'brush') && currentPoints.length > 0) {
      const points = currentPoints.flatMap(p => [
        p.x * scale + position.x,
        p.y * scale + position.y,
      ]);
      return (
        <Line
          points={points}
          stroke={color}
          strokeWidth={currentTool === 'brush' ? brushSize * scale : 2}
          tension={currentTool === 'brush' ? 0.5 : 0}
          lineCap="round"
          lineJoin="round"
        />
      );
    }

    return null;
  };

  return (
    <div
      id="ppstage-container"
      style={{
        width: '100%',
        height: '100%',
        background: '#f0f0f0',
        overflow: 'hidden',
        cursor: currentTool === 'mover' ? 'grab' : 'crosshair',
      }}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
      >
        <Layer ref={layerRef}>
          {image && (
            <KonvaImage
              ref={imageRef}
              image={image}
              width={image.width}
              height={image.height}
            />
          )}
          {annotations.map(renderAnnotation)}
          {renderPreview()}
        </Layer>
      </Stage>

      {currentTool === 'polygon' && drawing && currentPoints.length >= 3 && (
        <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)' }}>
          <button
            className="ant-btn ant-btn-primary"
            onClick={handlePolygonComplete}
          >
            Complete Polygon
          </button>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'white', padding: 4, borderRadius: 4 }}>
        <span>Zoom: {Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
}
