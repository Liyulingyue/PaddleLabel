export type ToolType = 'rectangle' | 'polygon' | 'brush' | 'rubber' | 'mover' | 'editor' | 'interactor' | undefined;

export interface Annotation {
  annotationId?: number;
  frontendId?: number;
  dataId?: number;
  taskId?: number;
  labelId?: number;
  label?: Label;
  result?: string;
  type?: 'rectangle' | 'polygon' | 'brush' | 'rubber' | 'ocr_polygon' | 'ocr_rectangle';
  predictedBy?: string;
  invisible?: boolean;
  delete?: boolean;
}

export interface Label {
  labelId?: number;
  projectId?: number;
  id?: number;
  name: string;
  color: string;
  comment?: string;
  superCategoryId?: number;
  active?: boolean;
  ith?: number;
}

export interface Project {
  projectId?: number;
  name?: string;
  description?: string;
  taskCategory?: TaskCategory;
  taskCategoryId?: number;
  dataDir?: string;
  labels?: Label[];
  tasks?: Task[];
  otherSettings?: ProjectOtherSettings;
  allOptions?: Record<string, string>;
  created?: string;
  modified?: string;
  upid?: string;
}

export interface TaskCategory {
  taskCategoryId?: number;
  name?: string;
  handler?: string;
}

export interface Task {
  taskId?: number;
  projectId?: number;
  dataPaths?: string[];
  set?: number;
  datas?: Data[];
  annotations?: Annotation[];
  annotationCount?: number;
  modified?: string;
  created?: string;
}

export interface Data {
  dataId?: number;
  taskId?: number;
  path?: string;
  size?: string;
  predicted?: boolean;
  sault?: string;
}

export interface Tag {
  tagId?: number;
  projectId?: number;
  name?: string;
  color?: string;
  comment?: string;
}

export interface User {
  userId?: number;
  username?: string;
  token?: string;
}

export interface InteractorData {
  active?: boolean;
  mousePoints: number[][];
  predictData: number[][];
}

export interface ProjectOtherSettings {
  mlBackendUrl?: string;
  modelName?: string;
  labelMapping?: { model: string; project: string }[];
  clasSubCatg?: 'singleClass' | 'multiClass';
  segMaskType?: string;
  [key: string]: any;
}

export interface Progress {
  finished: number;
  total: number;
}

export interface Model {
  name?: string;
  type?: string;
  labelNames?: string[];
  languages?: string[];
}

export interface Cache {
  cacheId?: string;
  content?: string;
}
