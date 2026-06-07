'use client';

import { useAuth } from '@/lib/hooks';
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
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { DepositosModal } from '@/components/modules/estoque/DepositosModal';

type UserProfile = 'admin' | 'gerencia' | 'vendedor' | 'comprador' | 'financeiro' | 'estoquista';

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
  requiredProfiles?: UserProfile[];
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
    requiredProfiles: ['admin', 'gerencia', 'vendedor'],
    children: [
      {
        label: 'Clientes',
        href: '/dashboard/clientes',
        icon: <User className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'vendedor'],
      },
      {
        label: 'Orçamentos',
        href: '/dashboard/orcamentos',
        icon: <FileText className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'vendedor'],
      },
      {
        label: 'Carteira',
        href: '/dashboard/carteira',
        icon: <Briefcase className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'vendedor'],
      },
      {
        label: 'Especificadores',
        href: '/dashboard/vendas/especificadores',
        icon: <Users className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'vendedor'],
      },
    ],
  },

  // Operações
  {
    label: 'Operações',
    icon: <Truck className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia'],
    children: [
      {
        label: 'Entregas',
        href: '/dashboard/entregas',
        icon: <Truck className="w-4 h-4" />,
      },
      {
        label: 'Assistência Técnica',
        href: '/dashboard/assistencia',
        icon: <Wrench className="w-4 h-4" />,
      },
    ],
  },

  // Financeiro
  {
    label: 'Financeiro',
    icon: <CreditCard className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia', 'financeiro'],
    children: [
      {
        label: 'Contas a Receber',
        href: '/dashboard/financeiro',
        icon: <DollarSign className="w-4 h-4" />,
      },
      {
        label: 'Relatórios',
        href: '/dashboard/relatorios',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        label: 'DRE',
        href: '/dashboard/apuracao',
        icon: <BarChart3 className="w-4 h-4" />,
      },
    ],
  },

  // Catálogo (inclui Estoque e Compras)
  {
    label: 'Catálogo',
    icon: <Package className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia', 'comprador', 'estoquista'],
    children: [
      {
        label: 'Produtos',
        href: '/dashboard/produtos',
        icon: <Package className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'comprador'],
      },
      {
        label: 'Estoque',
        href: '/dashboard/estoque',
        icon: <Boxes className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'comprador', 'estoquista'],
      },
      {
        label: 'Compras',
        href: '/dashboard/compras',
        icon: <ClipboardList className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'comprador'],
      },
      {
        label: 'Depósitos',
        action: 'depositos-modal',
        icon: <Warehouse className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'comprador'],
      },
      {
        label: 'Categorias',
        href: '/dashboard/configuracoes/categorias',
        icon: <CheckSquare className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'comprador'],
      },
      {
        label: 'Fornecedores',
        href: '/dashboard/fornecedores',
        icon: <Truck className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia', 'comprador'],
      },
    ],
  },

  // Configurações
  {
    label: 'Configurações',
    icon: <Settings className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia'],
    children: [
      {
        label: 'Precificação',
        href: '/dashboard/configuracoes/precificacao',
        icon: <DollarSign className="w-4 h-4" />,
        requiredProfiles: ['admin', 'gerencia'],
      },
      {
        label: 'Dados da Empresa',
        href: '/dashboard/configuracoes',
        icon: <Settings className="w-4 h-4" />,
        requiredProfiles: ['admin'],
      },
      {
        label: 'Usuários',
        href: '#',
        icon: <Users className="w-4 h-4" />,
        requiredProfiles: ['admin'],
      },
    ],
  },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function DashboardSidebar({ isOpen, onToggle }: DashboardSidebarProps) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [depositosModalOpen, setDepositosModalOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  // Filtrar itens por role - recursivamente
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (!item.requiredProfiles) return true;
        return item.requiredProfiles.includes((userProfile?.perfil as UserProfile) || '');
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined,
      }));
  };

  const filteredItems = useMemo(
    () => filterItems(navItems),
    [userProfile?.perfil]
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
            <div className="w-10 h-10 bg-gradient-to-br from-mali-primary to-mali-primary-dark rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-mali-secondary">M</span>
            </div>
            {isOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground">Mali</span>
                <span className="text-xs text-muted-foreground">Mobile</span>
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
              <p className="text-muted-foreground capitalize">{userProfile?.perfil}</p>
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
