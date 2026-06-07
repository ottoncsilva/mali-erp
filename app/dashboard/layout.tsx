'use client';

import { useAuth } from '@/lib/hooks';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, liberado, userProfile, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-mali-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Usuário autenticado mas sem perfil liberado (inativo ou aguardando
  // aprovação de um administrador).
  if (!liberado) {
    const handleLogout = async () => {
      await signOut(auth);
      router.push('/login');
    };
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center bg-card border border-border rounded-lg p-8 space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-full">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Acesso pendente</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta <span className="font-medium text-foreground">{userProfile?.email}</span> foi
            criada, mas ainda não tem um perfil liberado. Peça a um administrador para liberar seu
            acesso em <span className="font-medium">Configurações › Usuários</span>.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background/50 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
