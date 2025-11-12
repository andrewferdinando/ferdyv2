import crypto from 'crypto'

const TOKEN_SECRET = process.env.TOKEN_ENC_SECRET

if (!TOKEN_SECRET) {
  console.warn('TOKEN_ENC_SECRET is not set. Token encryption will fail when invoked.')
}

function getKey() {
  if (!TOKEN_SECRET) {
    throw new Error('TOKEN_ENC_SECRET environment variable is required for token encryption.')
  }

  return crypto.createHash('sha256').update(TOKEN_SECRET).digest()
}

export function encryptToken(value: string): string {
  if (!value) {
    throw new Error('encryptToken requires a non-empty value')
  }

  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    encrypted.toString('base64'),
    authTag.toString('base64'),
  ].join('.')
}

export function decryptToken(payload: string): string {
  if (!payload) {
    throw new Error('decryptToken requires a payload value')
  }

  const key = getKey()
  const parts = payload.split('.')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format')
  }

  const [ivPart, dataPart, tagPart] = parts
  const iv = Buffer.from(ivPart, 'base64')
  const encryptedData = Buffer.from(dataPart, 'base64')
  const authTag = Buffer.from(tagPart, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])
  return decrypted.toString('utf8')
}

