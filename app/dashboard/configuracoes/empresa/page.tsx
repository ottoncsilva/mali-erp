'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useStorageUpload } from '@/lib/hooks';
import { DadosEmpresa } from '@/types';
import {
  mascaraCEP,
  mascaraTelefone,
  mascaraCpfCnpj,
  buscarCEP,
  somenteDigitos,
} from '@/lib/utils/format';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Building2, Save, Loader2, Upload, CheckCircle2, ImageIcon } from 'lucide-react';

const VAZIO: DadosEmpresa = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  inscricaoEstadual: '',
  telefone: '',
  whatsapp: '',
  email: '',
  site: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  logoURL: '',
};

function EmpresaContent() {
  const { uploadFile, loading: uploading } = useStorageUpload();
  const [dados, setDados] = useState<DadosEmpresa>(VAZIO);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'empresa', 'dados'));
        if (snap.exists()) setDados({ ...VAZIO, ...(snap.data() as DadosEmpresa) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (campo: keyof DadosEmpresa, valor: string) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    setSalvo(false);
  };

  const onCepBlur = async () => {
    if (somenteDigitos(dados.cep || '').length !== 8) return;
    setBuscandoCep(true);
    const r = await buscarCEP(dados.cep || '');
    setBuscandoCep(false);
    if (r) {
      setDados((d) => ({ ...d, rua: r.rua, bairro: r.bairro, cidade: r.cidade, uf: r.uf }));
    }
  };

  const onLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, `empresa/logo-${Date.now()}`);
      setDados((d) => ({ ...d, logoURL: url }));
      setSalvo(false);
    } catch {
      alert('Erro ao enviar a logo. Tente novamente.');
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await setDoc(
        doc(db, 'empresa', 'dados'),
        { ...dados, atualizadoEm: new Date() },
        { merge: true }
      );
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
      </div>
    );
  }

  const input = (
    label: string,
    campo: keyof DadosEmpresa,
    opts: { mask?: (v: string) => string; placeholder?: string; onBlur?: () => void } = {}
  ) => (
    <div>
      <label className="text-sm font-medium text-foreground mb-1 block">{label}</label>
      <input
        type="text"
        value={(dados[campo] as string) || ''}
        onChange={(e) => set(campo, opts.mask ? opts.mask(e.target.value) : e.target.value)}
        onBlur={opts.onBlur}
        placeholder={opts.placeholder}
        className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            Dados da Empresa
          </h1>
          <p className="text-muted-foreground mt-2">
            Cadastro completo e identidade visual usados no sistema e nos documentos
          </p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : salvo ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {salvo ? 'Salvo' : 'Salvar'}
        </button>
      </div>

      {/* Logo */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-semibold text-foreground mb-4">Logomarca</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            {dados.logoURL ? (
              <img src={dados.logoURL} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onLogoSelected}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-foreground hover:bg-background disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {dados.logoURL ? 'Trocar logo' : 'Enviar logo'}
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              PNG ou JPG. Aparece no topo do menu e nos PDFs.
            </p>
          </div>
        </div>
      </div>

      {/* Identificação */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Identificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {input('Razão Social', 'razaoSocial')}
          {input('Nome Fantasia', 'nomeFantasia')}
          {input('CNPJ', 'cnpj', { mask: mascaraCpfCnpj, placeholder: '00.000.000/0000-00' })}
          {input('Inscrição Estadual', 'inscricaoEstadual')}
        </div>
      </div>

      {/* Contato */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Contato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {input('Telefone', 'telefone', { mask: mascaraTelefone, placeholder: '(00) 0000-0000' })}
          {input('WhatsApp', 'whatsapp', { mask: mascaraTelefone, placeholder: '(00) 00000-0000' })}
          {input('E-mail', 'email', { placeholder: 'contato@empresa.com' })}
          {input('Site', 'site', { placeholder: 'www.empresa.com' })}
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Endereço</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            {input('CEP', 'cep', { mask: mascaraCEP, placeholder: '00000-000', onBlur: onCepBlur })}
            {buscandoCep && (
              <Loader2 className="w-4 h-4 animate-spin text-mali-primary absolute right-3 top-9" />
            )}
          </div>
          <div className="sm:col-span-2">{input('Rua / Logradouro', 'rua')}</div>
          {input('Número', 'numero')}
          {input('Complemento', 'complemento')}
          {input('Bairro', 'bairro')}
          {input('Cidade', 'cidade')}
          {input('UF', 'uf')}
        </div>
      </div>
    </div>
  );
}

export default function EmpresaPage() {
  return (
    <ProtegerPagina permissao="config.empresa">
      <EmpresaContent />
    </ProtegerPagina>
  );
}
