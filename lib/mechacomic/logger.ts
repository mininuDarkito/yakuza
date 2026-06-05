import { prisma } from '@/lib/db';

export async function createMechaComicLog(
  userId: string,
  action: string,
  details?: Record<string, any>,
) {
  try {
    return await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action,
        entity_type: 'mechacomic',
        details: details ?? {},
      },
    });
  } catch (error) {
    console.error('Erro ao salvar log MechaComic:', error);
    return null;
  }
}
