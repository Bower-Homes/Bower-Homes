import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// On Vercel: use Vercel adapter. Locally: use Node adapter for build+preview.
const adapter = process.env.VERCEL
  ? (await import('@astrojs/vercel/serverless')).default()
  : (await import('@astrojs/node')).default({ mode: 'standalone' });

export default defineConfig({
  site: 'https://bowerhomesfl.com',
  integrations: [tailwind(), react()],
  output: 'server',
  adapter,
});
