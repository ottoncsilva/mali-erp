'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Perfil,
  Permissao,
  PERMISSOES_POR_PERFIL,
  LIMITE_PONTUACAO,
  PERFIL_LABEL,
  emailEhAdminBootstrap,
} from '@/lib/auth/permissoes';

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  perfil: Perfil | string;
  ativo: boolean;
  avatarURL?: string;
  comissaoPct?: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Permissões e metadados resolvidos a partir do cargo (dinâmico) com
  // fallback para os cargos padrão definidos em código.
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [cargoNome, setCargoNome] = useState<string>('');
  const [limitePontuacao, setLimitePontuacao] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let perfilResolvido: UserProfile;

          if (userDocSnap.exists()) {
            perfilResolvido = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...(userDocSnap.data() as Omit<UserProfile, 'uid' | 'email'>),
            };
          } else {
            // Primeiro acesso sem perfil: admin (bootstrap) ou sem_acesso.
            const ehAdmin = emailEhAdminBootstrap(firebaseUser.email);
            const novoPerfil = {
              nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              perfil: (ehAdmin ? 'admin' : 'sem_acesso') as Perfil,
              ativo: ehAdmin,
            };
            await setDoc(userDocRef, novoPerfil);
            perfilResolvido = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...novoPerfil,
            };
          }

          setUserProfile(perfilResolvido);

          // Resolve permissões/limite/nome do cargo. Fallback: cargos padrão.
          const chave = perfilResolvido.perfil;
          let perms: string[] = PERMISSOES_POR_PERFIL[chave as Perfil] ?? [];
          let limite = LIMITE_PONTUACAO[chave as Perfil] ?? 0;
          let nome = PERFIL_LABEL[chave as Perfil] ?? chave;
          try {
            const cargoSnap = await getDoc(doc(db, 'cargos', chave));
            if (cargoSnap.exists()) {
              const c = cargoSnap.data();
              perms = Array.isArray(c.permissoes) ? c.permissoes : perms;
              limite = typeof c.limitePontuacao === 'number' ? c.limitePontuacao : limite;
              nome = c.nome || nome;
            }
          } catch {
            // Sem doc de cargo (ainda não semeado): usa o fallback.
          }
          setPermissoes(perms);
          setLimitePontuacao(limite);
          setCargoNome(nome);
        } else {
          setUser(null);
          setUserProfile(null);
          setPermissoes([]);
          setCargoNome('');
          setLimitePontuacao(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const liberado =
    !!userProfile && userProfile.ativo && userProfile.perfil !== 'sem_acesso';

  return {
    user,
    userProfile,
    permissoes,
    cargoNome,
    limitePontuacao,
    loading,
    error,
    isAuthenticated: !!user,
    liberado,
    can: (permissao: Permissao) => permissoes.includes(permissao),
  };
}
