import client from './client';
import type { Data, Annotation } from '@/types';

export const getDatas = () => client.get<Data[]>('/datas/').then(r => r.data);

export const getData = (id: number) => client.get<Data>(`/datas/${id}/`).then(r => r.data);

export const updateData = (id: number, data: Partial<Data>) => client.put<Data>(`/datas/${id}/`, data).then(r => r.data);

export const deleteData = (id: number) => client.delete(`/datas/${id}/`);

export const getDataImage = (id: number, sault?: string) => {
  const url = `/datas/${id}/image`;
  return sault ? `${url}?sault=${sault}` : url;
};

export const getDataMask = (id: number, sault?: string) => {
  const url = `/datas/${id}/mask`;
  return sault ? `${url}?sault=${sault}` : url;
};

export const getDataAnnotations = (id: number) => client.get<Annotation[]>(`/datas/${id}/annotations`).then(r => r.data);

export const addDataAnnotation = (id: number, annotation: Partial<Annotation>) =>
  client.post<Annotation[]>(`/datas/${id}/annotations`, [annotation]).then(r => r.data[0]);

export const deleteDataAnnotation = (dataId: number, annotationId: number) =>
  client.delete(`/annotations/${annotationId}`);

export const saveDataAnnotations = (dataId: number, annotations: Annotation[]) =>
  client.post<Annotation[]>(`/datas/${dataId}/annotations`, annotations).then(r => r.data);
