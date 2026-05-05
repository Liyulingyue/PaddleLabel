import client from './client';
import type { Task } from '@/types';

export const getTasks = () => client.get<Task[]>('/tasks').then(r => r.data);

export const getTask = (id: number) => client.get<Task>(`/tasks/${id}`).then(r => r.data);

export const updateTask = (id: number, data: Partial<Task>) => client.put<Task>(`/tasks/${id}`, data).then(r => r.data);

export const deleteTask = (id: number) => client.delete(`/tasks/${id}`);

export const getTaskTags = (id: number) => client.get(`/tasks/${id}/tags`).then(r => r.data);

export const addTaskTag = (id: number, tag: { name: string }) => client.post(`/tasks/${id}/tags`, tag).then(r => r.data);

export const getTaskDatas = (id: number) => client.get(`/tasks/${id}/datas`).then(r => r.data);

export const getTaskAnnotations = (id: number) => client.get(`/tasks/${id}/annotations`).then(r => r.data);
