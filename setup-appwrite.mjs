/**
 * Brogress — Appwrite schema setup
 *
 * Collections: templates, sessions (sets stored as JSON blob on session docs)
 *
 * Usage:
 *   node setup-appwrite.mjs          # create (skips existing)
 *   node setup-appwrite.mjs --reset  # drop collections first, then create
 */

import { Client, Databases } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? '69d8bee6003534918879';
const API_KEY = process.env.APPWRITE_API_KEY ?? 'standard_7b179c402f3977c72587ad9d095b9a634d4592ba0a2c682c2bf33e8d0b251bdbb834344b53b19f8aa67469df38bffed014fc57d9e09f2630748ad30610e69a8dfa92c91f31e589d9f3e1fad3349daf4f7054f7ae3b6050427ff18b63930eba4ebd9dc28755d1efd449d99c6d3801d6b0e96ee9669fb8ea909635480edf47d3b6';
const DB_ID = process.env.APPWRITE_DB_ID ?? 'brogress';

const RESET = process.argv.includes('--reset');

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

const wait = ms => new Promise(r => setTimeout(r, ms));

async function tryCreate(label, fn) {
  try {
    await fn();
    console.log(`  ✓  ${label}`);
  } catch (e) {
    if (e?.code === 409) console.log(`  –  ${label} (already exists)`);
    else { console.error(`  ✗  ${label}: ${e?.message}`); throw e; }
  }
}

async function tryDelete(label, fn) {
  try { await fn(); console.log(`  🗑  deleted ${label}`); }
  catch (e) {
    if (e?.code === 404) console.log(`  –  ${label} (not found)`);
    else console.error(`  ✗  failed to delete ${label}: ${e?.message}`);
  }
}

async function waitForAttributes(colId, keys, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  const pending = new Set(keys);
  process.stdout.write(`  ⏳ waiting for [${[...pending].join(', ')}] `);
  while (pending.size > 0) {
    if (Date.now() > deadline) { console.log(' timeout!'); throw new Error(`Timeout in ${colId}`); }
    await wait(1500);
    process.stdout.write('.');
    const res = await db.listAttributes(DB_ID, colId);
    for (const attr of res.attributes)
      if (attr.status === 'available' && pending.has(attr.key)) pending.delete(attr.key);
  }
  console.log(' ready');
}

const PERMS = ['read("any")', 'create("users")', 'update("users")', 'delete("users")'];
const str = (col, key, size = 255, req = true, arr = false) =>
  tryCreate(`attr ${col}.${key}`, () => db.createStringAttribute(DB_ID, col, key, size, req, undefined, arr));
const int = (col, key, req = true, min, max, arr = false) =>
  tryCreate(`attr ${col}.${key}`, () => db.createIntegerAttribute(DB_ID, col, key, req, min, max, undefined, arr));
const flt = (col, key, req = true, min, max, arr = false) =>
  tryCreate(`attr ${col}.${key}`, () => db.createFloatAttribute(DB_ID, col, key, req, min, max, undefined, arr));
const idx = (col, key, type, attrs) =>
  tryCreate(`index ${col}[${attrs.join(',')}]`, () => db.createIndex(DB_ID, col, key, type, attrs));

console.log('\n🏋️  Brogress — Appwrite schema setup');
console.log(`   Endpoint : ${ENDPOINT}`);
console.log(`   Database : ${DB_ID}`);
console.log(`   Reset    : ${RESET}\n`);

// Verify database exists
try {
  await db.get(DB_ID);
  console.log(`📦 Database "${DB_ID}" found\n`);
} catch {
  console.error(`❌ Database "${DB_ID}" not found. Create it in the Appwrite console first.`);
  process.exit(1);
}

if (RESET) {
  console.log('🗑  Dropping collections...');
  for (const col of ['templates', 'sessions']) {
    await tryDelete(`collection ${col}`, () => db.deleteCollection(DB_ID, col));
    await wait(400);
  }
  console.log();
}

// ─── templates ───────────────────────────────────────────────────────────────
// One document per user per named workout plan.
// exercises stored as parallel arrays indexed by position.
console.log('📋 Collection: templates');
await tryCreate('collection templates', () =>
  db.createCollection(DB_ID, 'templates', 'templates', PERMS)
);
await str('templates', 'userId', 128);
await str('templates', 'name', 128);
await str('templates', 'exerciseNames', 128, true, true);   // string[]
await int('templates', 'sets', true, 1, 20, true);     // number[]
await int('templates', 'reps', true, 1, 200, true);     // number[]
await flt('templates', 'weights', true, 0, 1000, true);    // number[]
await waitForAttributes('templates', ['userId', 'name', 'exerciseNames']);
await idx('templates', 'idx_userId', 'key', ['userId']);

// ─── sessions ────────────────────────────────────────────────────────────────
// One document per completed (or in-progress) workout session.
console.log('\n📋 Collection: sessions');
await tryCreate('collection sessions', () =>
  db.createCollection(DB_ID, 'sessions', 'sessions', PERMS)
);
await str('sessions', 'userId', 128);
await str('sessions', 'templateName', 128);
await str('sessions', 'date', 10);                // YYYY-MM-DD
await str('sessions', 'startedAt', 32);            // ISO timestamp
await str('sessions', 'completedAt', 32, false);   // nullable
await str('sessions', 'sets', 32768, false);       // JSON blob of StoredSet[]
await waitForAttributes('sessions', ['userId', 'date']);
await idx('sessions', 'idx_userId', 'key', ['userId']);
await idx('sessions', 'idx_userId_date', 'key', ['userId', 'date']);

console.log('\n✅  Done!');
console.log('   Make sure .env.local has:');
console.log(`   NEXT_PUBLIC_APPWRITE_ENDPOINT=${ENDPOINT}`);
console.log(`   NEXT_PUBLIC_APPWRITE_PROJECT_ID=${PROJECT_ID}`);
console.log(`   NEXT_PUBLIC_APPWRITE_DB_ID=${DB_ID}\n`);
