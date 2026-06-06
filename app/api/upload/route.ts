import { NextRequest, NextResponse } from 'next/server';
import { minioClient, minioBucket, getPublicUrl } from '@/lib/minio/config';

// minio usa APIs do Node — força runtime Node (não edge)
export const runtime = 'nodejs';

/** Upload de arquivo para o MinIO. Recebe multipart/form-data com 'file' e 'path'. */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    const path = (formData.get('path') as string) || `${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await minioClient.putObject(minioBucket, path, buffer, buffer.length, {
      'Content-Type': file.type || 'application/octet-stream',
    });

    return NextResponse.json({ url: getPublicUrl(path), path });
  } catch (err) {
    console.error('Erro upload MinIO:', err);
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
  }
}

/** Remove um arquivo do MinIO. Recebe JSON { path }. */
export async function DELETE(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path) {
      return NextResponse.json({ error: 'path obrigatório' }, { status: 400 });
    }
    await minioClient.removeObject(minioBucket, path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro delete MinIO:', err);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}
