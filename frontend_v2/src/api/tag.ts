import client from './client';
import type { Tag } from '@/types';

export const getTags = () => client.get<Tag[]>('/tags').then(r => r.data);

export const createTag = (tag: Partial<Tag>) => client.post<Tag>('/tags', tag).then(r => r.data);

export const getTag = (id: number) => client.get<Tag>(`/tags/${id}`).then(r => r.data);

export const updateTag = (id: number, tag: Partial<Tag>) => client.put<Tag>(`/tags/${id}`, tag).then(r => r.data);

export const deleteTag = (id: number) => client.delete(`/tags/${id}`);
