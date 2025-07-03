import { loadEnv } from 'vite';

// Test environment variable loading
const env = loadEnv('development', process.cwd(), '');
console.log('Environment variables loaded by Vite:');
console.log('VITE_GA_MEASUREMENT_ID:', env.VITE_GA_MEASUREMENT_ID);
console.log('VITE_GA_MEASUREMENT_ID type:', typeof env.VITE_GA_MEASUREMENT_ID);
console.log('VITE_GA_MEASUREMENT_ID length:', env.VITE_GA_MEASUREMENT_ID?.length);
console.log('All VITE_ prefixed variables:', Object.keys(env).filter(key => key.startsWith('VITE_')));
console.log('All environment variables:', Object.keys(env)); 