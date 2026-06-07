import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CARGOS_PADRAO } from './permissoes';

/**
 * Popula a coleção `cargos` com os cargos padrão na primeira vez (se vazia).
 * Retorna true se semeou. Idempotente: não sobrescreve cargos existentes.
 */
export async function seedCargosSeVazio(): Promise<boolean> {
  const snap = await getDocs(collection(db, 'cargos'));
  if (!snap.empty) return false;
  await Promise.all(
    CARGOS_PADRAO.map((c) => {
      const { id, ...resto } = c;
      return setDoc(doc(db, 'cargos', id), {
        ...resto,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      });
    })
  );
  return true;
}
