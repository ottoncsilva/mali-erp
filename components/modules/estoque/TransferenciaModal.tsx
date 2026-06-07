'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { registrarTransferencia } from '@/lib/estoque';
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

export function TransferenciaModal({ isOpen, onClose, onDone, produto, usuario }: Props) {
  const [origem, setOrigem] = useState<LocalizacaoEstoque>('comprado');
  const [destino, setDestino] = useState<LocalizacaoEstoque>('showroom');
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!produto) return null;

  const saldoOrigem = produto.saldos[origem] || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (origem === destino) {
      setErro('Origem e destino devem ser diferentes.');
      return;
    }
    if (quantidade <= 0 || quantidade > saldoOrigem) {
      setErro(`Quantidade inválida. Disponível em ${LOCALIZACOES[origem]}: ${saldoOrigem}.`);
      return;
    }
    setSalvando(true);
    try {
      await registrarTransferencia(
        { produtoId: produto.id, produtoNome: produto.nome, produtoSku: produto.sku },
        origem,
        destino,
        quantidade,
        { registradoPorId: usuario.id, registradoPorNome: usuario.nome },
        motivo || undefined
      );
      onDone();
      onClose();
      reset();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao transferir.');
    } finally {
      setSalvando(false);
    }
  };

  const reset = () => {
    setOrigem('comprado');
    setDestino('showroom');
    setQuantidade(1);
    setMotivo('');
    setErro(null);
  };

  return (
    <Modal isOpen={isOpen} title={`Transferir — ${produto.nome}`} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">SKU: {produto.sku}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">De</label>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value as LocalizacaoEstoque)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              {LOCAIS.map((l) => (
                <option key={l} value={l}>
                  {LOCALIZACOES[l]} ({produto.saldos[l] || 0})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Para</label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value as LocalizacaoEstoque)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              {LOCAIS.map((l) => (
                <option key={l} value={l}>
                  {LOCALIZACOES[l]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Quantidade</label>
          <input
            type="number"
            min={1}
            max={saldoOrigem}
            value={quantidade}
            onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Motivo (opcional)</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: recebimento conferido, exposição no showroom"
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium disabled:opacity-50"
          >
            {salvando ? 'Transferindo...' : 'Transferir'}
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
