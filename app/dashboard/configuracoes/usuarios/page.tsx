'use client';

import { useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { db, getSecondaryAuth } from '@/lib/firebase/config';
import { useCollection, useAuth } from '@/lib/hooks';
import { Usuario } from '@/types';
import {
  Perfil,
  PERFIS_ATRIBUIVEIS,
  PERFIL_LABEL,
  PERFIL_DESCRICAO,
} from '@/lib/auth';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { UserPlus, Pencil, Mail, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

const PERFIL_BADGE: Record<Perfil, string> = {
  admin: 'bg-mali-primary/20 text-mali-primary',
  gerencia: 'bg-blue-500/20 text-blue-600',
  vendedor: 'bg-emerald-500/20 text-emerald-600',
  comprador: 'bg-purple-500/20 text-purple-600',
  financeiro: 'bg-amber-500/20 text-amber-600',
  estoquista: 'bg-cyan-500/20 text-cyan-600',
  sem_acesso: 'bg-gray-400/20 text-gray-500',
};

interface FormState {
  nome: string;
  email: string;
  perfil: Exclude<Perfil, 'sem_acesso'>;
  comissaoPct: number;
}

const FORM_VAZIO: FormState = { nome: '', email: '', perfil: 'vendedor', comissaoPct: 0 };

function UsuariosContent() {
  const { userProfile } = useAuth();
  const { data: usuarios, loading } = useCollection<Usuario>('usuarios');

  const [modalOpen, setModalOpen] = useState(false);
  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const abrirNovo = () => {
    setEditandoUid(null);
    setForm(FORM_VAZIO);
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (u: Usuario & { id: string }) => {
    setEditandoUid(u.id);
    setForm({
      nome: u.nome || '',
      email: u.email || '',
      perfil: (u.perfil === 'sem_acesso' ? 'vendedor' : u.perfil) as FormState['perfil'],
      comissaoPct: u.comissaoPct || 0,
    });
    setErro('');
    setModalOpen(true);
  };

  // Edição: atualiza apenas perfil/comissão (doc id = uid).
  const salvarEdicao = async () => {
    if (!editandoUid) return;
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, 'usuarios', editandoUid), {
        nome: form.nome,
        perfil: form.perfil,
        comissaoPct: form.comissaoPct,
        ativo: true,
        atualizadoEm: new Date(),
      });
      setModalOpen(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  // Convite: cria a conta numa instância secundária (não desloga o admin),
  // grava o perfil com o uid e envia e-mail para a pessoa definir a senha.
  const convidar = async () => {
    setSalvando(true);
    setErro('');
    setAviso('');
    if (!form.nome.trim() || !form.email.trim()) {
      setErro('Preencha nome e e-mail.');
      setSalvando(false);
      return;
    }
    const secondaryAuth = getSecondaryAuth();
    try {
      const senhaTemporaria = `Mali#${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        form.email.trim(),
        senhaTemporaria
      );
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nome: form.nome.trim(),
        email: form.email.trim(),
        perfil: form.perfil,
        comissaoPct: form.comissaoPct,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      });
      // Envia o e-mail de definição de senha e encerra a sessão secundária.
      await sendPasswordResetEmail(secondaryAuth, form.email.trim());
      await signOut(secondaryAuth);
      setAviso(`Convite enviado para ${form.email.trim()}. A pessoa receberá um e-mail para definir a senha.`);
      setModalOpen(false);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErro('Este e-mail já possui uma conta. Edite o usuário existente.');
      } else if (code === 'auth/invalid-email') {
        setErro('E-mail inválido.');
      } else {
        setErro(e instanceof Error ? e.message : 'Erro ao criar usuário');
      }
    } finally {
      setSalvando(false);
    }
  };

  // Ativa/desativa um usuário (sem excluir a conta de auth).
  const toggleAtivo = async (u: Usuario & { id: string }) => {
    if (u.id === userProfile?.uid) return; // não desativa a si mesmo
    await updateDoc(doc(db, 'usuarios', u.id), {
      ativo: !u.ativo,
      atualizadoEm: new Date(),
    });
  };

  const columns = [
    {
      header: 'Nome',
      accessor: 'nome',
      render: (v: string, row: Usuario & { id: string }) => (
        <div>
          <p className="text-foreground font-medium">{v || '—'}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Perfil',
      accessor: 'perfil',
      render: (perfil: Perfil) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${PERFIL_BADGE[perfil] || ''}`}>
          {PERFIL_LABEL[perfil] || perfil}
        </span>
      ),
    },
    {
      header: 'Comissão',
      accessor: 'comissaoPct',
      render: (v: number) => (v ? `${v}%` : '—'),
    },
    {
      header: 'Status',
      accessor: 'ativo',
      render: (ativo: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            ativo ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-400/20 text-gray-500'
          }`}
        >
          {ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (_: string, row: Usuario & { id: string }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => abrirEdicao(row)}
            className="p-1.5 rounded hover:bg-background transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => toggleAtivo(row)}
            disabled={row.id === userProfile?.uid}
            className="px-2 py-1 text-xs rounded border border-border hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={row.id === userProfile?.uid ? 'Você não pode se desativar' : ''}
          >
            {row.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-2">Gerencie acessos, perfis e comissões</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Convidar Usuário
        </button>
      </div>

      {aviso && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">{aviso}</p>
        </div>
      )}

      <Table columns={columns} data={usuarios} loading={loading} emptyMessage="Nenhum usuário cadastrado" />

      <Modal
        isOpen={modalOpen}
        title={editandoUid ? 'Editar Usuário' : 'Convidar Usuário'}
        onClose={() => setModalOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">E-mail</label>
            <input
              type="email"
              value={form.email}
              disabled={!!editandoUid}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-60"
              placeholder="email@exemplo.com"
            />
            {editandoUid && (
              <p className="text-xs text-muted-foreground mt-1">
                O e-mail não pode ser alterado após a criação.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Perfil</label>
            <select
              value={form.perfil}
              onChange={(e) => setForm({ ...form, perfil: e.target.value as FormState['perfil'] })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              {PERFIS_ATRIBUIVEIS.map((p) => (
                <option key={p} value={p}>
                  {PERFIL_LABEL[p]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">{PERFIL_DESCRICAO[form.perfil]}</p>
          </div>

          {(form.perfil === 'vendedor' || form.perfil === 'gerencia') && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Comissão (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.comissaoPct}
                onChange={(e) => setForm({ ...form, comissaoPct: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          )}

          {!editandoUid && (
            <div className="flex items-start gap-2 p-3 bg-mali-primary/5 border border-mali-primary/20 rounded-md">
              <Mail className="w-4 h-4 text-mali-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                A pessoa receberá um e-mail para definir a própria senha e poderá acessar o sistema
                em seguida.
              </p>
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{erro}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-background transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={editandoUid ? salvarEdicao : convidar}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              {editandoUid ? 'Salvar' : 'Enviar Convite'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <ProtegerPagina permissao="usuarios.gerir">
      <UsuariosContent />
    </ProtegerPagina>
  );
}
