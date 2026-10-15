import 'dotenv/config';
const secret = process.env.JWT_SECRET ?? '';
if (secret.length < 32 || secret.startsWith('replace_')) throw new Error('Set JWT_SECRET to your own random string of at least 32 characters in apps/api/.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Copy apps/api/.env.example to .env');
export const config = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: secret,
  mode: process.env.MPESA_MODE ?? 'mock',
  publicApiUrl: process.env.PUBLIC_API_URL ?? '',
  callbackSecret: process.env.MPESA_CALLBACK_SECRET ?? '',
  mpesaBase: process.env.MPESA_MODE === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke',
};
if (!['mock', 'sandbox', 'production'].includes(config.mode)) throw new Error('MPESA_MODE must be mock, sandbox, or production');
if (config.mode !== 'mock') {
  for (const variable of ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY']) {
    if (!process.env[variable]) throw new Error(`Missing ${variable} for M-Pesa integration`);
  }
  if (!config.publicApiUrl.startsWith('https://')) throw new Error('Set PUBLIC_API_URL to your externally reachable HTTPS backend for M-Pesa callbacks');
  if (config.callbackSecret.length < 24 || config.callbackSecret.startsWith('replace_')) throw new Error('MPESA_CALLBACK_SECRET must be your own random string of at least 24 characters');
}
