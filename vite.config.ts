import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Serves the Vercel functions in api/ during `npm run dev`, so the dashboard works locally
 * without `vercel dev`. Each file exports handlers named after HTTP methods (Web Request → Response).
 */
function vercelApiInDev(): Plugin {
  const readBody = (req: IncomingMessage) =>
    new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

  return {
    name: 'vercel-api-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        if (!path.startsWith('/api/') || path.includes('/_lib/') || path.includes('..')) return next();
        try {
          const mod = await server.ssrLoadModule(`${path}.ts`);
          const handler = mod[req.method ?? 'GET'];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            return res.end();
          }
          const method = req.method ?? 'GET';
          const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method,
            headers: req.headers as Record<string, string>,
            body,
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          if ((error as { code?: string }).code === 'ERR_LOAD_URL') return next();
          server.ssrFixStacktrace(error as Error);
          console.error(error);
          res.statusCode = 500;
          res.end('Internal error');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-side variables (no VITE_ prefix) from .env files to the API handlers in dev,
  // without overriding anything already set in the shell.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value;

  return {
    plugins: [react(), vercelApiInDev()],
  };
});
