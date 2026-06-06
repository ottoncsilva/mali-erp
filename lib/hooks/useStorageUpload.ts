'use client';

import { useState, useCallback } from 'react';

/**
 * Upload de arquivos para o MinIO (via rota de API /api/upload).
 * As credenciais do MinIO ficam apenas no servidor — nunca no navegador.
 * Interface mantida igual à anterior (uploadFile/deleteFile) para
 * compatibilidade com as telas existentes.
 */
export function useStorageUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao fazer upload');
      }
      const data = await res.json();
      return data.url as string;
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
      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error('Erro ao deletar arquivo');
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
