'use client';

import { Client, Databases, ID, Query } from 'appwrite';
import {
  AW_ENDPOINT, AW_PROJECT_ID, AW_DB_ID,
  COL_WEIGHTS, COL_ROUTINE, COL_EXERCISES,
} from './config';
import type { Exercise } from '@/types';
import { DEFAULT_EXERCISES } from './defaults';

// ─── CLIENT ──────────────────────────────────────────────────────────────────
let _db: Databases | null = null;

function getDb(): Databases {
  if (!_db) {
    const client = new Client().setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT_ID);
    _db = new Databases(client);
  }
  return _db;
}

// ─── OFFLINE WRITE QUEUE ─────────────────────────────────────────────────────
type WriteOp = 'create' | 'update' | 'upsert' | 'delete';

interface QueueItem {
  op: WriteOp;
  col: string;
  docId: string;
  data: Record<string, unknown>;
}

const QUEUE_KEY = 'brogress_queue';

function loadQueue(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; }
}
function saveQueue(q: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

let writeQueue: QueueItem[] = loadQueue();

export async function awWrite(
  op: WriteOp,
  col: string,
  docId: string,
  data: Record<string, unknown> = {},
) {
  try {
    const db = getDb();
    if (op === 'create') {
      await db.createDocument(AW_DB_ID, col, docId, data);
    } else if (op === 'update') {
      await db.updateDocument(AW_DB_ID, col, docId, data);
    } else if (op === 'upsert') {
      try { await db.updateDocument(AW_DB_ID, col, docId, data); }
      catch { await db.createDocument(AW_DB_ID, col, docId, data); }
    } else if (op === 'delete') {
      await db.deleteDocument(AW_DB_ID, col, docId);
    }
  } catch (e) {
    console.warn('Appwrite write queued:', e);
    writeQueue.push({ op, col, docId, data });
    saveQueue(writeQueue);
  }
}

export async function awRead<T extends Record<string, unknown>>(
  col: string,
  queries: string[] = [],
): Promise<T[] | null> {
  try {
    const db = getDb();
    const res = await db.listDocuments(AW_DB_ID, col, queries);
    return res.documents as unknown as T[];
  } catch (e) {
    console.warn('Appwrite read failed:', e);
    return null;
  }
}

export async function flushQueue() {
  if (writeQueue.length === 0) return;
  const pending = [...writeQueue];
  writeQueue = [];
  saveQueue(writeQueue);
  for (const item of pending) {
    await awWrite(item.op, item.col, item.docId, item.data);
  }
}

// Flush on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
}

// ─── SEED ─────────────────────────────────────────────────────────────────────
export async function seedAppwrite(deviceId: string) {
  for (const e of DEFAULT_EXERCISES) {
    await awWrite('create', COL_EXERCISES, e.id, {
      name: e.name,
      defaultSets: e.sets,
      defaultReps: e.reps,
      defaultRestSeconds: 120,
    });
  }
  await awWrite('upsert', COL_ROUTINE, 'routine_' + deviceId, {
    deviceId,
    exerciseIds: DEFAULT_EXERCISES.map(e => e.id),
    sets: DEFAULT_EXERCISES.map(e => e.sets),
    reps: DEFAULT_EXERCISES.map(e => e.reps),
  });
}

// ─── WEIGHTS ─────────────────────────────────────────────────────────────────
export async function loadWeightsFromAppwrite(
  deviceId: string,
  routine: Exercise[],
): Promise<Exercise[]> {
  const docs = await awRead<{ exerciseId: string; currentWeight: number }>(
    COL_WEIGHTS,
    [Query.equal('deviceId', deviceId)],
  );
  if (!docs) return routine;
  const updated = routine.map(ex => {
    const doc = docs.find(d => d.exerciseId === ex.id);
    return doc ? { ...ex, weight: doc.currentWeight } : ex;
  });
  return updated;
}

export async function persistWeight(deviceId: string, exId: string, weight: number) {
  await awWrite('upsert', COL_WEIGHTS, `w_${exId}_${deviceId}`, {
    exerciseId: exId,
    deviceId,
    currentWeight: weight,
  });
}

export async function persistRoutine(deviceId: string, routine: Exercise[]) {
  await awWrite('upsert', COL_ROUTINE, `routine_${deviceId}`, {
    deviceId,
    exerciseIds: routine.map(e => e.id),
    sets: routine.map(e => e.sets),
    reps: routine.map(e => e.reps),
  });
}

// Re-export ID and Query for use in other modules
export { ID, Query };
