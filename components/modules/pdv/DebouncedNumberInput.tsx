'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/lib/hooks';

interface DebouncedNumberInputProps {
  /** Valor calculado/externo exibido quando o campo NÃO está sendo editado. */
  value: number;
  /** Chamado após `delay` ms quando o usuário digita um valor válido. */
  onCommit: (value: number) => void;
  delay?: number;
  className?: string;
  prefix?: string; // ex.: "R$ "
  decimais?: number; // casas decimais ao exibir o valor externo
  placeholder?: string;
  min?: number;
  max?: number;
}

/**
 * Input numérico que dá feedback imediato enquanto digita, mas só "comita"
 * o valor (recálculo) após um atraso. Enquanto focado, mostra o rascunho do
 * usuário; ao perder o foco / receber novo valor externo, ressincroniza.
 */
export function DebouncedNumberInput({
  value,
  onCommit,
  delay = 2000,
  className = '',
  prefix = '',
  decimais = 2,
  placeholder,
  min,
  max,
}: DebouncedNumberInputProps) {
  const [draft, setDraft] = useState(value.toFixed(decimais));
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(draft, delay);
  const ultimoComitado = useRef(value);

  // Ressincroniza com o valor externo quando não está sendo editado.
  useEffect(() => {
    if (!focused) {
      setDraft(value.toFixed(decimais));
      ultimoComitado.current = value;
    }
  }, [value, focused, decimais]);

  // Comita o rascunho após o debounce (apenas durante edição).
  useEffect(() => {
    if (!focused) return;
    const num = parseFloat(debounced.replace(',', '.'));
    if (isNaN(num)) return;
    let v = num;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    if (Math.abs(v - ultimoComitado.current) > 0.0001) {
      ultimoComitado.current = v;
      onCommit(v);
    }
    // onCommit/min/max são estáveis o suficiente; dependemos do debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex items-center">
      {prefix && <span className="text-xs text-muted-foreground mr-1">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={() => setFocused(false)}
        className={className}
      />
    </div>
  );
}
