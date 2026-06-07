'use client';

import { useMemo, useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { db, getSecondaryAuth } from '@/lib/firebase/config';
import { useCollection, useAuth } from '@/lib/hooks';
import { Usuario, Cargo } from '@/types';
import { mascaraTelefone, mascaraCpfCnpj } from '@/lib/utils/format';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import {
  UserPlus,
  Pencil,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  IdCard,
  KeyRound,
  Percent,
} from 'lucide-react';

interface FormState {
  nome: string;
  email: string;
  perfil: string;
  // Comissão: string vazia = usa % padrão do cargo
  comissaoPct: string;
  telefone: string;
  cpf: string;
  cargoTexto: string;
  pix: string;
  observacoes: string;
}

const FORM_VAZIO: FormState = {
  nome: '',
  email: '',
  perfil: '',
  comissaoPct: '',
  telefone: '',
  cpf: '',
  cargoTexto: '',
  pix: '',
  observacoes: '',
};

type Aba = 'dados' | 'acesso' | 'comissao';

function UsuariosContent() {
  const { userProfile } = useAuth();
  const { data: usuarios, loading } = useCollection<Usuario>('usuarios');
  const { data: cargos } = useCollection<Cargo>('cargos');

  const [modalOpen, setModalOpen] = useState(false);
  const [aba, setAba] = useState<Aba>('dados');
  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const cargosAtribuiveis = useMemo(
    () => cargos.filter((c) => c.id !== 'sem_acesso').sort((a, b) => a.nome.localeCompare(b.nome)),
    [cargos]
  );
  const cargoPorId = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);
  const cargoSelecionado = cargoPorId.get(form.perfil);

  const set = (campo: keyof FormState, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const abrirNovo = () => {
    setEditandoUid(null);
    setForm({ ...FORM_VAZIO, perfil: cargosAtribuiveis[0]?.id || 'vendedor' });
    setAba('dados');
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (u: Usuario & { id: string }) => {
    setEditandoUid(u.id);
    setForm({
      nome: u.nome || '',
      email: u.email || '',
      perfil: u.perfil === 'sem_acesso' ? cargosAtribuiveis[0]?.id || 'vendedor' : u.perfil,
      comissaoPct: typeof u.comissaoPct === 'number' ? String(u.comissaoPct) : '',
      telefone: u.telefone || '',
      cpf: u.cpf || '',
      cargoTexto: u.cargoTexto || '',
      pix: u.pix || '',
      observacoes: u.observacoes || '',
    });
    setAba('dados');
    setErro('');
    setModalOpen(true);
  };

  // Monta o payload comum (dados cadastrais + comissão override).
  const payloadComum = () => {
    const comissao = form.comissaoPct.trim();
    return {
      nome: form.nome.trim(),
      perfil: form.perfil,
      telefone: form.telefone,
      cpf: form.cpf,
      cargoTexto: form.cargoTexto,
      pix: form.pix,
      observacoes: form.observacoes,
      comissaoPct: comissao === '' ? null : parseFloat(comissao) || 0,
      atualizadoEm: new Date(),
    };
  };

  const salvarEdicao = async () => {
    if (!editandoUid) return;
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, 'usuarios', editandoUid), { ...payloadComum(), ativo: true });
      setModalOpen(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

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
        ...payloadComum(),
        email: form.email.trim(),
        ativo: true,
        criadoEm: new Date(),
      });
      await sendPasswordResetEmail(secondaryAuth, form.email.trim());
      await signOut(secondaryAuth);
      setAviso(
        `Convite enviado para ${form.email.trim()}. A pessoa receberá um e-mail para definir a senha.`
      );
      setModalOpen(false);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErro('Este e-mail já possui uma conta. Edite o colaborador existente.');
      } else if (code === 'auth/invalid-email') {
        setErro('E-mail inválido.');
      } else {
        setErro(e instanceof Error ? e.message : 'Erro ao criar colaborador');
      }
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (u: Usuario & { id: string }) => {
    if (u.id === userProfile?.uid) return;
    await updateDoc(doc(db, 'usuarios', u.id), { ativo: !u.ativo, atualizadoEm: new Date() });
  };

  const columns = [
    {
      header: 'Colaborador',
      accessor: 'nome',
      render: (v: string, row: Usuario & { id: string }) => (
        <div>
          <p className="text-foreground font-medium">{v || '—'}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Cargo',
      accessor: 'perfil',
      render: (perfil: string) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-mali-primary/15 text-mali-primary">
          {cargoPorId.get(perfil)?.nome || perfil}
        </span>
      ),
    },
    {
      header: 'Comissão',
      accessor: 'comissaoPct',
      render: (v: number | undefined, row: Usuario & { id: string }) => {
        const cargo = cargoPorId.get(row.perfil);
        if (typeof v === 'number') return `${v}%`;
        if (cargo?.comissaoAtiva) return <span className="text-muted-foreground">{cargo.comissaoPct}% (padrão)</span>;
        return '—';
      },
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
          <button onClick={() => abrirEdicao(row)} className="p-1.5 rounded hover:bg-background" title="Editar">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => toggleAtivo(row)}
            disabled={row.id === userProfile?.uid}
            className="px-2 py-1 text-xs rounded border border-border hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {row.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ),
    },
  ];

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'dados', label: 'Dados', icon: <IdCard className="w-4 h-4" /> },
    { id: 'acesso', label: 'Acesso', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'comissao', label: 'Comissão', icon: <Percent className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground mt-2">Cadastro, acesso e comissão da equipe</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90"
        >
          <UserPlus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      {aviso && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">{aviso}</p>
        </div>
      )}

      <Table columns={columns} data={usuarios} loading={loading} emptyMessage="Nenhum colaborador cadastrado" />

      <Modal
        isOpen={modalOpen}
        title={editandoUid ? 'Editar Colaborador' : 'Novo Colaborador'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {/* Abas */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                aba === a.id
                  ? 'border-mali-primary text-mali-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {aba === 'dados' && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => set('nome', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => set('telefone', mascaraTelefone(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => set('cpf', mascaraCpfCnpj(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Função (descritiva)
                  </label>
                  <input
                    type="text"
                    value={form.cargoTexto}
                    onChange={(e) => set('cargoTexto', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="Ex: Vendedor de loja"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Chave PIX (pagamentos)
                  </label>
                  <input
                    type="text"
                    value={form.pix}
                    onChange={(e) => set('pix', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => set('observacoes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
            </>
          )}

          {aba === 'acesso' && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">E-mail (login)</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={!!editandoUid}
                  onChange={(e) => set('email', e.target.value)}
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
                <label className="text-sm font-medium text-foreground mb-1 block">Cargo</label>
                <select
                  value={form.perfil}
                  onChange={(e) => set('perfil', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                >
                  {cargosAtribuiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Define as permissões. Gerencie cargos em Configurações › Cargos & Permissões.
                </p>
              </div>
              {!editandoUid && (
                <div className="flex items-start gap-2 p-3 bg-mali-primary/5 border border-mali-primary/20 rounded-md">
                  <Mail className="w-4 h-4 text-mali-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    A pessoa receberá um e-mail para definir a própria senha e poderá acessar o
                    sistema em seguida.
                  </p>
                </div>
              )}
            </>
          )}

          {aba === 'comissao' && (
            <>
              <div className="p-3 rounded-md bg-background border border-border text-sm">
                {cargoSelecionado?.comissaoAtiva ? (
                  <p className="text-muted-foreground">
                    Cargo <strong className="text-foreground">{cargoSelecionado.nome}</strong> tem
                    comissão de <strong className="text-foreground">{cargoSelecionado.comissaoPct}%</strong>{' '}
                    sobre {cargoSelecionado.baseComissao === 'vista' ? 'o preço à vista' : cargoSelecionado.baseComissao === 'proposta' ? 'a proposta' : 'a margem'}.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    O cargo selecionado não tem comissão ativa. Ative em Configurações › Comissões.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  % de comissão (override)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.comissaoPct}
                  onChange={(e) => set('comissaoPct', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  placeholder={`Deixe vazio para usar o padrão do cargo${cargoSelecionado?.comissaoAtiva ? ` (${cargoSelecionado.comissaoPct}%)` : ''}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preencha apenas se este colaborador tem um percentual diferente do cargo.
                </p>
              </div>
            </>
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
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-background"
            >
              Cancelar
            </button>
            <button
              onClick={editandoUid ? salvarEdicao : convidar}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
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
