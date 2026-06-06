'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  perfil: 'admin' | 'gerencia' | 'vendedor' | 'comprador' | 'financeiro' | 'estoquista';
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

          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...userDocSnap.data(),
            } as UserProfile);
          } else {
            // Primeiro acesso: cria perfil admin padrão automaticamente.
            // Contas só são criadas manualmente pelo dono no Firebase Console,
            // então o primeiro a logar é o administrador do sistema.
            const novoPerfil = {
              nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Administrador',
              perfil: 'admin' as const,
              ativo: true,
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

  return {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
  };
}
