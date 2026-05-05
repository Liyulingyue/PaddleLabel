/* eslint-disable @typescript-eslint/no-explicit-any */
import { message } from 'antd';
import { ProjectApi, TaskApi, DataApi, AnnotationApi, LabelApi, ManageApi, RpcApi } from './api';
import type { Project, Task, Data, Annotation, Label, ToolType } from './types';
import { HistoryUtils } from './history';
import { ModelApi } from './mlApi';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const getRandomColor = () => {
  const rgb = [];
  for (let i = 0; i < 3; ++i) {
    let color = Math.floor(Math.random() * 256).toString(16);
    color = color.length == 1 ? '0' + color : color;
    rgb.push(color);
  }
  return '#' + rgb.join('');
};

export const createInfo: Record<string, { name: string; avatar: string; id: number; labelFormats: any }> = {
  classification: { name: 'Classification', avatar: './pics/classification.jpg', id: 1, labelFormats: { single_class: 'Single Class', multi_class: 'Multi Class' } },
  detection: { name: 'Detection', avatar: './pics/object_detection.jpg', id: 2, labelFormats: { coco: 'COCO', voc: 'VOC', yolo: 'YOLO' } },
  semanticSegmentation: { name: 'Semantic Segmentation', avatar: './pics/semantic_segmentation.jpg', id: 3, labelFormats: { mask: 'Mask', coco: 'Polygon', eiseg: '' } },
  instanceSegmentation: { name: 'Instance Segmentation', avatar: './pics/instance_segmentation.jpg', id: 4, labelFormats: { mask: 'Mask', coco: 'Polygon', eiseg: '' } },
  opticalCharacterRecognition: { name: 'OCR', avatar: './pics/ocr.png', id: 7, labelFormats: { txt: 'txt' } },
};

export const toDict = (arr: any[]) => arr == undefined ? [] : JSON.parse(JSON.stringify(arr));

export function snake2camel(name: string) {
  if (!name) return name;
  return name.toLowerCase().replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
}

