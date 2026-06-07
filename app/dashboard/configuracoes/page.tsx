'use client';

import Link from 'next/link';
import { Settings, Tags, DollarSign, Users, Package } from 'lucide-react';

const configItems = [
  {
    title: 'Precificação',
    description: 'Configure pontuação padrão e travas por perfil',
    icon: <DollarSign className="w-6 h-6" />,
    href: '/dashboard/configuracoes/precificacao',
    color: 'from-mali-primary to-mali-primary-dark',
  },
  {
    title: 'Categorias',
    description: 'Gerencie categorias de produtos',
    icon: <Tags className="w-6 h-6" />,
    href: '/dashboard/configuracoes/categorias',
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Usuários',
    description: 'Gerenciar usuários e permissões do sistema',
    icon: <Users className="w-6 h-6" />,
    href: '#',
    color: 'from-cyan-500 to-cyan-600',
    disabled: true,
  },
  {
    title: 'Empresa',
    description: 'Dados da empresa, logo e informações gerais',
    icon: <Package className="w-6 h-6" />,
    href: '#',
    color: 'from-emerald-500 to-emerald-600',
    disabled: true,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações globais do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configItems.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className={`group ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transition-shadow'}`}
          >
            <div className="bg-card rounded-lg border border-border overflow-hidden h-full">
              <div className={`bg-gradient-to-r ${item.color} p-6 text-white flex items-center justify-center`}>
                {item.icon}
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.disabled && (
                  <p className="text-xs text-orange-600 mt-3">Em desenvolvimento</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
