#!/usr/bin/env node
// Creates the first account without going through the sign-up page, for a fresh
// deployment or for seeding an environment where public sign-up isn't wanted.
//
//   printf '%s' 'the-password' | node scripts/create-user.mjs you@example.com "Your Name" > /tmp/seed.sql
//   npx wrangler d1 execute trellos-db --local --file=/tmp/seed.sql
//
// The password is read from stdin, never from argv, so it doesn't land in shell history
// or the process table. Only the PBKDF2 verifier reaches the generated SQL.
//
// Pass --claim-orphans to also hand every board created before this migration (owner_id
// IS NULL, therefore invisible to everyone) to the new account.

import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;

const { hashPassword } = await import('../src/lib/server/auth.js');

const args = process.argv.slice(2);
const claimOrphans = args.includes('--claim-orphans');
const [email, name] = args.filter((a) => !a.startsWith('--'));

if (!email || !name) {
  console.error('usage: printf %s <password> | node scripts/create-user.mjs <email> <name> [--claim-orphans]');
  process.exit(1);
}
if (process.stdin.isTTY) {
  console.error('error: password must be piped on stdin');
  process.exit(1);
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');

if (password.length < 10) {
  console.error('error: password must be at least 10 characters');
  process.exit(1);
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const normalizedEmail = email.trim().toLowerCase();

const lines = [
  `INSERT INTO users (email, name, password_hash) VALUES (${q(normalizedEmail)}, ${q(name)}, ${q(await hashPassword(password))});`
];
if (claimOrphans) {
  lines.push(
    `UPDATE boards SET owner_id = (SELECT id FROM users WHERE email = ${q(normalizedEmail)}) WHERE owner_id IS NULL;`
  );
}
console.log(lines.join('\n'));
