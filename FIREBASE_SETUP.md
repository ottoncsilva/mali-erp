# 🔥 Firebase Setup - Guia Visual Completo

## 🎯 O que vamos fazer

```
Firebase Console (Criar Projeto)
    ↓
Registrar App Web
    ↓
Obter Credenciais
    ↓
Ativar Autenticação
    ↓
Criar Firestore
    ↓
Ativar Storage
    ↓
Preencheer .env.local
    ↓
Testar Localmente
```

---

## 📱 PASSO 1: Acessar Firebase Console

### URL
```
https://console.firebase.google.com
```

**Você verá:**
```
┌─────────────────────────────────────┐
│  Firebase Console                   │
│  ┌─────────────────────────────┐   │
│  │ Bem-vindo ao Firebase       │   │
│  │                             │   │
│  │ [Criar projeto]             │   │
│  │ [Importar projeto]          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🆕 PASSO 2: Criar Novo Projeto

### Clique em "Criar projeto"

**Formulário 1:**
```
Título: Mali Mobile
    ↓
[Continuar]
```

**Formulário 2:**
```
☐ Ativar Google Analytics
    ↓
[Criar projeto]
```

⏳ **Aguarde 2-3 minutos...**

Você verá:
```
Seu projeto está pronto!
Mali Mobile
```

---

## 💻 PASSO 3: Registrar App Web

### No painel principal, clique no ícone web `</>`

**Você verá:**
```
Bem-vindo ao Firebase

Adicionar um app para começar

[Selecione uma plataforma]
  • Web     ← CLIQUE AQUI
  • iOS
  • Android
```

### Preencha o formulário

```
Apelido do app:
[mali-mobile-web]

☐ Também configure o Firebase Hosting para este app

[Registrar app]
```

---

## 🔑 PASSO 4: Copiar Credenciais

### Após registrar, você verá um bloco assim:

```javascript
// For Firebase JS SDK v7.20.0 and later, 
// download the SDK at https://www.gstatic.com/firebasejs/...

import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSy...",                         ← COPIE AQUI
  authDomain: "mali-mobile-xxx.firebaseapp.com",
  projectId: "mali-mobile-xxx",
  storageBucket: "mali-mobile-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};

const app = initializeApp(firebaseConfig);
```

### Copie EXATAMENTE as 6 linhas acima

**Não esqueça:**
```
✓ apiKey
✓ authDomain
✓ projectId
✓ storageBucket
✓ messagingSenderId
✓ appId
```

---

## 🔐 PASSO 5: Ativar Autenticação

### No menu esquerdo, clique "Autenticação"

```
┌─────────────────────┐
│ Autenticação        │
│ Sign-in method      │ ← CLIQUE
│ Users               │
│ Templates           │
└─────────────────────┘
```

### Na aba "Sign-in method"

```
Provedores de login disponíveis:

☐ Email/Senha        ← HABILITE
☐ Telefone
☐ Google
...

[Clique em Email/Senha]
```

### Habilite Email/Senha

```
Email/Senha

Ativar este provedor
☑ Habilitado

☑ Permitir inscrição para contas novas
☑ Permitir redefinição de senha

[Salvar]
```

---

## 📊 PASSO 6: Criar Firestore Database

### No menu esquerdo, clique "Cloud Firestore"

```
┌─────────────────────┐
│ Firestore Database  │
│ Início              │
│ Data                │
│ Índices             │
│ Rules               │
└─────────────────────┘
```

### Clique "Criar banco de dados"

```
Criar um banco de dados do Cloud Firestore

Selecione um local para seu banco de dados
[Selecionar região]

Preferência sugerida:
↓
nam5 (us-central)

[nam5 - United States (multiple)]
```

### Configurar modo de segurança

```
Modo de segurança inicial:
○ Modo de teste (Desenvolvimento)  ← SELECIONE
○ Modo de produção (Bloqueado)

Modo de teste:
✓ Permite leitura e escrita
✓ Válido por 30 dias
! Depois mude para produção

[Próximo]
```

### Confirmar

```
Localização: nam5 (us-central)
Modo: Teste

[Criar]
```

⏳ **Aguarde criação...**

```
Parabéns! Seu banco de dados está pronto!
```

---

## 🖼️ PASSO 7: Ativar Firebase Storage

### No menu esquerdo, clique "Storage"

```
┌─────────────────────┐
│ Storage             │
│ Arquivos            │
│ Rules               │
└─────────────────────┘
```

### Clique "Começar"

```
Armazenar arquivos com Cloud Storage

Selecione um local
[Selecionar região]

Preferência sugerida:
↓
us-central1

[us-central1 - United States]
```

### Configurar regras

```
Proteja seus arquivos com o Cloud Storage para Firebase

○ Começar no modo de teste  ← SELECIONE
○ Começar no modo de produção

Modo de teste:
✓ Permite leitura e escrita
! Depois mude para produção

[Próximo]
```

### Confirmar

```
Localização: us-central1
Modo: Teste

[Concluído]
```

---

## 👤 PASSO 8: Criar Usuário de Teste

### Ainda em "Autenticação", abra aba "Usuários"

```
Usuários
Nenhum usuário registrado ainda

[Adicionar usuário]
```

### Clique "Adicionar usuário"

```
Email: admin@mali-mobile.com
Senha: Admin@2026!

[Adicionar usuário]
```

✅ **Seu usuário está criado!**

---

## 📝 PASSO 9: Preencher .env.local

### Na raiz do seu projeto

```bash
# Copie o arquivo exemplo
cp .env.example .env.local
```

### Abra `.env.local` e preencha:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mali-mobile-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mali-mobile-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mali-mobile-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

**Onde encontrar cada valor:**

| Variável | Onde está |
|----------|-----------|
| apiKey | Firebase Config |
| authDomain | Firebase Config |
| projectId | Firebase Config |
| storageBucket | Firebase Config |
| messagingSenderId | Firebase Config |
| appId | Firebase Config |

---

## ✅ PASSO 10: Testar Localmente

```bash
# Instalar dependências
npm install

# Rodar servidor local
npm run dev
```

**Acesse:** `http://localhost:3000`

**Testes:**
```
☐ Página de login carrega
☐ Pode fazer login com admin@mali-mobile.com / Admin@2026!
☐ Dashboard aparece após login
☐ Pode acessar /dashboard/produtos
☐ Pode fazer upload de foto
☐ Foto aparece na galeria
```

---

## 🎉 Firebase está Pronto!

Agora você pode:
1. Seguir o guia de DEPLOYMENT.md
2. Configurar EasyPanel
3. Deploy em produção!

---

## 🆘 Problemas Comuns

### "Authentication not enabled"
**Solução:** Ir a Autenticação → Sign-in method → Habilitar Email/Senha

### "Firestore is not initialized"
**Solução:** Verificar .env.local → Reiniciar servidor (Ctrl+C e npm run dev)

### "Cannot read properties of undefined"
**Solução:** Copiar credenciais EXATAMENTE como estão no Firebase

### "Permission denied for Firestore"
**Solução:** Firestore Rules está em modo teste? Verificar Cloud Firestore → Rules

---

**🎊 Parabéns! Firebase está configurado!**

Próximo: Configure EasyPanel conforme DEPLOYMENT.md
