'use client';

import { useAuth, useEmpresa } from '@/lib/hooks';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Truck,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3,
  Wrench,
  User,
  Clock,
  CreditCard,
  CheckSquare,
  Boxes,
  ClipboardList,
  Warehouse,
  ShieldCheck,
  Percent,
  Building2,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { DepositosModal } from '@/components/modules/estoque/DepositosModal';
import { Permissao } from '@/lib/auth';

// Icon component para Briefcase
const Briefcase = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 7h-9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
    <path d="M9 5v5h6V5" />
  </svg>
);

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  /** Permissão exigida para ver o item. Itens-pai sem permissão somem se
   *  todos os filhos forem filtrados. */
  permissao?: Permissao;
  children?: NavItem[];
  action?: 'depositos-modal';
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },

  // Vendas (CRM + Vendas unificados — mesma atividade)
  {
    label: 'Vendas',
    icon: <ShoppingCart className="w-4 h-4" />,
    children: [
      {
        label: 'Clientes',
        href: '/dashboard/clientes',
        icon: <User className="w-4 h-4" />,
        permissao: 'vendas.acessar',
      },
      {
        label: 'Orçamentos',
        href: '/dashboard/orcamentos',
        icon: <FileText className="w-4 h-4" />,
        permissao: 'vendas.acessar',
      },
      {
        label: 'Carteira',
        href: '/dashboard/carteira',
        icon: <Briefcase className="w-4 h-4" />,
        permissao: 'vendas.acessar',
      },
      {
        label: 'Especificadores',
        href: '/dashboard/vendas/especificadores',
        icon: <Users className="w-4 h-4" />,
        permissao: 'vendas.acessar',
      },
    ],
  },

  // Operações
  {
    label: 'Operações',
    icon: <Truck className="w-4 h-4" />,
    children: [
      {
        label: 'Entregas',
        href: '/dashboard/entregas',
        icon: <Truck className="w-4 h-4" />,
        permissao: 'operacoes.acessar',
      },
      {
        label: 'Assistência Técnica',
        href: '/dashboard/assistencia',
        icon: <Wrench className="w-4 h-4" />,
        permissao: 'operacoes.acessar',
      },
    ],
  },

  // Financeiro
  {
    label: 'Financeiro',
    icon: <CreditCard className="w-4 h-4" />,
    children: [
      {
        label: 'Contas a Receber',
        href: '/dashboard/financeiro',
        icon: <DollarSign className="w-4 h-4" />,
        permissao: 'financeiro.acessar',
      },
      {
        label: 'Relatórios',
        href: '/dashboard/relatorios',
        icon: <BarChart3 className="w-4 h-4" />,
        permissao: 'financeiro.acessar',
      },
      {
        label: 'DRE',
        href: '/dashboard/apuracao',
        icon: <BarChart3 className="w-4 h-4" />,
        permissao: 'dre.ver',
      },
    ],
  },

  // Catálogo (inclui Estoque e Compras)
  {
    label: 'Catálogo',
    icon: <Package className="w-4 h-4" />,
    children: [
      {
        label: 'Produtos',
        href: '/dashboard/produtos',
        icon: <Package className="w-4 h-4" />,
        permissao: 'catalogo.gerir',
      },
      {
        label: 'Estoque',
        href: '/dashboard/estoque',
        icon: <Boxes className="w-4 h-4" />,
        permissao: 'estoque.acessar',
      },
      {
        label: 'Compras',
        href: '/dashboard/compras',
        icon: <ClipboardList className="w-4 h-4" />,
        permissao: 'compras.acessar',
      },
      {
        label: 'Depósitos',
        action: 'depositos-modal',
        icon: <Warehouse className="w-4 h-4" />,
        permissao: 'estoque.acessar',
      },
      {
        label: 'Categorias',
        href: '/dashboard/configuracoes/categorias',
        icon: <CheckSquare className="w-4 h-4" />,
        permissao: 'catalogo.gerir',
      },
      {
        label: 'Fornecedores',
        href: '/dashboard/fornecedores',
        icon: <Truck className="w-4 h-4" />,
        permissao: 'catalogo.gerir',
      },
    ],
  },

  // Configurações
  {
    label: 'Configurações',
    icon: <Settings className="w-4 h-4" />,
    children: [
      {
        label: 'Precificação',
        href: '/dashboard/configuracoes/precificacao',
        icon: <DollarSign className="w-4 h-4" />,
        permissao: 'config.precificacao',
      },
      {
        label: 'Colaboradores',
        href: '/dashboard/configuracoes/usuarios',
        icon: <Users className="w-4 h-4" />,
        permissao: 'usuarios.gerir',
      },
      {
        label: 'Cargos & Permissões',
        href: '/dashboard/configuracoes/cargos',
        icon: <ShieldCheck className="w-4 h-4" />,
        permissao: 'usuarios.gerir',
      },
      {
        label: 'Comissões',
        href: '/dashboard/configuracoes/comissoes',
        icon: <Percent className="w-4 h-4" />,
        permissao: 'usuarios.gerir',
      },
      {
        label: 'Dados da Empresa',
        href: '/dashboard/configuracoes/empresa',
        icon: <Building2 className="w-4 h-4" />,
        permissao: 'config.empresa',
      },
    ],
  },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function DashboardSidebar({ isOpen, onToggle }: DashboardSidebarProps) {
  const { userProfile, cargoNome, permissoes } = useAuth();
  const { empresa } = useEmpresa();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [depositosModalOpen, setDepositosModalOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // Acordeão: abrir um menu fecha os demais.
  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => (prev.has(label) ? new Set() : new Set([label])));
  };

  // Filtra itens por permissão, recursivamente. Itens-pai sem permissão própria
  // são removidos quando todos os filhos foram filtrados.
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined,
      }))
      .filter((item) => {
        if (item.permissao && !permissoes.includes(item.permissao)) return false;
        if (item.children && item.children.length === 0) return false;
        return true;
      });
  };

  const filteredItems = useMemo(
    () => filterItems(navItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissoes]
  );

  // Detectar item ativo em árvore
  const isItemActive = (item: NavItem): boolean => {
    if (item.href && pathname === item.href) return true;
    if (item.href && pathname.startsWith(item.href + '/')) return true;
    if (item.children) {
      return item.children.some((child) => isItemActive(child));
    }
    return false;
  };

  const renderItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isItemActive(item);
    const isExpanded = expandedItems.has(item.label);
    const isRoot = depth === 0;

    const handleAction = () => {
      if (item.action === 'depositos-modal') {
        setDepositosModalOpen(true);
      }
    };

    return (
      <div key={item.label}>
        {item.href ? (
          // Link item
          <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-mali-primary/10 text-mali-primary font-medium'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
            title={!isOpen ? item.label : ''}
          >
            {item.icon}
            {isOpen && <span className="flex-1">{item.label}</span>}
          </Link>
        ) : item.action ? (
          // Action button item
          <button
            onClick={handleAction}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-mali-primary/10 text-mali-primary font-medium'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
            title={!isOpen ? item.label : ''}
          >
            {item.icon}
            {isOpen && <span className="flex-1">{item.label}</span>}
          </button>
        ) : (
          // Submenu trigger
          <button
            onClick={() => toggleExpanded(item.label)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-mali-primary/10 text-mali-primary font-medium'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            {item.icon}
            {isOpen && (
              <>
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </>
            )}
          </button>
        )}

        {/* Submenu (renderizar só se expandido) */}
        {hasChildren && isOpen && isExpanded && (
          <div className="space-y-1">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-card border-r border-border h-full flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            {empresa?.logoURL ? (
              <img
                src={empresa.logoURL}
                alt={empresa.nomeFantasia || 'Logo'}
                className="w-10 h-10 rounded-lg object-contain flex-shrink-0 bg-white"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-mali-primary to-mali-primary-dark rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-mali-secondary">
                  {(empresa?.nomeFantasia || 'M').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-foreground truncate">
                  {empresa?.nomeFantasia || 'Mali'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {empresa?.razaoSocial ? 'ERP' : 'Mobile'}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredItems.map((item) => renderItem(item))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-border p-3 space-y-2">
          {isOpen && (
            <div className="px-3 py-2 rounded-md bg-background text-xs">
              <p className="font-semibold text-foreground">{userProfile?.nome}</p>
              <p className="text-muted-foreground">{cargoNome}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            title={!isOpen ? 'Sair' : ''}
          >
            <LogOut className="w-4 h-4" />
            {isOpen && 'Sair'}
          </button>
        </div>
      </div>

      <DepositosModal isOpen={depositosModalOpen} onClose={() => setDepositosModalOpen(false)} />
    </>
  );
}
