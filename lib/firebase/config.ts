import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Imagens são armazenadas no MinIO (VPS), não no Firebase Storage.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * App secundário usado APENAS para criar contas de novos usuários sem deslogar
 * o administrador atual. O SDK client compartilha a sessão por app; criar uma
 * conta na instância principal substituiria o usuário logado. Em uma instância
 * separada, o login temporário não afeta a sessão principal.
 */
export function getSecondaryAuth() {
  const secondaryApp = getApps().find((a) => a.name === 'secondary')
    ? getApp('secondary')
    : initializeApp(firebaseConfig, 'secondary');
  return getAuth(secondaryApp);
}

export default app;
