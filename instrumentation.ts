export async function register() {
  // Roda apenas no runtime do Node.js (não no Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = (await import('node-cron')).default;

    // Fuso horário do processo (configurado em Admin › Configurações)
    try {
      const { applyTimezoneFromSettings } = await import('./lib/settings');
      await applyTimezoneFromSettings();
    } catch (err) {
      console.error('[Settings] Não foi possível aplicar o fuso horário salvo no banco:', err);
    }

    // 0 15 * * * = Todo dia às 15:00 UTC
    //              = 12:00 Brasília (UTC-3)
    //              = 11:00 usuário (UTC-4)
    //              = 00:00 Japão (UTC+9) — horário de lançamento das séries
    cron.schedule('0 15 * * *', async () => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const { getSetting } = await import('./lib/settings');
      const secret = await getSetting('CRON_SECRET');

      if (!secret) {
        console.error('[CronScheduler] CRON_SECRET não configurado (Admin › Configurações)! Sync automático não será executado.');
        return;
      }

      console.log('[CronScheduler] Disparando auto-sync MechaComic...');
      try {
        const res = await fetch(`${baseUrl}/api/cron/mechacomic`, {
          method: 'POST',
          headers: {
            'x-cron-secret': secret,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();
        if (res.ok) {
          console.log(`[CronScheduler] Auto-sync concluído: ${data.synced} série(s), ${data.results?.reduce((acc: number, r: any) => acc + (r.newChapters || 0), 0)} capítulo(s) novo(s).`);
        } else {
          console.error('[CronScheduler] Erro no auto-sync:', data);
        }
      } catch (err) {
        console.error('[CronScheduler] Falha ao chamar endpoint de sync:', err);
      }
    }, {
      timezone: 'UTC'
    });

    console.log('[CronScheduler] Agendador MechaComic iniciado. Próximo disparo: 15:00 UTC (12:00 BRT / 00:00 JST)');
  }
}
