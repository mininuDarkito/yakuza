import { v2 as cloudinary } from 'cloudinary';

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
export async function uploadImage(imageSource: string | null): Promise<string | null> {
  if (!imageSource) return null;

  // Se não houver configuração do Cloudinary, mantém como está (Base64 ou URL original)
  if (!process.env.CLOUDINARY_URL) {
    console.warn("⚠️ Cloudinary não configurado. Mantendo imagem original.");
    return imageSource;
  }

  try {
    const uploadResponse = await cloudinary.uploader.upload(imageSource, {
      folder: 'yakuza_catalog',
      resource_type: 'image',
      // Otimizações automáticas do Cloudinary
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
