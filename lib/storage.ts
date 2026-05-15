import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

// Configuração opcional via variável de ambiente CLOUDINARY_URL
// Formato esperado: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
}

/**
 * Faz o upload de uma imagem (URL ou Base64) para o Cloudinary.
 * Se as credenciais não estiverem configuradas, retorna a URL/Base64 original.
 */
export async function uploadImage(imageSource: string | null, preferredName?: string, id?: string): Promise<string | null> {
  if (!imageSource) return null;

  // Se não houver configuração do Cloudinary, mantém como está (Base64 ou URL original)
  if (!process.env.CLOUDINARY_URL) {
    console.warn("⚠️ Cloudinary não configurado. Mantendo imagem original.");
    return imageSource;
  }

  // Se já for uma imagem do Cloudinary, não precisa re-upar
  if (imageSource.includes('res.cloudinary.com')) {
    return imageSource;
  }

  try {
    // Gerar um public_id limpo
    // Prioridade: ID_NOME ou NOME_HASH
    let cleanPublicId: string | undefined;
    
    if (preferredName) {
      const sanitized = preferredName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
      const hash = crypto.createHash('md5').update(preferredName).digest('hex').substring(0, 6);
      
      if (id) {
        cleanPublicId = `${id}_${sanitized}`;
      } else {
        cleanPublicId = `${sanitized}_${hash}`;
      }
    } else if (id) {
      cleanPublicId = id;
    }

    const uploadResponse = await cloudinary.uploader.upload(imageSource, {
      folder: 'yakuza/capas',
      public_id: cleanPublicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 750, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return uploadResponse.secure_url;
  } catch (error) {
    console.error("❌ Erro no upload para Cloudinary:", error);
    return imageSource; // Fallback para a fonte original em caso de erro
  }
}
