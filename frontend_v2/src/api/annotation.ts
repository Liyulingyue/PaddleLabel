import client from './client';
import type { Annotation } from '@/types';

export const getAnnotations = () => client.get<Annotation[]>('/annotations/').then(r => r.data);

export const getAnnotation = (id: number) => client.get<Annotation>(`/annotations/${id}`).then(r => r.data);

export const createAnnotation = (annotation: Partial<Annotation>) =>
  client.post<Annotation>('/annotations/', annotation).then(r => r.data);

export const updateAnnotation = (id: number, annotation: Partial<Annotation>) =>
  client.put<Annotation>(`/annotations/${id}`, annotation).then(r => r.data);

export const deleteAnnotation = (id: number) => client.delete(`/annotations/${id}`);
