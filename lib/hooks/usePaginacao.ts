/**
 * Hook de paginação para collections do Firestore.
 * Permite carregar dados em lotes em vez de tudo de uma vez.
 */

import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface PaginacaoOpcoes<T> {
  collectionName: string;
  pageSize?: number;
  orderByField?: string;
  orderByDirection?: 'asc' | 'desc';
}

interface UsePaginacaoResult<T> {
  items: (T & { id: string })[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  reset: () => void;
}

export function usePaginacao<T>(opcoes: PaginacaoOpcoes<T>): UsePaginacaoResult<T> {
  const {
    collectionName,
    pageSize = 20,
    orderByField = 'criadoEm',
    orderByDirection = 'desc',
  } = opcoes;

  const [items, setItems] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carrega a primeira página
  useEffect(() => {
    if (isInitialized) return;

    const carregarPrimeira = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, collectionName),
          orderBy(orderByField, orderByDirection),
          limit(pageSize)
        );
        const snapshot = await getDocs(q);
        const dados = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
        setItems(dados);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(dados.length === pageSize);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    carregarPrimeira();
  }, [collectionName, pageSize, orderByField, orderByDirection, isInitialized]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !lastDoc) return;

    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, orderByDirection),
        startAfter(lastDoc),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const novosDados = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
      setItems((prev) => [...prev, ...novosDados]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(novosDados.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mais dados');
    } finally {
      setLoading(false);
    }
  }, [collectionName, pageSize, orderByField, orderByDirection, hasMore, lastDoc]);

  const reset = useCallback(() => {
    setItems([]);
    setLastDoc(null);
    setHasMore(true);
    setError(null);
    setIsInitialized(false);
  }, []);

  return { items, loading, hasMore, error, loadMore, reset };
}

/**
 * Helper simples para implementar infinite scroll em listas grandes.
 * Use junto com usePaginacao para detectar quando o usuário chegou ao fim.
 */
export const createInfiniteScrollObserver = (
  callback: () => void,
  options: IntersectionObserverInit = { threshold: 0.1 }
): [(el: HTMLElement | null) => void, () => void] => {
  let observer: IntersectionObserver | null = null;

  const setElement = (el: HTMLElement | null) => {
    if (observer) observer.disconnect();
    if (el) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) callback();
      }, options);
      observer.observe(el);
    }
  };

  const cleanup = () => {
    if (observer) observer.disconnect();
  };

  return [setElement, cleanup];
};
