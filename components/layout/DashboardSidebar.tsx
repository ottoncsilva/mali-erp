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
  Home,
  BarChart3,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredProfiles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: 'Produtos',
    href: '/dashboard/produtos',
    icon: <Package className="w-4 h-4" />,
  },
  {
    label: 'Precificação',
    href: '/dashboard/precificacao',
    icon: <DollarSign className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia'],
  },
  {
    label: 'Fornecedores',
    href: '/dashboard/fornecedores',
    icon: <Truck className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia', 'comprador'],
  },
  {
    label: 'Compras',
    href: '/dashboard/compras',
    icon: <ShoppingCart className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia', 'comprador'],
  },
  {
    label: 'Carteira',
    href: '/dashboard/carteira',
    icon: <Users className="w-4 h-4" />,
    requiredProfiles: ['vendedor', 'gerencia', 'admin'],
  },
  {
    label: 'PDV/Orçamentos',
    href: '/dashboard/balcao',
    icon: <ShoppingCart className="w-4 h-4" />,
    requiredProfiles: ['vendedor', 'gerencia', 'admin'],
  },
  {
    label: 'Entregas',
    href: '/dashboard/entregas',
    icon: <Truck className="w-4 h-4" />,
    requiredProfiles: ['gerencia', 'admin'],
  },
  {
    label: 'Assistência Técnica',
    href: '/dashboard/assistencia',
    icon: <Wrench className="w-4 h-4" />,
    requiredProfiles: ['gerencia', 'admin'],
  },
  {
    label: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: <DollarSign className="w-4 h-4" />,
    requiredProfiles: ['financeiro', 'gerencia', 'admin'],
  },
  {
    label: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: <FileText className="w-4 h-4" />,
    requiredProfiles: ['gerencia', 'admin'],
  },
  {
    label: 'Apuração (DRE)',
    href: '/dashboard/apuracao',
    icon: <BarChart3 className="w-4 h-4" />,
    requiredProfiles: ['admin', 'gerencia'],
  },
  {
    label: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: <Settings className="w-4 h-4" />,
    requiredProfiles: ['admin'],
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const toggleExpanded = (href: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = navItems.filter((item) => {
    if (!item.requiredProfiles) return true;
    return item.requiredProfiles.includes(userProfile?.perfil || '');
  });

  return (
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {filteredItems.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-mali-primary/10 text-mali-primary'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              }`}
              title={!isOpen ? item.label : ''}
            >
              {item.icon}
              {isOpen && <span className="flex-1">{item.label}</span>}
              {item.children && isOpen && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    expandedItems.has(item.href) ? 'rotate-180' : ''
                  }`}
                />
              )}
            </Link>

            {/* Submenu */}
            {item.children && isOpen && expandedItems.has(item.href) && (
              <div className="ml-6 space-y-1 mt-2">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      pathname === child.href
                        ? 'bg-mali-primary/10 text-mali-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {child.icon}
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {isOpen && (
          <div className="px-3 py-2 rounded-md bg-card text-xs">
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
  );
}
