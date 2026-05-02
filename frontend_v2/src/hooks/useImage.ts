import { useState, useCallback, useEffect } from 'react';
import { getDataImage } from '@/api/data';
import { getImageSize } from '@/utils/file';

export function useImage(dataId: number | null, sault?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataId) {
      setImage(null);
      setImageUrl('');
      return;
    }

    setLoading(true);
    setError(null);
    const url = getDataImage(dataId, sault);
    setImageUrl(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      setImage(img);
      const s = await getImageSize(url);
      setSize(s);
      setLoading(false);
    };
    img.onerror = () => {
      setError('Failed to load image');
      setLoading(false);
    };
    img.src = url;
  }, [dataId, sault]);

  return { image, imageUrl, size, loading, error };
}
