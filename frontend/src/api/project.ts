import client from './client';
import type { Project, Label } from '@/types';

export const getProjects = () => client.get<Project[]>('/projects').then(r => r.data);

export const getProject = (id: number) => client.get<Project>(`/projects/${id}`).then(r => r.data);

export const createProject = (data: Partial<Project>) => client.post<Project>('/projects', data).then(r => r.data);

export const updateProject = (id: number, data: Partial<Project>) => client.put<Project>(`/projects/${id}`, data).then(r => r.data);

export const deleteProject = (id: number) => client.delete(`/projects/${id}`);

export const getProjectTasks = (id: number) => client.get(`/projects/${id}/tasks`).then(r => r.data);

export const getProjectLabels = (id: number) => client.get<Label[]>(`/projects/${id}/labels`).then(r => r.data);

export const createProjectLabel = (id: number, label: Partial<Label>) => client.post(`/projects/${id}/labels`, label).then(r => r.data);

export const updateProjectLabel = (id: number, labelId: number, label: Partial<Label>) => client.put(`/projects/${id}/labels/${labelId}`, label).then(r => r.data);

export const deleteProjectLabel = (id: number, labelId: number) => client.delete(`/projects/${id}/labels/${labelId}`);

export const getProjectProgress = (id: number) => client.get(`/projects/${id}/progress`).then(r => r.data);

export const splitProject = (id: number, data: { train: number; val: number; test: number }) =>
  client.post(`/projects/${id}/split`, data).then(r => r.data);

export const exportProject = (id: number, data: { export_dir: string; export_format?: string }) =>
  client.post(`/projects/${id}/export`, data).then(r => r.data);

export const importProjectData = (id: number, data: { import_dir: string; import_format?: string }) =>
  client.post(`/projects/${id}/import`, data).then(r => r.data);

export const predictProject = (id: number, data: { ml_backend_url: string; model: string; same_server?: boolean; create_label?: boolean }) =>
  client.post(`/projects/${id}/predict`, data).then(r => r.data);
