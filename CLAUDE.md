# Mali Mobile ERP - Documentação para Claude

## 📋 Visão Geral
Sistema de gestão completo para loja de móveis **Mali Mobile**, construído com Next.js 16, Firebase (Auth + Firestore), MinIO (imagens) e Tailwind CSS v4.

## 🎨 Identidade Visual
- **Cor Primária**: Âmbar/Dourado (`#D4AF37`)
- **Cor Secundária**: Cinza-Azul (`#5A6B7C`)
- **Modo**: **Light Theme** (fundo branco/claro com acentos dourados)
- **Componentes**: UI customizada (Tailwind v4)

## 🏗️ Arquitetura

### Stack
- **Framework**: Next.js 16 (App Router)
- **Banco de Dados**: Firebase Firestore (NoSQL)
- **Autenticação**: Firebase Auth
- **Armazenamento de Fotos**: **MinIO** (S3-compatível, auto-hospedado na VPS)
- **Styling**: Tailwind CSS v4 (config CSS-first via `@theme` em `app/globals.css`)
- **Gráficos**: Recharts
- **PDFs**: @react-pdf/renderer
- **Deploy**: Docker + EasyPanel → VPS Hostinger

### Tema (Tailwind v4)
- Tema definido em `app/globals.css` no bloco `@theme` (fonte única de cores).
- `tailwind.config.ts` contém apenas os `content` paths.
- Tema light por padrão (sem classe `dark` no `<html>`).

### Armazenamento de Imagens (MinIO)
- Imagens enviadas via rota de API server-side: `app/api/upload/route.ts`.
- Credenciais do MinIO ficam **apenas no servidor** (variáveis `MINIO_*`).
- Bucket público para leitura → URLs abrem direto no navegador.
- Cliente MinIO em `lib/minio/config.ts`; hook `useStorageUpload` chama `/api/upload`.

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

### Variáveis Necessárias (.env.local / EasyPanel)
```
# Firebase (Auth + Firestore) — públicas (build-time)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# MinIO (imagens) — SOMENTE SERVIDOR (sem NEXT_PUBLIC_)
MINIO_ENDPOINT=outros-minio.rbhavy.easypanel.host
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_BUCKET=mali-produtos
MINIO_PUBLIC_URL=https://outros-minio.rbhavy.easypanel.host
```

### Segurança Firestore
- Regras em `firestore.rules` (publicar via Console do Firebase ou `firebase deploy`).
- Leitura pública **apenas** de orçamentos (`atendimentos` com `tipo == 'orcamento'`)
  e do catálogo (`produtos`, `variaveis_acabamento`).
- Demais coleções (clientes, etc.) exigem autenticação. Página pública usa
  campos denormalizados (`clienteNome`, `clienteTelefone`) no atendimento.

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
- `uploadFile(file, path)` - Upload para o MinIO via `/api/upload` (retorna URL pública)
- `deleteFile(path)` - Remove arquivo do MinIO via `/api/upload`

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

## 📍 Rotas Implementadas (URLs `/dashboard/*`)

> Estrutura de pastas: `app/dashboard/*` (rota real `/dashboard`).
> A raiz `/` redireciona para `/login`; após login vai para `/dashboard`.

### Dashboard & CRM
- `/dashboard` - Dashboard com KPIs reais (faturamento, ticket, estoque crítico)
- `/dashboard/clientes` - CRUD Clientes
- `/dashboard/orcamentos` - Lista de orçamentos + botão "Adicionar Novo Orçamento" (abre PDV em modal)
- `/dashboard/carteira` - Carteira do vendedor (pipeline)

### Catálogo
- `/dashboard/produtos` - CRUD Produtos com fotos (MinIO)
- `/dashboard/fornecedores` - CRUD Fornecedores
- `/dashboard/configuracoes/categorias` - CRUD Categorias
- `/dashboard/configuracoes/acabamentos` - CRUD Acabamentos

### Configurações (admin/gerência)
- `/dashboard/configuracoes` - Painel de configurações
- `/dashboard/configuracoes/precificacao` - Pontuação e Travas (movido de `/dashboard/precificacao`)

### Operações & Financeiro
- `/dashboard/entregas`, `/dashboard/assistencia`
- `/dashboard/financeiro`, `/dashboard/relatorios`, `/dashboard/apuracao`

### Público & API
- `/orcamento/[id]` - Página pública do orçamento (sem login)
- `/api/upload` - Rota server-side de upload/remoção de imagens no MinIO

### PDV (Balcão)
- O PDV **não é mais uma página separada** — virou um modal (`components/modules/PDVModal.tsx`)
  acionado pelo botão "Adicionar Novo Orçamento" em `/dashboard/orcamentos`.

## 📦 Módulos de Estoque & Compras

### Menu
- **Vendas** (CRM + Vendas unificados): Clientes, Orçamentos, Carteira.
- **Catálogo**: Produtos, **Estoque**, **Compras**, Categorias, Fornecedores.

### Localizações de Estoque
Cada produto tem saldo por localização física (`lib/estoque`, tipo `LocalizacaoEstoque`):
- `comprado` — comprado / em trânsito (não disponível para venda)
- `showroom` — exposição (disponível)
- `deposito` — depósito (disponível)
- `entrega` — em entrega (reservado)

Disponível para venda = `showroom + deposito`.

### Coleções Firestore (novas)
- `estoque` — saldo por localização. Id composto: `${produtoId}_${localizacao}`.
- `movimentacoes_estoque` — trilha de auditoria imutável (entrada/saída/ajuste/transferência).
- `pedidos_compra` — pedidos de compra (numeração `PC-ano-NNNN`).
- `notas_fiscais` — notas fiscais de entrada com rateio de frete e CMV por item.
- `contadores` — numeração sequencial atômica de PC/NF.

### Lógica central (`lib/estoque/`)
- `calculos.ts` — `ratearFreteECalcularCMV` (rateio proporcional do frete + CMV), `calcularTotaisNota`.
- `movimentacoes.ts` — `registrarEntrada/Saida/Transferencia/Ajuste` (transações Firestore + denormalização de `estoqueAtual`).
- `compras.ts` — `registrarNotaFiscal` (entrada de estoque + atualização de CMV do produto + conta a pagar + baixa do pedido).
- `vendas.ts` — `baixarEstoquePorVenda` (prioriza showroom→depósito) e `dispararPedidosEncomenda` (agrupa por fornecedor).
- `numeracao.ts` — `proximoNumero('PC' | 'NF')`.

### Fluxo de Venda (PDV)
Ao **finalizar uma venda**, cada item tem modalidade:
- **Estoque**: baixa do estoque disponível (showroom→depósito).
- **Sob encomenda**: gera pedido de compra automaticamente (agrupado por fornecedor),
  vinculado ao atendimento de origem (`atendimentoOrigemId`).

### Composição de CMV na Nota Fiscal
```
subtotalItem = custoUnitário × qtd
freteRateado = (subtotalItem / subtotalGeral) × freteTotal
CMV unitário = custoUnitário + (freteRateado + ICMS + IPI) / qtd
```
Ao registrar a NF, os componentes de custo do produto (`custoProduto`, `icms`, `ipi`, `frete`)
são atualizados por unidade, mantendo compatibilidade com `calcularCMV`.

---

**Última atualização**: 2026-06-07 - Módulos de Estoque e Compras, menu Vendas unificado,
venda com baixa de estoque / pedido sob encomenda, rateio de frete e composição de CMV ✅