export function camel2snake(name: string) {
  if (!name) return name;
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export const indexOf = (item: any, arr: any[], key: string) => {
  if (!key) return undefined;
  const toFind = typeof item == 'number' ? item : item[key];
  for (let idx = 0; idx < arr.length; idx++) {
    if (toFind == arr[idx][key]) return idx;
  }
  return undefined;
};

export async function getVersion() {
  try {
    return await ManageApi.getVersion();
  } catch {
    message.error('Backend unavailable, please make sure backend is running and check your internet connection.');
    return false;
  }
}

export function getQueryVariable(name: string, url = window.location.href) {
  const filteredName = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + filteredName + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

export function projectHistory(projectId: number, taskId: number) {
  const str = localStorage.getItem('projectHistory');
  const newData = str ? { ...JSON.parse(str), [projectId]: taskId } : { [projectId]: taskId };
  localStorage.setItem('projectHistory', JSON.stringify(newData));
}

export function LoadingUtils(useState: <S>(initial?: S | (() => S)) => [S, any]) {
  const [curr, setCurr] = useState(false);
  return { curr, setCurr };
}

export function ScaleUtils(useState: <S>(initial?: S | (() => S)) => [S, any], range: number[] = [0.1, 15]) {
  const [curr, setCurr] = useState(1);
  function setScale(scale: number) {
    let s = scale;
    if (s < range[0]) { s = range[0]; message.error(`Smallest scale: ${range[0]}`); }
    if (s > range[1]) { s = range[1]; message.error(`Largest scale: ${range[1]}`); }
    setCurr(s);
  }
  function change(delta: number) { setScale(curr + delta); }
  return { curr, change, setScale, setCurr };
}

export function ToolUtils(useState: <S>(initial?: S | (() => S)) => [S, any], { defaultTool }: { defaultTool: ToolType }) {
  const [curr, setCurr] = useState<ToolType>(defaultTool);
  return { curr, setCurr };
}

export function ProjectUtils(useState: <S>(initial?: S | (() => S)) => [S, any]) {
  const [all, setAll] = useState<Project[]>();
  const [curr, setCurr] = useState<Project>();
  const [finished, setFinished] = useState<number>();

  async function getAll(): Promise<Project[] | undefined> {
    try {
      const projects = await ProjectApi.getAll();
      setAll(projects);
      return projects;
    } catch (err) { console.error('project getAll err', err); return; }
  }

  async function getCurr(projectId: number): Promise<Project | undefined> {
    try {
      const project = await ProjectApi.get(projectId);
      setCurr(project);
      return project;
    } catch (err) { console.error('project get err', err); return; }
  }

  async function remove(project: Project | number | string) {
    const projectId = typeof project === 'object' ? Number((project as Project).projectId) : Number(project);
    await ProjectApi.remove(projectId);
    getAll();
  }

  async function create(project: Project) {
    return await ProjectApi.create(project);
  }

  async function update(projectId: number, project: Project) {
    await ProjectApi.update(projectId, project);
  }

  async function getFinished(projectId?: number): Promise<number> {
    try {
      const pjId = projectId ?? curr?.projectId;
      if (!pjId) return 0;
      const stat = await ProjectApi.getProgress(pjId);
      if (!stat || stat.finished == undefined || stat.total == undefined) throw new Error('empty progress');
      setFinished(stat.finished);
      return stat.finished;
    } catch { return 0; }
  }

  async function predict(projectId: number, settings: object) {
    await ProjectApi.predict(projectId, settings);
  }

  function setAllPredicted(predicted: boolean, projectId: string) {
    ProjectApi.setAll(projectId, { dataPredicted: predicted });
  }

  async function splitDataset(props: { train: number; val: number; test: number }) {
    if (!curr?.projectId) return;
    try { await ProjectApi.splitDataset(curr.projectId, props); message.success('Dataset split successfully'); }
    catch { message.error('Dataset split failed'); }
  }

  return { all, getAll, curr, getCurr, remove, create, update, finished, getFinished, predict, setAllPredicted, splitDataset };
}

type labelUtilProps = { oneHot?: boolean; postSelect?: (label?: Label, activeIds?: Set<number>) => void; preUnsetCurr?: () => void };

export function LabelUtils(useState: <S>(initial?: S | (() => S)) => [S, any], { oneHot = true, postSelect, preUnsetCurr }: labelUtilProps) {
  const [all, setAll] = useState<Label[]>();
  const [curr, setCurrRaw] = useState<Label | undefined>();
  const [activeIds, setActiveIds] = useState(new Set<number>());
  const [isOneHot, setOneHot] = useState<boolean>(oneHot);

  async function getAll(projectId?: number): Promise<Label[] | undefined> {
    if (projectId == undefined) return;
    try {
      const labels = await ProjectApi.getLabels(projectId);
      setAll(labels);
      return labels;
    } catch { return; }
  }

  function onSelect(label: Label) {
    const lid = label.labelId;
    if (lid == null) return;
    let activeIdsTemp = activeIds;
    if (activeIds.has(lid)) {
      activeIds.delete(lid);
      setActiveIds(new Set(activeIds));
      activeIdsTemp = activeIds;
      if (curr?.labelId == lid) unsetCurr();
    } else {
      activeIdsTemp = setCurr(label);
    }
    if (postSelect) postSelect(label, activeIdsTemp);
  }

  function unsetCurr() {
    if (curr?.labelId != null) activeIds.delete(curr.labelId);
    setActiveIds(new Set(activeIds));
    if (preUnsetCurr) preUnsetCurr();
    setCurrRaw(undefined);
    return activeIds;
  }

  function setCurr(label: Label) {
    if (label == undefined) return unsetCurr();
    setCurrRaw(label);
    if (isOneHot) activeIds.clear();
    if (label.labelId != null) activeIds.add(label.labelId);
    setActiveIds(new Set(activeIds));
    return activeIds;
  }

  function initActive(annotations: Annotation[]) {
    activeIds.clear();
    for (const ann of annotations) if (ann.labelId != null) activeIds.add(ann.labelId);
    setActiveIds(new Set(activeIds));
  }

  async function create(label: Label | Label[]): Promise<Label[] | undefined> {
    try {
      const pid = label instanceof Array ? label[0].projectId : label.projectId;
      const newLabels = await LabelApi.create(label instanceof Array ? label : [label], pid, true);
      if (pid) getAll(pid);
      return newLabels;
    } catch { return; }
  }

  async function remove(label: Label): Promise<Label[]> {
    if (label.labelId == null) return [];
    try {
      await LabelApi.remove(label.labelId);
      if (label.labelId != null && activeIds.has(label.labelId)) {
        activeIds.delete(label.labelId);
        setActiveIds(new Set(activeIds));
      }
      if (curr != undefined && curr.labelId == label.labelId) unsetCurr();
      if (label.projectId) {
        const labels = await getAll(label.projectId);
        message.success('Label deleted');
        return labels || [];
      }
      return [];
    } catch { return []; }
  }

  function isActive(label: Label) { return label.labelId != null && activeIds.has(label.labelId); }

  return { all, getAll, activeIds, setActiveIds, initActive, onSelect, curr, setCurr, isActive, create, remove, isOneHot, setOneHot };
}

export function TaskUtils(useState: <S>(initial?: S | (() => S)) => [S, any], props: { annotation: any; push: boolean }) {
  const [all, setAll] = useState<Task[]>();
  const [currIdx, setCurrIdx] = useState<number>();

  const turnTo = (turnToIdx: number) => {
    if (!all) return false;
    if (turnToIdx < 0) { message.error('No previous task'); return false; }
    if (turnToIdx == all.length) { message.error('No next task'); return false; }
    setCurrIdx(turnToIdx);
    return true;
  };

  const getAll = async (projectId: number, turnToIdx?: number, orderBy: string = 'modified asc') => {
    try {
      const allRes = await ProjectApi.getTasks(projectId, orderBy);
      setAll(allRes);
      if (turnToIdx != undefined) {
        turnTo(turnToIdx);
        return [allRes, allRes[turnToIdx]];
      }
      const HistoryData = JSON.parse(localStorage.getItem('projectHistory') || '{}');
      const storeIndex = HistoryData[projectId];
      if (storeIndex !== undefined) {
        for (let index = 0; index < allRes.length; index++) {
          if (allRes[index].taskId === storeIndex) {
            localStorage.setItem('currTaskId', String(storeIndex));
            turnTo(index);
            return [allRes, allRes[index]];
          }
        }
      }
      return allRes;
    } catch { return []; }
  };

  function finished(progress?: number) {
    if (progress == undefined) return 0;
    if (!all) return 0;
    return Math.round((all.length * progress) / 100);
  }

  const nextTask = () => turnTo((currIdx ?? 0) + 1);
  const prevTask = () => turnTo((currIdx ?? 0) - 1);

  return {
    currIdx, all, setAll, turnTo, getAll, nextTask, prevTask, finished,
    get curr() { if (currIdx == undefined || all == undefined) return undefined; return all[currIdx]; },
  };
}

export function AnnotationUtils(useState: <S>(initial?: S | (() => S)) => [S, any], { label = undefined, project = undefined, recordHistory = () => {} }: { label: any; project: any; recordHistory: (x: { annos: any[] }) => void }) {
  const [all, setAllRaw] = useState<Annotation[]>();
  const [curr, setCurrRaw] = useState<Annotation | undefined>();

  function setAll(annos: Annotation[]) { setAllRaw(annos); }

  const getAll = async (dataId: number) => {
    if (dataId == undefined) return [];
    try {
      const annRes = await DataApi.getAnnotations(dataId);
      setAll(annRes);
      return annRes;
    } catch { return []; }
  };

  async function clear() {
    if (!all || all.length === 0) return;
    if (all[0]?.dataId != null) await pushToBackend(all[0].dataId, []);
    setAllRaw([]);
    if (label) label.setActiveIds(new Set());
    if (project) project.getFinished();
  }

  const create = async (annotation: Annotation | Annotation[], _requestId?: string, deduplicate?: boolean) => {
    const prepAnn = (anno: Annotation) => {
      const ann = { ...anno };
      if (ann.label) ann.labelId = ann.label.labelId;
      ann.label = undefined;
      return ann;
    };
    try {
      const anns = annotation instanceof Array ? annotation.map(prepAnn) : [prepAnn(annotation)];
      await AnnotationApi.create(anns, undefined, deduplicate);
      let annRes: Annotation[] = [];
      if (anns[0]?.dataId) annRes = await getAll(anns[0]?.dataId);
      if (project && annRes.length === 1) project.getFinished();
    } catch { /* parseError */ }
  };

  async function remove(annotation: number | Annotation) {
    const annId = typeof annotation === 'number' ? annotation : annotation.annotationId;
    if (annId == undefined) return;
    try {
      await AnnotationApi.remove(annId);
      if (all && all.length && all[0].dataId != null) {
        const anns = await getAll(all[0].dataId);
        recordHistory({ annos: anns });
        if (anns.length === 0 && project) project.getFinished();
      }
      message.success('Saved');
    } catch { /* parseError */ }
  }

  async function setCurr(annotation: Annotation | undefined) {
    if (annotation == undefined) { setCurrRaw(undefined); return; }
    setCurrRaw(annotation);
    if (label) label.setCurr(annotation.label);
  }

  async function update(annotation: Annotation) {
    if (!annotation.annotationId) return [];
    const ann: Annotation = { ...annotation };
    ann.taskId = undefined;
    ann.label = undefined;
    ann.labelId = undefined;
    try {
      await AnnotationApi.update(ann.annotationId!, ann);
      return await getAll(ann.dataId!);
    } catch { return []; }
  }

  async function modify(annotation: Annotation) {
    if (!annotation) return undefined;
    if (annotation.annotationId == undefined) await create(annotation);
    else await update(annotation);
  }

  async function pushToBackend(dataId?: number, anns?: Annotation[]) {
    if (dataId == undefined || dataId == null) return;
    const newAll = anns ? anns : all;
    try {
      const res = await DataApi.setAnnotations(String(dataId), newAll);
      setAllRaw(res);
      message.success('Saved');
      return res;
    } catch { /* parseError */ }
  }

  return { all, clear, getAll, create, remove, setCurr, update, modify, curr, setAll, pushToBackend };
}

export function DataUtils(useState: <S>(initial?: S | (() => S)) => [S, any]) {
  const [currIdx, setCurrIdx] = useState<number>(0);
  const [all, setAll] = useState<Data[]>([]);

  const turnTo = (turnToIdx: number) => setCurrIdx(turnToIdx);

  const getAll = async (taskId: number, turnToIdx: number | undefined) => {
    try {
      const allRes = await TaskApi.getDatas(taskId);
      setAll(allRes);
      if (turnToIdx != undefined) { turnTo(turnToIdx); return [allRes, allRes[turnToIdx]]; }
      return allRes;
    } catch { return []; }
  };

  const updatePredicted = async (dataId: string, flag: boolean) => {
    try { await DataApi.update(dataId, { predicted: flag }); } catch { /* noop */ }
  };

  const setAnnotations = async (dataId: number, annotations: Annotation[]) => {
    try { await DataApi.setAnnotations(String(dataId), annotations); } catch { /* noop */ }
  };

  return {
    all, getAll, turnTo, setAnnotations, updatePredicted,
    get curr() { if (currIdx == undefined || all == undefined) return undefined; return all[currIdx]; },
    get imgSrc() {
      if (all && all[currIdx]) return `${baseUrl}/datas/${all[currIdx].dataId}/image?sault=${all[currIdx].sault}`;
      return '';
    },
  };
}

export function ModelUtils(mlBackendUrl?: string) {
  let modelApi = ModelApi.create(mlBackendUrl);

  async function setMlBackendUrl(url: string) { modelApi = ModelApi.create(url); }
  async function train(modelName: string, dataDir: string, configs: object) { return await modelApi.train(modelName, { dataDir, configs }); }
  async function predict(model: string, data: any) { return await modelApi.predict(model, data); }
  async function load(modelName: string, parmas: any = {}) { await modelApi.load(modelName, { initParams: parmas }); }
  async function checkAPI() { return await modelApi.isBackendUp(); }

  return { setMlBackendUrl, train, predict, load, checkAPI, create: ModelApi.create };
}

export function PageInit(
  useState: <S>(initial?: S | (() => S)) => [S, any],
  useEffect: (effect: () => void | (() => void), deps?: any[]) => void,
  props: {
    effectTrigger?: { postTaskChange?: (labels?: Label[], annotations?: Annotation[]) => void; postProjectChanged?: () => void };
    label?: labelUtilProps;
    tool?: { defaultTool: ToolType };
    annotation?: any;
    task?: { push?: boolean };
  }
) {
  message.config({ maxCount: 6, duration: 2 });
  const tool = ToolUtils(useState, props.tool || { defaultTool: 'mover' });
  const loading = LoadingUtils(useState);
  const scale = ScaleUtils(useState);
  const data = DataUtils(useState);
  const project = ProjectUtils(useState);
  const label = LabelUtils(useState, props.label || {});
  const annHistory = HistoryUtils(RpcApi);
  const annotation = AnnotationUtils(useState, { ...props.annotation, label, project, recordHistory: annHistory.record });
  const task = TaskUtils(useState, { annotation, push: props.task?.push ?? false });
  const [refreshVar, setRefreshVar] = useState<number>(0);

  function refresh() {
    for (const t of [100, 200, 1000, 2000]) setTimeout(() => setRefreshVar(Math.random()), t);
  }

  useEffect(() => {
    const projectIdStr = getQueryVariable('projectId');
    if (projectIdStr == undefined) return;
    const projectId = parseInt(projectIdStr);
    project.getCurr(projectId);
    loading.setCurr(true);
    label.getAll(projectId);
    const orderBy = localStorage.getItem('orderBy');
    if (orderBy) task.getAll(projectId, undefined, orderBy);
    else task.getAll(projectId);
    localStorage.removeItem('orderBy');
    project.getFinished(projectId);
  }, []);

  useEffect(() => {
    if (!project.curr) return;
    if (props.effectTrigger?.postProjectChanged) props.effectTrigger.postProjectChanged();
  }, [project.curr]);

  useEffect(() => {
    if (task.all) {
      if (task.all.length === 0) {
        message.error('No task under this project, please import data first!');
        if (project.curr?.projectId) window.location.href = `/project/${project.curr.projectId}`;
        return;
      }
      const currTaskId = localStorage.getItem('currTaskId');
      if (currTaskId != null) {
        for (let idx = 0; idx < task.all.length; idx++) {
          if (task.all[idx].taskId === Number(currTaskId)) { task.turnTo(idx); break; }
        }
        localStorage.removeItem('currTaskId');
      } else {
        task.turnTo(0);
      }
    }
  }, [task.all]);

  useEffect(() => {
    if (task.currIdx == undefined) return;
    const onTaskChange = async () => {
      if (task.curr?.projectId) project.getFinished(task.curr.projectId);
      if (task.curr?.taskId) {
        if (task.curr.projectId != null) projectHistory(task.curr.projectId, task.curr.taskId);
        const [allData, currData] = (await data.getAll(task.curr.taskId, 0)) as [Data[], Data];
        const allAnns = await annotation.getAll(currData.dataId!);
        if (label.all) for (const lab of label.all) lab.active = false;
        if (props.effectTrigger?.postTaskChange) props.effectTrigger?.postTaskChange(label.all, allAnns);
        annotation.setAll(allAnns);
      }
      loading.setCurr(false);
      refresh();
    };
    loading.setCurr(true);
    onTaskChange();
  }, [task.currIdx]);

  useEffect(() => { refresh(); }, [annotation.all, label.all]);

  return { tool, loading, scale, annotation, task, data, project, label, refreshVar, annHistory };
}
