import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://bowerhomesfl.com',
  integrations: [tailwind(), react()],
  output: 'server',
  adapter: vercel(),
});
