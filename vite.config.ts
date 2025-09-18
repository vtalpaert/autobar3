import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const sslKeyPath = env.SSL_KEY_PATH;
    const sslCertPath = env.SSL_CERT_PATH;

    const https =
        sslKeyPath && sslCertPath
            ? {
                  key: fs.readFileSync(sslKeyPath),
                  cert: fs.readFileSync(sslCertPath)
              }
            : false;

    return {
        plugins: [sveltekit()],
        server: {
            https,
            host: true
        },
        test: {
            include: ['src/**/*.{test,spec}.{js,ts}']
        }
    };
});
