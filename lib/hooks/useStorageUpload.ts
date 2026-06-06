'use client';

import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useState, useCallback } from 'react';

export function useStorageUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar arquivo';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { uploadFile, deleteFile, loading, error };
}
