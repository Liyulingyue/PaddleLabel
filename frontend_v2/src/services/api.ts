import client from './client';
import type { Project, Task, Data, Annotation, Label, Progress, ProjectOtherSettings } from './types';

export const ProjectApi = {
  getAll: () => client.get<Project[]>('/projects').then(r => r.data),

  get: (projectId: number) => client.get<Project>(`/projects/${projectId}`).then(r => r.data),

  create: (data: Partial<Project>) => client.post<Project>('/projects', data).then(r => r.data),

  update: (projectId: number, data: Partial<Project>) =>
    client.put<Project>(`/projects/${projectId}`, data).then(r => r.data),

  remove: (projectId: number) => client.delete(`/projects/${projectId}`),

  getLabels: (projectId: number) => client.get<Label[]>(`/projects/${projectId}/labels`).then(r => r.data),

  getTasks: (projectId: number, orderBy?: string) => {
    const params = orderBy ? { order_by: orderBy } : {};
    return client.get<Task[]>(`/projects/${projectId}/tasks`, { params }).then(r => r.data);
  },

  getProgress: (projectId: number) => client.get<Progress>(`/projects/${projectId}/progress`).then(r => r.data),

  splitDataset: (projectId: number, data: { train: number; val: number; test: number }) =>
    client.post(`/projects/${projectId}/split`, data).then(r => r.data),

  exportDataset: (projectId: number, data: { exportDir: string; exportFormat: string; segMaskType?: string }) =>
    client.post(`/projects/${projectId}/export`, data).then(r => r.data),

  importDataset: (projectId: number, data: { importDir: string; importFormat?: string }) =>
    client.post(`/projects/${projectId}/import`, data).then(r => r.data),

  predict: (projectId: number, settings: object) =>
    client.post(`/projects/${projectId}/predict`, settings).then(r => r.data),

  setAll: (projectId: string, data: { dataPredicted?: boolean }) =>
    client.put(`/projects/${projectId}/set_all`, data).then(r => r.data),

  getOptions: (projectType: string, imOrExport: string) =>
    client.get(`/projects/options/${imOrExport}/${projectType}`).then(r => r.data),

  browseDirectory: (path: string = '') =>
    client.get<{ currentPath: string; parentPath: string | null; items: { name: string; path: string; isDir: boolean }[] }>('/projects/browse_directory', { params: { path } }).then(r => r.data),
};

export const TaskApi = {
  getDatas: (taskId: number) => client.get<Data[]>(`/tasks/${taskId}/datas`).then(r => r.data),

  create: (projectId: number, data: Partial<Task>) =>
    client.post<Task>(`/projects/${projectId}/tasks`, data).then(r => r.data),

  remove: (taskId: number) => client.delete(`/tasks/${taskId}`),
};

export const DataApi = {
  getAnnotations: (dataId: number) =>
    client.get<Annotation[]>(`/datas/${dataId}/annotations`).then(r => r.data),

  setAnnotations: (dataId: string, annotations: Annotation[]) =>
    client.post(`/datas/${dataId}/annotations`, annotations).then(r => r.data),

  update: (dataId: string, data: Partial<Data>) =>
    client.put(`/datas/${dataId}`, data).then(r => r.data),
};

export const AnnotationApi = {
  create: (annotations: Partial<Annotation>[], dataId?: string, deduplicate?: boolean) => {
    const params = deduplicate ? { deduplicate: true } : {};
    return client.post(`/annotations`, annotations, { params }).then(r => r.data);
  },

  update: (annotationId: number, data: Partial<Annotation>) =>
    client.put(`/annotations/${annotationId}`, data).then(r => r.data),

  remove: (annotationId: number) => client.delete(`/annotations/${annotationId}`),
};

export const LabelApi = {
  create: (labels: Partial<Label>[], projectId?: number, deduplicate?: boolean) => {
    const params: any = {};
    if (projectId !== undefined) params.projectId = projectId;
    if (deduplicate) params.deduplicate = true;
    const body = labels.map(l => ({ ...l, project_id: projectId }));
    return client.post(`/labels`, body, { params }).then(r => r.data);
  },

  update: (labelId: number, data: Partial<Label>) =>
    client.put(`/labels/${labelId}`, data).then(r => r.data),

  remove: (labelId: number) => client.delete(`/labels/${labelId}`),
};

// Convenience wrappers for components
export const createLabels = (labels: Partial<Label>[], projectId?: number) =>
  LabelApi.create(labels, projectId, true);

export const removeLabel = (labelId: number) => LabelApi.remove(labelId);

export const updateLabel = (labelId: number, data: Partial<Label>) =>
  LabelApi.update(labelId, data);

export const createProject = (data: Partial<Project>) => ProjectApi.create(data);

export const updateProject = (projectId: number, data: Partial<Project>) =>
  ProjectApi.update(projectId, data);

export const removeProject = (projectId: number) => ProjectApi.remove(projectId);

export const importDataset = (projectId: number, data: { importDir: string; importFormat?: string }) =>
  ProjectApi.importDataset(projectId, data);

export const exportDataset = (projectId: number, data: { exportDir: string; exportFormat: string; segMaskType?: string }) =>
  ProjectApi.exportDataset(projectId, data);

export const splitDataset = (projectId: number, data: { train: number; val: number; test: number }) =>
  ProjectApi.splitDataset(projectId, data);

export const ManageApi = {
  getVersion: () => client.get('/version').then(r => r.data),
};

export const SampleApi = {
  getAll: () => client.get('/samples').then(r => r.data),
};

export const RpcApi = {
  getCache: (cacheId: string) => client.get<{ content: string }>(`/rpc/cache/${cacheId}`).then(r => r.data),

  createCache: (data: { content: string }) =>
    client.post<{ cacheId: string }>('/rpc/cache', data).then(r => r.data),
};

export const TagApi = {
  getAll: (projectId: number) => client.get(`/projects/${projectId}/tags`).then(r => r.data),

  create: (projectId: number, data: Partial<{ name: string; color?: string }>) =>
    client.post(`/projects/${projectId}/tags`, data).then(r => r.data),

  remove: (tagId: number) => client.delete(`/tags/${tagId}`),
};

export const UserApi = {
  login: (username: string, password: string) =>
    client.post('/users/login', { username, password }).then(r => r.data),

  logout: () => client.post('/users/logout').then(r => r.data),

  currentUser: () => client.get('/users/current').then(r => r.data),
};
