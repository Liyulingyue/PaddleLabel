import { useEffect, useCallback } from 'react';
import { useAnnotationStore } from '@/stores/annotationStore';
import type { Annotation } from '@/types';

export function useAnnotation(dataId: number | null) {
  const { annotations, fetchAnnotations, addAnnotation, updateAnnotation, removeAnnotation } = useAnnotationStore();

  useEffect(() => {
    if (dataId) {
      fetchAnnotations(dataId);
    }
  }, [dataId, fetchAnnotations]);

  const save = useCallback(async (annotation: Annotation) => {
    if (dataId) {
      const { saveAnnotation } = useAnnotationStore.getState();
      await saveAnnotation(dataId, annotation);
    }
  }, [dataId]);

  const create = useCallback((annotation: Omit<Annotation, 'annotation_id'>) => {
    addAnnotation(annotation);
  }, [addAnnotation]);

  const update = useCallback((frontendId: number, updates: Partial<Annotation>) => {
    updateAnnotation(frontendId, updates);
  }, [updateAnnotation]);

  const remove = useCallback((frontendId: number) => {
    removeAnnotation(frontendId);
  }, [removeAnnotation]);

  return { annotations, create, update, remove, save };
}
