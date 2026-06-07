'use client';

import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Gera números sequenciais legíveis (ex.: PC-2026-0001) de forma atômica,
 * usando a coleção `contadores` com um documento por tipo/ano.
 */
export async function proximoNumero(prefixo: 'PC' | 'NF'): Promise<string> {
  const ano = new Date().getFullYear();
  const contadorRef = doc(db, 'contadores', `${prefixo}_${ano}`);

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(contadorRef);
    const atual = snap.exists() ? (snap.data().valor as number) : 0;
    const proximo = atual + 1;
    tx.set(
      contadorRef,
      { valor: proximo, prefixo, ano, atualizadoEm: serverTimestamp() },
      { merge: true }
    );
    return proximo;
  });

  return `${prefixo}-${ano}-${String(seq).padStart(4, '0')}`;
}
