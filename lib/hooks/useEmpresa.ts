'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DadosEmpresa } from '@/types';

/**
 * Lê os dados cadastrais da empresa (doc `empresa/dados`) em tempo real.
 * Usado para exibir logo/nome no topo do sistema e em documentos.
 */
export function useEmpresa() {
  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'empresa', 'dados'),
      (snap) => {
        setEmpresa(snap.exists() ? (snap.data() as DadosEmpresa) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { empresa, loading };
}
