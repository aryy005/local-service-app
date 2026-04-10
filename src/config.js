// Environment configuration for Dynamic API tracking
// In production (Vercel), this reads your .env variable securely.
// In local development, it falls back to your local Node Express Server natively.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
