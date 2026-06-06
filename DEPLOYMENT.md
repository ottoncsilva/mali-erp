# Mali Mobile ERP - Guia de Deployment

## 📋 ÍNDICE
1. [Firebase Setup](#firebase-setup)
2. [Configuração Local](#configuração-local)
3. [EasyPanel Setup](#easypanel-setup)
4. [Deploy em Produção](#deploy-em-produção)
5. [Troubleshooting](#troubleshooting)

---

## 🔥 Firebase Setup

### Passo 1: Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em **"Criar projeto"**
3. Nome: `mali-mobile`
4. Clique **"Continuar"**
5. Desabilite Google Analytics (por enquanto)
6. Clique **"Criar projeto"** novamente

### Passo 2: Registrar Aplicação Web

1. No console, clique no ícone **`</>`** para registrar web app
2. Nome: `mali-mobile-web`
3. Copie as credenciais (guardar em segurança!)

**Sua config será algo como:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mali-mobile-xxx.firebaseapp.com",
  projectId: "mali-mobile-xxx",
  storageBucket: "mali-mobile-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

### Passo 3: Ativar Autenticação

1. No menu esquerdo, clique em **"Autenticação"**
2. Abra a aba **"Sign-in method"**
3. Habilite **"Email/Senha"**
4. Salve as mudanças

### Passo 4: Criar Banco de Dados (Firestore)

1. No menu esquerdo, clique em **"Cloud Firestore"**
2. Clique **"Criar banco de dados"**
3. Selecione **"Começar no modo de teste"** (dev)
4. Localização: **"nam5 (us-central)"**
5. Clique **"Criar"**

### Passo 5: Configurar Storage (Fotos)

1. No menu esquerdo, clique em **"Storage"**
2. Clique **"Começar"**
3. Regras: Selecione **"Começar no modo de teste"**
4. Localização: **"us-central1"**
5. Clique **"Concluído"**

### Passo 6: Criar Usuário de Teste

1. Em "Autenticação", abra aba **"Usuários"**
2. Clique **"Adicionar usuário"**
3. Email: `admin@mali-mobile.com`
4. Senha: `Admin@2026!` (mudar depois)
5. Clique **"Adicionar usuário"**

---

## 📝 Configuração Local

### Passo 1: Copiar Variáveis de Ambiente

```bash
# Na raiz do projeto
cp .env.example .env.local
```

### Passo 2: Preencher .env.local

Abra `.env.local` e preencha com suas credenciais do Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mali-mobile-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mali-mobile-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mali-mobile-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

### Passo 3: Testar Localmente

```bash
npm run dev
# Acesse http://localhost:3000
```

**Testes:**
- [ ] Página de login carrega
- [ ] Login com `admin@mali-mobile.com` funciona
- [ ] Dashboard aparece após login
- [ ] Pode acessar Produtos
- [ ] Pode fazer upload de foto

---

## 🚀 EasyPanel Setup

### Passo 1: Acessar EasyPanel da Hostinger

1. Acesse sua conta **Hostinger**
2. Vá para **VPS** (sua máquina)
3. Clique em **"EasyPanel"** ou **"Painel de Controle"**
4. Login com suas credenciais

### Passo 2: Preparar Código no GitHub

```bash
# Commitar tudo
git status
git add .
git commit -m "chore: prepare for production deployment"
git push origin claude/gifted-faraday-EQ1mP
```

### Passo 3: Criar Aplicação no EasyPanel

1. No EasyPanel, clique **"+ Nova Aplicação"**
2. Nome: `mali-mobile`
3. Tipo: **Docker**
4. Repositório: `ottoncsilva/mali-erp`
5. Branch: `claude/gifted-faraday-EQ1mP`
6. Clique **"Conectar"**

### Passo 4: Configurar Docker

1. Na aplicação, vá para **"Configurações"**
2. Caminho do Dockerfile: `./Dockerfile`
3. Porta: `3000`
4. Clique **"Salvar"**

### Passo 5: Adicionar Variáveis de Ambiente

1. Em "Configurações", abra **"Variáveis de Ambiente"**
2. Clique **"+ Adicionar"**
3. Preencha com as mesmas de `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mali-mobile-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mali-mobile-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mali-mobile-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

4. Clique **"Salvar"** para cada uma

### Passo 6: Configurar Domínio

1. Em "Configurações", abra **"Domínio"**
2. Adicione seu domínio: `mali-mobile.com`
3. Clique **"Conectar Domínio"**
4. Follow as instruções de DNS

### Passo 7: SSL/HTTPS

1. No EasyPanel, ative **"SSL Automático"**
2. Aguarde certificado ser gerado (2-5 min)

### Passo 8: Deploy

1. Clique **"Deploy"** ou **"Reconstruir"**
2. Aguarde o build terminar (5-10 min)
3. Veja os logs: **"Logs de Build"**
4. Quando terminar, acesse `https://mali-mobile.com`

---

## 📱 Deploy em Produção

### Checklist Final

- [ ] Firebase configurado e testado
- [ ] .env.local preenchido
- [ ] Testado localmente (npm run dev)
- [ ] Código no GitHub
- [ ] EasyPanel conta criada
- [ ] Aplicação criada no EasyPanel
- [ ] Variáveis de ambiente adicionadas
- [ ] Domínio configurado
- [ ] SSL ativado
- [ ] Primeiro deploy feito

### Após Deploy

1. **Criar Usuários Admin**
   - Acesse Firebase Console
   - Autenticação → Adicionar usuários
   - Admin, Gerência, Vendedores

2. **Criar Dados Iniciais no Firestore**
   ```
   empresa/config
   ├── nome: "Mali Mobile"
   ├── pontuacaoPadrao: 2.0
   └── limitesPontuacao: {vendedor: 1.8, gerencia: 1.5}
   ```

3. **Teste de Funcionalidade**
   - [ ] Login funciona
   - [ ] Cadastro de produtos
   - [ ] Upload de fotos
   - [ ] PDV funciona
   - [ ] Gerador de PDF
   - [ ] WhatsApp integration

---

## 🔧 Troubleshooting

### Erro: "Firebase initialization failed"

**Solução:**
- Verificar se variáveis de ambiente estão corretas
- Não misture aspas simples e duplas
- Copie exatamente como no Firebase Console

### Erro: "Cannot connect to Firestore"

**Solução:**
- Verificar regras do Firestore (deve estar em modo teste)
- No Firebase Console → Firestore → Rules
- Deve permitir read/write no modo teste

### Erro: "Storage bucket not found"

**Solução:**
- Ativar Firebase Storage
- Verificar nome do bucket em .env.local
- Deve ser: `project-id.appspot.com`

### Deploy não inicia

**Solução:**
1. Verificar logs no EasyPanel
2. Verificar se Dockerfile existe
3. Verificar variáveis de ambiente
4. Fazer rebuild

### Fotos não carregam

**Solução:**
- Verificar regras do Storage
- Storage → Rules → Deve permitir read/write

---

## 📞 Checklist de Produção

### Segurança
- [ ] Mudar senhas padrão
- [ ] Ativar 2FA no Firebase
- [ ] Configurar regras de Firestore adequadas
- [ ] Configurar regras de Storage adequadas
- [ ] Configurar CORS no Storage

### Performance
- [ ] Ativar caching
- [ ] Configurar CDN
- [ ] Monitorar performance no Firebase

### Monitoramento
- [ ] Configurar alertas Firebase
- [ ] Monitorar logs da aplicação
- [ ] Backup de dados configurado

---

## 🎯 Próximos Passos

1. **Hoje:**
   - [ ] Firebase setup
   - [ ] EasyPanel conectado
   - [ ] Deploy feito

2. **Amanhã:**
   - [ ] Criar usuários
   - [ ] Testar funcionalidades
   - [ ] Configurar dados iniciais

3. **Semana que vem:**
   - [ ] Treinamento de usuários
   - [ ] Começar a vender!

---

**Mali Mobile ERP está pronto para voar! 🚀**
