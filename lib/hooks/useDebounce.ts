'use client';

import { useState, useEffect } from 'react';

/**
 * Retorna o valor "atrasado" — só muda após `delayMs` sem novas alterações.
 * Útil para recalcular preços/pontuação apenas quando o usuário para de digitar.
 */
export function useDebounce<T>(value: T, delayMs: number = 2000): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
