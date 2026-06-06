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

#### 📝 Fase 2: Core Catálogo (Próxima)
- [ ] CRUD Categorias
- [ ] CRUD Fornecedores
- [ ] CRUD Variáveis de Acabamento
- [ ] CRUD Produtos com upload de fotos (Firebase Storage)
- [ ] Cálculo de CMV e precificação
- [ ] Controle de estoque e alertas

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

---

**Última atualização**: 2026-06-06 - Fase 1 Completa ✅
