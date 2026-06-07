'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/hooks';
import { Permissao } from '@/lib/auth';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtegerPaginaProps {
  /** Permissão exigida para ver o conteúdo. */
  permissao: Permissao;
  children: ReactNode;
}

/**
 * Envólucro de página que só renderiza o conteúdo se o usuário possuir a
 * permissão. Caso contrário mostra um aviso de acesso restrito. Substitui os
 * `if (perfil !== 'admin')` espalhados pelas páginas.
 */
export function ProtegerPagina({ permissao, children }: ProtegerPaginaProps) {
  const { userProfile, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
      </div>
    );
  }

  if (!userProfile || !can(permissao)) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 flex gap-3">
        <ShieldAlert className="w-6 h-6 text-orange-500 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-foreground">Acesso restrito</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Você não tem permissão para acessar esta página. Fale com um administrador.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
