const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

const prisma = new PrismaClient();

async function migrate() {
  if (!process.env.CLOUDINARY_URL) {
    console.error("❌ CLOUDINARY_URL não configurada.");
    return;
  }

  cloudinary.config({ secure: true });

  console.log("🔍 Buscando obras com imagens Base64...");
  
  const produtos = await prisma.produtos.findMany({
    where: {
      imagem_url: { startsWith: 'data:image/' }
    }
  });

  console.log(`🚀 Encontradas ${produtos.length} obras para migrar.`);

  for (const produto of produtos) {
    try {
      console.log(`⬆️ Subindo imagem de: ${produto.nome}...`);
      
      const cleanPublicId = produto.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
      
      const uploadRes = await cloudinary.uploader.upload(produto.imagem_url, {
        folder: 'yakuza/capas',
        public_id: `${produto.id}_${cleanPublicId}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { width: 500, height: 750, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });

      await prisma.produtos.update({
        where: { id: produto.id },
        data: { imagem_url: uploadRes.secure_url }
      });

      console.log(`✅ Sucesso: ${produto.nome}`);
    } catch (err) {
      console.error(`❌ Falha ao migrar ${produto.nome}:`, err.message);
    }
  }

  console.log("🏁 Migração concluída!");
}

migrate();
