#!/bin/bash

# Script para configurar variáveis de ambiente do Firebase

echo "🔥 Mali Mobile - Firebase Setup Helper"
echo "========================================"
echo ""

# Verificar se .env.local já existe
if [ -f .env.local ]; then
  echo "⚠️  .env.local já existe!"
  read -p "Deseja sobrescrever? (s/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Abortado."
    exit 1
  fi
fi

echo "Preencha suas credenciais do Firebase Console:"
echo ""

read -p "API Key: " FIREBASE_API_KEY
read -p "Auth Domain (ex: mali-mobile-xxx.firebaseapp.com): " FIREBASE_AUTH_DOMAIN
read -p "Project ID (ex: mali-mobile-xxx): " FIREBASE_PROJECT_ID
read -p "Storage Bucket (ex: mali-mobile-xxx.appspot.com): " FIREBASE_STORAGE_BUCKET
read -p "Messaging Sender ID: " FIREBASE_MESSAGING_SENDER_ID
read -p "App ID: " FIREBASE_APP_ID

# Criar arquivo .env.local
cat > .env.local << EOF
NEXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$FIREBASE_APP_ID
EOF

echo ""
echo "✅ .env.local criado com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. npm install (se ainda não fez)"
echo "2. npm run dev (para testar localmente)"
echo "3. Seguir o guia de deployment em DEPLOYMENT.md"
