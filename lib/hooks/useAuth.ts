'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Perfil, Permissao, can, emailEhAdminBootstrap } from '@/lib/auth/permissoes';

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
  avatarURL?: string;
  comissaoPct?: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Busca o perfil do usuário no Firestore.
          const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...(userDocSnap.data() as Omit<UserProfile, 'uid' | 'email'>),
            });
          } else {
            // Primeiro acesso sem perfil cadastrado.
            // - E-mails na lista de bootstrap (NEXT_PUBLIC_ADMIN_EMAILS) viram admin.
            // - Demais ficam SEM ACESSO (inativos), aguardando liberação de um admin.
            const ehAdmin = emailEhAdminBootstrap(firebaseUser.email);
            const novoPerfil = {
              nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              perfil: (ehAdmin ? 'admin' : 'sem_acesso') as Perfil,
              ativo: ehAdmin,
            };
            await setDoc(userDocRef, novoPerfil);
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...novoPerfil,
            });
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Usuário tem acesso ao sistema se está ativo e possui um perfil real.
  const liberado = !!userProfile && userProfile.ativo && userProfile.perfil !== 'sem_acesso';

  return {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    liberado,
    // Helper de permissão amarrado ao perfil atual.
    can: (permissao: Permissao) => can(userProfile?.perfil, permissao),
  };
}
