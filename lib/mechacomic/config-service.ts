import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export class MechaConfigService {
  static async getConfig(key: string): Promise<any> {
    try {
      const config = await (prisma as any).mecha_config.findUnique({
        where: { key }
      });
      return config?.value || null;
    } catch (e) {
      console.error(`Erro ao buscar config ${key}:`, e);
      return null;
    }
  }

  static async setConfig(key: string, value: any): Promise<void> {
    await (prisma as any).mecha_config.upsert({
      where: { key },
      update: { value, updated_at: new Date() },
      create: { key, value }
    });
  }

  // Migra arquivos locais para o banco se eles existirem
  static async migrateFilesToDb() {
    const files = [
      { key: 'google_credentials', path: 'credentials.json' },
      { key: 'google_token', path: 'token.json' },
      { key: 'playwright_session', path: 'auth.json' }
    ];

    for (const f of files) {
      const fullPath = path.join(process.cwd(), f.path);
      if (fs.existsSync(fullPath)) {
        console.log(`[Migration] Migrando ${f.path} para o banco...`);
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          await this.setConfig(f.key, content);
          console.log(`[Migration] ${f.path} migrado com sucesso.`);
        } catch (e) {
          console.error(`[Migration] Erro ao migrar ${f.path}:`, e);
        }
      }
    }
  }
}
