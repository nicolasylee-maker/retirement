#!/usr/bin/env node
/**
 * Generates a magic-link URL for dev login.
 * Usage: node scripts/dev-login.js [port]
 * Then open the printed URL in your browser (dev server must be running).
 */
import fs from 'fs';
import net from 'net';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = env.VITE_ADMIN_EMAIL || 'nicolasylee@gmail.com';

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Auto-detect Vite port or use arg
async function findVitePort() {
  const argPort = process.argv[2];
  if (argPort) return Number(argPort);
  for (let p = 5173; p <= 5183; p++) {
    const open = await new Promise(resolve => {
      const s = net.createConnection({ port: p, host: '127.0.0.1' }, () => { s.end(); resolve(true); });
      s.on('error', () => resolve(false));
    });
    if (open) return p;
  }
  return 5173;
}

const port = await findVitePort();
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

const hash = data.properties.hashed_token;
const loginUrl = `http://localhost:${port}?token_hash=${hash}&type=magiclink`;

console.log(`\nDev login URL (expires in ~5 min):\n\n${loginUrl}\n`);
