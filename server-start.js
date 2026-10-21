const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 1. Em containers Docker standalone, o server.js fica na raiz (/app/server.js)
const rootServer = path.join(__dirname, 'server.js');

// 2. Em builds locais com output: 'standalone', fica em .next/standalone/server.js
const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(rootServer)) {
  require(rootServer);
} else if (fs.existsSync(standaloneServer)) {
  require(standaloneServer);
} else {
  const isWin = process.platform === 'win32';
  const child = spawn(isWin ? 'npx.cmd' : 'npx', ['next', 'start'], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code || 0));
}
