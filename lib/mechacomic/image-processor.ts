import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export async function processAndStitchImages(
  imageBuffers: Buffer[],
  outputPrefix: string,
  outDir: string,
  stitchMode: boolean = true
) {
  if (imageBuffers.length === 0) return [];

  const TARGET_WIDTH = 800;

  if (!stitchMode) {
    // Apenas salva as imagens processadas e redimensionadas
    const savedFiles: string[] = [];
    for (let i = 0; i < imageBuffers.length; i++) {
      const fileName = `${(i + 1).toString().padStart(3, '0')}.jpg`;
      const outPath = path.join(outDir, fileName);
      await sharp(imageBuffers[i])
        .resize({ width: TARGET_WIDTH })
        .jpeg({ quality: 90 })
        .toFile(outPath);
      savedFiles.push(outPath);
    }
    return savedFiles;
  }

  // --- SMART STITCH NATIVO NO NODE.JS ---
  console.log(`🧩 Iniciando SmartStitch no Node.js (Largura: ${TARGET_WIDTH}px)...`);
  const MAX_HEIGHT = 12000;
  
  // 1. Redimensiona todas as imagens para TARGET_WIDTH e obtém os novos metadados
  const resizedImagesData = await Promise.all(
    imageBuffers.map(async (b) => {
      const buf = await sharp(b).resize({ width: TARGET_WIDTH }).toBuffer();
      const meta = await sharp(buf).metadata();
      return { buffer: buf, height: meta.height || 0 };
    })
  );
  
  // 2. Compor todas as imagens verticalmente em um buffer longo (Strip)
  let currentStripHeight = 0;
  let currentImages: { input: Buffer; top: number; left: number }[] = [];
  let currentStripIdx = 1;
  const savedFiles: string[] = [];
  
  for (let i = 0; i < resizedImagesData.length; i++) {
    const { buffer, height } = resizedImagesData[i];
    
    // Se a imagem sozinha já for maior que o máximo, salva direto
    if (height >= MAX_HEIGHT) {
      if (currentImages.length > 0) {
        // Salva strip anterior
        const fileName = `${currentStripIdx.toString().padStart(3, '0')}.jpg`;
        const outPath = path.join(outDir, fileName);
        await sharp({
          create: {
            width: TARGET_WIDTH,
            height: currentStripHeight,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .composite(currentImages)
        .jpeg({ quality: 90 })
        .toFile(outPath);
        savedFiles.push(outPath);
        currentStripIdx++;
        currentImages = [];
        currentStripHeight = 0;
      }
      
      const fileName = `${currentStripIdx.toString().padStart(3, '0')}.jpg`;
      const outPath = path.join(outDir, fileName);
      await sharp(buffer).jpeg({ quality: 90 }).toFile(outPath);
      savedFiles.push(outPath);
      currentStripIdx++;
      continue;
    }
    
    // Se adicionar passar do limite
    if (currentStripHeight + height > MAX_HEIGHT && currentImages.length > 0) {
      const fileName = `${currentStripIdx.toString().padStart(3, '0')}.jpg`;
      const outPath = path.join(outDir, fileName);
      await sharp({
        create: {
          width: TARGET_WIDTH,
          height: currentStripHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .composite(currentImages)
      .jpeg({ quality: 90 })
      .toFile(outPath);
      savedFiles.push(outPath);
      currentStripIdx++;
      currentImages = [];
      currentStripHeight = 0;
    }
    
    currentImages.push({
      input: buffer,
      top: currentStripHeight,
      left: 0 // Todas têm a mesma largura, não precisa centralizar
    });
    
    currentStripHeight += height;
  }
  
  // Salva o último pedaço
  if (currentImages.length > 0) {
    const fileName = `${currentStripIdx.toString().padStart(3, '0')}.jpg`;
    const outPath = path.join(outDir, fileName);
    await sharp({
      create: {
        width: TARGET_WIDTH,
        height: currentStripHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite(currentImages)
    .jpeg({ quality: 90 })
    .toFile(outPath);
    savedFiles.push(outPath);
  }
  
  return savedFiles;
}

export function findBestCut(buffer: Buffer, targetY: number) {
  // TODO: Variância horizontal (simplificado no processamento acima por blocos)
  return targetY;
}
