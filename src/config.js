// Environment configuration for Dynamic API tracking
// In production (Vercel/Mobile APK), this reads your Render backend URL.
// In local development, it falls back to your local Node Express Server.

const RENDER_BACKEND_URL = import.meta.env.VITE_API_URL;

// For mobile APK builds (Capacitor), we cannot use localhost.
// The app must always point to the live Render backend.
export const API_URL = RENDER_BACKEND_URL || 'http://localhost:5000/api';
