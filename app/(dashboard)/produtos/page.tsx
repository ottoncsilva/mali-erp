'use client';

import { Package, Plus, Search } from 'lucide-react';

export default function ProdutosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-2">Gestão do catálogo de produtos e estoque</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Placeholder */}
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-muted-foreground">
          O módulo de Produtos será desenvolvido na próxima etapa (Fase 2)
        </p>
      </div>
    </div>
  );
}
