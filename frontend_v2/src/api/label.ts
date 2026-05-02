import client from './client';
import type { Label } from '@/types';

export const getLabels = () => client.get<Label[]>('/labels').then(r => r.data);

export const createLabel = (label: Partial<Label>) => client.post<Label>('/labels', label).then(r => r.data);

export const getLabel = (id: number) => client.get<Label>(`/labels/${id}`).then(r => r.data);

export const updateLabel = (id: number, label: Partial<Label>) => client.put<Label>(`/labels/${id}`, label).then(r => r.data);

export const deleteLabel = (id: number) => client.delete(`/labels/${id}`);
