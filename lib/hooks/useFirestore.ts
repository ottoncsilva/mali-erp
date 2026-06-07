'use client';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useEffect, useState, useCallback } from 'react';

export function useCollection<T>(collectionName: string) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        try {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as T & { id: string }));
          setData(docs);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        } finally {
          setLoading(false);
        }
      },
      // Callback de erro: sem ele, uma falha (ex.: permissão negada) deixaria
      // `loading` travado em true para sempre (spinner infinito). Aqui
      // liberamos o loading e expomos o erro para a tela poder reagir.
      (err) => {
        console.error(`[useCollection:${collectionName}]`, err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        setData([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]);

  return { data, loading, error };
}

export function useAddDocument(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (data: any) => {
      setLoading(true);
      setError(null);
      try {
        const docRef = await addDoc(collection(db, collectionName), {
          ...data,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        });
        return docRef.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao adicionar';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  return { add, loading, error };
}

export function useUpdateDocument(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (docId: string, data: any) => {
      setLoading(true);
      setError(null);
      try {
        await updateDoc(doc(db, collectionName, docId), {
          ...data,
          atualizadoEm: new Date(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  return { update, loading, error };
}

export function useDeleteDocument(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(
    async (docId: string) => {
      setLoading(true);
      setError(null);
      try {
        await deleteDoc(doc(db, collectionName, docId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao deletar';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  return { remove, loading, error };
}
