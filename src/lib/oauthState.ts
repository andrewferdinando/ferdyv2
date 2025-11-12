import crypto from 'crypto'

const STATE_SECRET = process.env.TOKEN_ENC_SECRET

if (!STATE_SECRET) {
  console.warn('TOKEN_ENC_SECRET is not set. OAuth state signing will fail when invoked.')
}

export type OAuthStatePayload = {
  brandId: string
  userId: string
  provider: string
  timestamp: number
  redirectPath?: string
  origin?: string
}

const STATE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

function getStateKey() {
  if (!STATE_SECRET) {
    throw new Error('TOKEN_ENC_SECRET environment variable is required for OAuth state signing.')
  }

  return STATE_SECRET
}

export function createOAuthState(payload: Omit<OAuthStatePayload, 'timestamp'>): string {
  const statePayload: OAuthStatePayload = {
    ...payload,
    timestamp: Date.now(),
  }

  const serialized = Buffer.from(JSON.stringify(statePayload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', getStateKey()).update(serialized).digest('base64url')
  return `${serialized}.${signature}`
}

export function verifyOAuthState(rawState: string): OAuthStatePayload {
  if (!rawState) {
    throw new Error('Missing OAuth state parameter.')
  }

  const [payloadPart, signaturePart] = rawState.split('.')
  if (!payloadPart || !signaturePart) {
    throw new Error('Invalid OAuth state format.')
  }

  const expectedSignature = crypto
    .createHmac('sha256', getStateKey())
    .update(payloadPart)
    .digest('base64url')

  if (!crypto.timingSafeEqual(Buffer.from(signaturePart), Buffer.from(expectedSignature))) {
    throw new Error('Invalid OAuth state signature.')
  }

  const decoded = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as OAuthStatePayload

  if (!decoded.brandId || !decoded.userId || !decoded.provider) {
    throw new Error('OAuth state is missing required fields.')
  }

  if (Date.now() - decoded.timestamp > STATE_EXPIRY_MS) {
    throw new Error('OAuth state has expired. Please restart the connection flow.')
  }

  return decoded
}

