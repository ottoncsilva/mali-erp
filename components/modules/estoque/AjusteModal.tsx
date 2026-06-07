'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { registrarAjuste } from '@/lib/estoque';
import { LOCALIZACOES } from '@/types';
import type { LocalizacaoEstoque } from '@/types';

interface SaldoPorLocal {
  comprado: number;
  showroom: number;
  deposito: number;
  entrega: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  produto: { id: string; nome: string; sku: string; saldos: SaldoPorLocal } | null;
  usuario: { id: string; nome?: string };
}

const LOCAIS = Object.keys(LOCALIZACOES) as LocalizacaoEstoque[];

export function AjusteModal({ isOpen, onClose, onDone, produto, usuario }: Props) {
  const [localizacao, setLocalizacao] = useState<LocalizacaoEstoque>('deposito');
  const [novaQuantidade, setNovaQuantidade] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!produto) return null;

  const saldoAtual = produto.saldos[localizacao] || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!motivo.trim()) {
      setErro('Informe o motivo do ajuste (obrigatório para auditoria).');
      return;
    }
    if (novaQuantidade < 0) {
      setErro('A quantidade não pode ser negativa.');
      return;
    }
    setSalvando(true);
    try {
      await registrarAjuste(
        { produtoId: produto.id, produtoNome: produto.nome, produtoSku: produto.sku },
        localizacao,
        novaQuantidade,
        { registradoPorId: usuario.id, registradoPorNome: usuario.nome },
        motivo.trim()
      );
      onDone();
      onClose();
      reset();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao ajustar.');
    } finally {
      setSalvando(false);
    }
  };

  const reset = () => {
    setLocalizacao('deposito');
    setNovaQuantidade(0);
    setMotivo('');
    setErro(null);
  };

  return (
    <Modal isOpen={isOpen} title={`Ajustar Estoque — ${produto.nome}`} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">SKU: {produto.sku}</p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Localização</label>
          <select
            value={localizacao}
            onChange={(e) => setLocalizacao(e.target.value as LocalizacaoEstoque)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
          >
            {LOCAIS.map((l) => (
              <option key={l} value={l}>
                {LOCALIZACOES[l]} (atual: {produto.saldos[l] || 0})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Nova quantidade (atual: {saldoAtual})
          </label>
          <input
            type="number"
            min={0}
            value={novaQuantidade}
            onChange={(e) => setNovaQuantidade(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Motivo (obrigatório)</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: contagem de inventário, produto avariado"
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            required
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Ajustar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
