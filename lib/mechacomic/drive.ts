import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import { MechaConfigService } from './config-service';

export class GoogleDriveUploader {
  private drive: any;

  static async create(): Promise<GoogleDriveUploader> {
    const uploader = new GoogleDriveUploader();
    await uploader.initialize();
    return uploader;
  }

  private async initialize() {
    try {
      const credentials = await MechaConfigService.getConfig('google_credentials');
      const token = await MechaConfigService.getConfig('google_token');

      if (!credentials) {
        throw new Error("Credenciais do Google não encontradas no banco de dados.");
      }
      
      if (credentials.installed || credentials.web) {
        if (!token) {
          throw new Error("Token do Google não encontrado no banco de dados.");
        }
        
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(token);
        this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
      } else {
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        this.drive = google.drive({ version: 'v3', auth });
      }
    } catch (e) {
      console.error("Falha ao inicializar Google Drive:", e);
    }
  }

  // O construtor agora é privado ou vazio, use GoogleDriveUploader.create()
  constructor() {}

  async getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    if (!this.drive) throw new Error("Drive não inicializado.");
    
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const folder = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    return folder.data.id!;
  }

  async uploadChapterZip(zipBuffer: Buffer, fileName: string, folderId: string): Promise<string> {
    if (!this.drive) throw new Error("Drive não inicializado.");

    const bufferStream = new stream.PassThrough();
    bufferStream.end(zipBuffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: 'application/zip',
      body: bufferStream
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    // Torna o arquivo público para quem tem o link
    await this.drive.permissions.create({
      fileId: res.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    return res.data.webViewLink!;
  }

  async uploadChapterImages(imagePaths: string[], site: string, series: string, chapter: string, parentId?: string): Promise<string> {
    if (!this.drive) throw new Error("Drive não inicializado.");

    // site -> series -> chapter
    const siteId = await this.getOrCreateFolder(site, parentId);
    const seriesId = await this.getOrCreateFolder(series, siteId);
    const chapterId = await this.getOrCreateFolder(chapter, seriesId);

    // Torna a pasta do capítulo pública
    await this.drive.permissions.create({
      fileId: chapterId,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    for (const imgPath of imagePaths) {
      const fileName = path.basename(imgPath);
      
      const fileMetadata = { name: fileName, parents: [chapterId] };
      const media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(imgPath)
      };

      await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });
    }

    const folderData = await this.drive.files.get({ fileId: chapterId, fields: 'webViewLink' });
    return folderData.data.webViewLink!;
  }

  async listFolders(parentId: string): Promise<any[]> {
    if (!this.drive) throw new Error("Drive não inicializado.");

    const res = await this.drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      pageSize: 1000
    });

    return res.data.files || [];
  }

  async findFolderByName(folderName: string, parentId?: string): Promise<string | null> {
    if (!this.drive) throw new Error("Drive não inicializado.");
    
    // Escapar aspas simples para a query do Drive
    const escapedName = folderName.replace(/'/g, "\\'");
    let query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id)'
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    return null;
  }
}
