/**
 * Wipe all documents from every collection without touching the schema.
 * Usage: node wipe-appwrite.mjs
 */

import { Client, Databases, Query } from 'node-appwrite';

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   ?? 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? '69d8bee6003534918879';
const API_KEY    = process.env.APPWRITE_API_KEY    ?? 'standard_7b179c402f3977c72587ad9d095b9a634d4592ba0a2c682c2bf33e8d0b251bdbb834344b53b19f8aa67469df38bffed014fc57d9e09f2630748ad30610e69a8dfa92c91f31e589d9f3e1fad3349daf4f7054f7ae3b6050427ff18b63930eba4ebd9dc28755d1efd449d99c6d3801d6b0e96ee9669fb8ea909635480edf47d3b6';
const DB_ID      = process.env.APPWRITE_DB_ID      ?? 'database-brogress';

const COLLECTIONS = ['templates', 'sessions'];

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

async function wipeCollection(colId) {
  let deleted = 0;
  while (true) {
    const res = await db.listDocuments(DB_ID, colId, [Query.limit(100)]);
    if (res.documents.length === 0) break;
    for (const doc of res.documents) {
      await db.deleteDocument(DB_ID, colId, doc.$id);
      deleted++;
    }
  }
  console.log(`  ✓  ${colId}: deleted ${deleted} docs`);
}

console.log('\n🗑  Wiping all documents...\n');
for (const col of COLLECTIONS) {
  await wipeCollection(col);
}
console.log('\n✅  Done.\n');
