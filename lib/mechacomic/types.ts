// lib/mechacomic/types.ts
// Tipos centrais do sistema MechaComic

export interface MechaChapter {
  id: string            // ID original do MechaComic
  number: string        // Número do capítulo (ex: "第1話")
  title: string         // Título do capítulo
  status: 'free' | 'paid' | 'wait_free'
  cost: string          // Custo em pontos do MechaComic (ex: "50")
}

export interface MechaSeriesInfo {
  title: string
  coverUrl: string | null
  url: string
  chapters: MechaChapter[]
}

export interface MergeConfig {
  enabled: boolean
  height: number        // Altura máxima por strip (default: 12000)
  width: number         // Largura forçada (0 = usar a maior)
  quality: number       // Qualidade JPEG (default: 90)
  format: 'jpeg' | 'png'
}

export interface DownloadJob {
  chapterId: string     // ID do capítulo no MechaComic
  seriesTitle: string
  chapterTitle: string
  stitch: boolean
  dbDownloadId: string  // ID no banco de dados (mecha_downloads)
}

export interface DownloadResult {
  success: boolean
  driveLink?: string
  error?: string
  zipBuffer?: Buffer
}

export interface UnscrambleConfig {
  blockSize: number
  table: number[] | CoordinateMap[]
}

export interface CoordinateMap {
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}
