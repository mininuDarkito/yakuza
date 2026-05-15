// lib/mechacomic/crypto.ts
// Decriptação AES-CBC para imagens do MechaComic
// Port direto do Python: CryptoProcessor.decrypt_mechacomic()

import crypto from 'crypto'

/**
 * Decripta dados encriptados do MechaComic usando AES-CBC.
 * O IV está nos primeiros 16 bytes dos dados.
 * 
 * @param data - Buffer com dados encriptados (IV + ciphertext)
 * @param keyHex - Chave AES em formato hexadecimal
 * @returns Buffer com dados decriptados
 */
export function decryptMechaComic(data: Buffer, keyHex: string): Buffer {
  try {
    if (!keyHex) return data

    const key = Buffer.from(keyHex, 'hex')
    const iv = data.subarray(0, 16)
    const ciphertext = data.subarray(16)

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    // Desabilitar auto-padding porque o Python faz o mesmo
    decipher.setAutoPadding(false)

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ])

    return decrypted
  } catch (error) {
    console.error('❌ Erro na decriptação AES:', error)
    return data // Fallback: retorna dados originais
  }
}
