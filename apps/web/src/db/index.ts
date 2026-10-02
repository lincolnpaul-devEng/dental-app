import https from 'node:https';
import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Force IPv4 for Neon HTTP queries to eliminate Linux IPv6 routing timeouts
neonConfig.fetchFunction = (url: string, options?: RequestInit) => {
  return new Promise<Response>((resolve, reject) => {
    const u = new URL(url);
    const headers = options?.headers ? (options.headers as Record<string, string>) : {};
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options?.method || 'POST',
        headers,
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve(
            new Response(body, {
              status: res.statusCode || 200,
              statusText: res.statusMessage || '',
              headers: res.headers as unknown as HeadersInit,
            })
          );
        });
      }
    );
    req.on('error', reject);
    if (options?.body) {
      req.write(typeof options.body === 'string' ? options.body : String(options.body));
    }
    req.end();
  });
};

export const db = drizzle(process.env.DATABASE_URL, { schema });
export { schema };
