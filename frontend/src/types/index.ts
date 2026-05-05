export interface Project {
  project_id: number;
  name: string;
  description?: string;
  task_category_id: number;
  data_dir: string;
  labels: Label[];
  tasks?: Task[];
  other_settings?: Record<string, any>;
  created?: string;
  modified?: string;
  upid?: string;
}

export interface Task {
  task_id: number;
  project_id: number;
  data_paths: string[];
  set: number;
  datas?: Data[];
  annotations?: Annotation[];
  modified?: string;
  created?: string;
}

export interface Data {
  data_id: number;
  task_id: number;
  path: string;
  size: string;
  predicted?: boolean;
  sault?: string;
}

export interface Annotation {
  annotation_id?: number;
  frontend_id: number;
  data_id: number;
  label_id: number;
  label?: Label;
  result: string;
  type: 'rectangle' | 'polygon' | 'brush' | 'rubber' | 'ocr_polygon';
  predicted_by?: string;
}

export interface Label {
  label_id?: number;
  project_id?: number;
  id?: number;
  name: string;
  color: string;
  comment?: string;
  super_category_id?: number;
}

export interface Tag {
  tag_id?: number;
  project_id: number;
  name: string;
  color?: string;
  comment?: string;
}

export interface User {
  user_id?: number;
  username: string;
  token?: string;
}

export type TaskCategory = {
  task_category_id: number;
  name: 'classification' | 'detection' | 'semantic_segmentation' | 'instance_segmentation' | 'optical_character_recognition' | 'point';
  handler: string;
};

export type ToolType = 'rectangle' | 'polygon' | 'brush' | 'rubber' | 'mover' | 'editor' | 'interactor';

export interface RectangleResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonResult {
  points: number[][];
}

export interface BrushResult {
  points: number[][];
  size: number;
}

export type AnnotationResult = RectangleResult | PolygonResult | BrushResult;
