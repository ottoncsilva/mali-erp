# Mali Mobile ERP - Documentação para Claude

## 📋 Visão Geral
Sistema de gestão completo para loja de móveis **Mali Mobile**, construído com Next.js 14, Firebase e Tailwind CSS. Desenvolvido em 5 fases estruturadas.

## 🎨 Identidade Visual
- **Cor Primária**: Âmbar/Dourado (`#D4AF37`)
- **Cor Secundária**: Cinza-Azul (`#5A6B7C`)
- **Modo**: Dark Theme com acentos dourados
- **Componentes**: Shadcn/ui customizado

## 🏗️ Arquitetura

### Stack
- **Framework**: Next.js 14 (App Router)
- **Banco de Dados**: Firebase Firestore (NoSQL)
- **Autenticação**: Firebase Auth
- **Armazenamento de Fotos**: Firebase Storage
- **Styling**: Tailwind CSS + Shadcn/ui
- **Gráficos**: Recharts
- **PDFs**: @react-pdf/renderer
- **Deploy**: Docker + GitHub Actions → VPS Hostinger

### Fases de Desenvolvimento

#### ✅ Fase 1: Setup e Autenticação (COMPLETO)
- [x] Next.js 14 + TypeScript + Tailwind
- [x] Configuração Firebase (Auth, Firestore, Storage)
- [x] Sistema de autenticação com email/senha
- [x] Layout base com Sidebar colapsável
- [x] Dashboard principal com KPIs
- [x] Tipos TypeScript para modelo de dados

#### ✅ Fase 2: Core Catálogo (COMPLETO)
- [x] CRUD Categorias (Status ativo/inativo)
- [x] CRUD Fornecedores (CNPJ, contatos, prazo entrega)
- [x] CRUD Variáveis de Acabamento (Tecidos, cores, lateralidades)
- [x] CRUD Produtos com upload de fotos (Firebase Storage)
- [x] Cálculo automático de CMV (Custo + ICMS + IPI + Frete)
- [x] Precificação com Pontuação (Padrão ou Especial)
- [x] Controle de estoque com alertas
- [x] Configurações globais (Pontuação Padrão, Travas)

#### 🛒 Fase 3: Balcão de Vendas (Motor)
- [ ] Interface PDV com busca de produtos
- [ ] Motor de simulação de condições (parcelamento)
- [ ] Cálculo reverso de Pontuação
- [ ] Travas de negociação por perfil
- [ ] Orçamento vs Venda
- [ ] PDF de orçamento com fotos

#### 👥 Fase 4: CRM + Integrações
- [ ] Carteira do Vendedor (Pipeline Kanban)
- [ ] Gerador de PDF (Orçamento, Comprovante)
- [ ] Integração WhatsApp (envio de orçamento)
- [ ] Follow-up automático

#### 📊 Fase 5: Operação & DRE
- [ ] Entregas e Montagem (Calendário)
- [ ] Assistência Técnica (Pós-venda)
- [ ] Financeiro (Contas a Pagar/Receber)
- [ ] DRE (Apuração de Resultado)
- [ ] Relatórios operacionais

## 🔐 Perfis de Acesso
| Perfil | Dashboard | CRM | PDV | Custo/CMV | Financeiro | DRE | Trava Mínima |
|--------|-----------|-----|-----|-----------|-----------|-----|--------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Ilimitado |
| Gerência | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1.5 |
| Vendedor | Resumido | ✅ | ✅ | ❌ | ❌ | ❌ | 1.8 |
| Comprador | Resumido | ❌ | ❌ | ✅ | ❌ | ❌ | - |
| Financeiro | Resumido | ❌ | ❌ | ❌ | ✅ | ❌ | - |
| Estoquista | Resumido | ❌ | ❌ | ❌ | ❌ | ❌ | - |

## 🔧 Configuração de Ambiente

### Variáveis Necessárias (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

## 📌 Convenções e Regras

### Código
- **Componentes**: Use `'use client'` no topo para client-side
- **Nomes**: camelCase para variáveis, PascalCase para componentes
- **Cores**: Usar `mali-primary`, `mali-secondary` do Tailwind
- **Ícones**: Sempre usar Lucide React

### Commit Messages
Siga o padrão:
```
feat(phase-X): Descrição breve

- Detalhe 1
- Detalhe 2

https://claude.ai/code/session_...
```

### Precificação (Regra de Negócio)
```
CMV = Custo + ICMS + IPI + Frete
Preço à Vista = CMV × Pontuação (ex: 2.0)
Desconto Oferecido = Preço Tabela - Preço Aplicado
Pontuação Real = CMV / Preço Aplicado
```

**Travas por Perfil**:
- Vendedor: Não pode cobrar com Pontuação < 1.8
- Gerência: Não pode cobrar com Pontuação < 1.5
- Admin: Sem limites

## 🔧 Hooks Reutilizáveis

### useFirestore.ts
- `useCollection<T>(collectionName)` - Fetch real-time de collection
- `useAddDocument(collectionName)` - Add novo documento
- `useUpdateDocument(collectionName)` - Atualiza documento
- `useDeleteDocument(collectionName)` - Deleta documento

### useStorageUpload.ts
- `uploadFile(file, path)` - Upload de arquivo para Firebase Storage
- `deleteFile(path)` - Deleta arquivo do Storage

## 📦 Componentes UI Reutilizáveis

### Table.tsx
```tsx
<Table 
  columns={[{ header: 'Nome', accessor: 'nome', render: (val, row) => ... }]}
  data={dados}
  loading={isLoading}
/>
```

### Modal.tsx
```tsx
<Modal 
  isOpen={isOpen} 
  title="Título" 
  onClose={handleClose}
  size="lg"
>
  Conteúdo do modal
</Modal>
```

## 📍 Rotas Implementadas

### Catálogo
- `/dashboard/produtos` - CRUD Produtos com fotos
- `/dashboard/configuracoes/categorias` - CRUD Categorias
- `/dashboard/fornecedores` - CRUD Fornecedores
- `/dashboard/configuracoes/acabamentos` - CRUD Acabamentos
- `/dashboard/precificacao` - Configuração de Pontuação e Travas

---

**Última atualização**: 2026-06-06 - Fase 2 Completa ✅
