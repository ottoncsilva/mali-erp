import { Client } from 'minio';

/**
 * Cliente MinIO (somente servidor).
 * As credenciais ficam em variáveis de ambiente e NUNCA são expostas ao navegador.
 * Usado apenas pela rota de API /api/upload.
 */

export const minioBucket = process.env.MINIO_BUCKET || 'mali-produtos';

// URL pública base para servir as imagens (ex: https://outros-minio.rbhavy.easypanel.host)
export const minioPublicUrl = (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 443,
  useSSL: (process.env.MINIO_USE_SSL ?? 'true') === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

/** Monta a URL pública de um objeto no bucket. */
export function getPublicUrl(objectName: string): string {
  return `${minioPublicUrl}/${minioBucket}/${objectName}`;
}
