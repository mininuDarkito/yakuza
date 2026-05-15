const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';

// Lê o arquivo credentials.json
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Erro ao carregar credentials.json:', err);
  authorize(JSON.parse(content), getAccessToken);
});

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Se já tivermos o token, testamos para ver se é válido
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return callback(oAuth2Client);
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log('token.json já existe! Se você estiver recebendo erros de autenticação, delete o token.json e rode este script novamente.');
  });
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('\n=========================================');
  console.log('Autorize este aplicativo acessando a URL abaixo:');
  console.log(authUrl);
  console.log('=========================================\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  rl.question('Após o login, a página vai dar erro de "Não foi possível conectar" ou irá redirecionar para o localhost. Olhe para a URL da barra de endereços, copie o código que aparece depois de "?code=" e cole aqui: ', (code) => {
    rl.close();
    
    // Decodifica url se o usuário colar o link inteiro
    let cleanCode = code;
    if (code.includes('?code=')) {
        cleanCode = new URL(code).searchParams.get('code');
    }

    oAuth2Client.getToken(cleanCode, (err, token) => {
      if (err) return console.error('Erro ao recuperar o token de acesso', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token armazenado com sucesso em', TOKEN_PATH);
      });
    });
  });
}
