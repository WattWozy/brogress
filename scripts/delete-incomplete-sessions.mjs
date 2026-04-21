import { Client, Databases, Query } from 'node-appwrite';

const ENDPOINT   = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '69d8bee6003534918879';
const DB_ID      = 'brogress';
const COL        = 'sessions';
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('Set APPWRITE_API_KEY env var');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);

async function deleteIncompleteSessions() {
  let deleted = 0;
  let cursor = undefined;

  while (true) {
    const queries = [
      Query.isNull('completedAt'),
      Query.limit(100),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await db.listDocuments(DB_ID, COL, queries);
    if (res.documents.length === 0) break;

    for (const doc of res.documents) {
      await db.deleteDocument(DB_ID, COL, doc.$id);
      console.log(`Deleted ${doc.$id} (startedAt: ${doc.startedAt ?? 'unknown'})`);
      deleted++;
    }

    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }

  console.log(`\nDone. Deleted ${deleted} incomplete session(s).`);
}

deleteIncompleteSessions().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
