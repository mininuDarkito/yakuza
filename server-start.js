const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Forçar HOSTNAME 0.0.0.0 para garantir que escute em todas as interfaces de rede no Docker
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

// 1. Em containers Docker standalone, o server.js fica na raiz (/app/server.js)
const rootServer = path.join(__dirname, 'server.js');

// 2. Em builds locais com output: 'standalone', fica em .next/standalone/server.js
const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(rootServer)) {
  require(rootServer);
} else if (fs.existsSync(standaloneServer)) {
  // O standalone NÃO inclui .next/static nem public: sem isso todo chunk responde 404.
  // Garante (e mantém sincronizado com o BUILD_ID atual) antes de subir o servidor.
  try {
    const { syncStandaloneAssets } = require('./scripts/sync-standalone');
    syncStandaloneAssets({ log: console.log });
  } catch (err) {
    console.error('[server-start] Falha ao sincronizar assets estáticos:', err);
  }
  // O server.js do standalone resolve caminhos relativos ao cwd.
  process.chdir(path.dirname(standaloneServer));
  require(standaloneServer);
} else {
  const isWin = process.platform === 'win32';
  const child = spawn(isWin ? 'npx.cmd' : 'npx', ['next', 'start'], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code || 0));
}
