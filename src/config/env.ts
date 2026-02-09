export const env = {
  API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Fila Digital',
  APP_VERSION: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  ENABLE_NETWORK_LOGS: process.env.ENABLE_NETWORK_LOGS === 'true',
} as const
