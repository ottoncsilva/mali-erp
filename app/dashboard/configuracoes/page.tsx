'use client';

import Link from 'next/link';
import {
  Settings,
  Tags,
  DollarSign,
  Users,
  ShieldCheck,
  Percent,
  Building2,
} from 'lucide-react';

const configItems = [
  {
    title: 'Precificação',
    description: 'Configure pontuação padrão e travas por perfil',
    icon: <DollarSign className="w-6 h-6" />,
    href: '/dashboard/configuracoes/precificacao',
    color: 'from-mali-primary to-mali-primary-dark',
  },
  {
    title: 'Colaboradores',
    description: 'Cadastro de colaboradores, acesso e comissão',
    icon: <Users className="w-6 h-6" />,
    href: '/dashboard/configuracoes/usuarios',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    title: 'Cargos & Permissões',
    description: 'Crie cargos e defina o que cada um pode acessar',
    icon: <ShieldCheck className="w-6 h-6" />,
    href: '/dashboard/configuracoes/cargos',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    title: 'Comissões',
    description: 'Percentual e forma de remuneração por cargo',
    icon: <Percent className="w-6 h-6" />,
    href: '/dashboard/configuracoes/comissoes',
    color: 'from-amber-500 to-amber-600',
  },
  {
    title: 'Empresa',
    description: 'Dados da empresa, logo e informações gerais',
    icon: <Building2 className="w-6 h-6" />,
    href: '/dashboard/configuracoes/empresa',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    title: 'Categorias',
    description: 'Gerencie categorias de produtos',
    icon: <Tags className="w-6 h-6" />,
    href: '/dashboard/configuracoes/categorias',
    color: 'from-blue-500 to-blue-600',
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
          <Link key={idx} href={item.href} className="group hover:shadow-lg transition-shadow">
            <div className="bg-card rounded-lg border border-border overflow-hidden h-full">
              <div className={`bg-gradient-to-r ${item.color} p-6 text-white flex items-center justify-center`}>
                {item.icon}
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
