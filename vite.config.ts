import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // The API's tests run on Node's own test runner (`npm test` inside server/), not Vitest.
    exclude: [...configDefaults.exclude, 'server/**'],
  },
  server: {
    // The app and the API must look like one origin to the browser — the session cookie is
    // SameSite=Lax and the API refuses a write from a foreign Origin. nginx does this in
    // production; this proxy is its development equivalent.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false },
    },
  },
});
