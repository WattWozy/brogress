'use client';

import { Client, Account, Databases, ID, Query } from 'appwrite';
import { AW_ENDPOINT, AW_PROJECT_ID, AW_DB_ID, COL_TEMPLATES, COL_SESSIONS, COL_SETS } from './config';
import type { Exercise, SessionSet, WorkoutTemplate } from '@/types';

// ─── CLIENT ──────────────────────────────────────────────────────────────────
let _client: Client | null = null;
let _db: Databases | null = null;
let _account: Account | null = null;

function getClient(): Client {
  if (!_client) _client = new Client().setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT_ID);
  return _client;
}
function getDb(): Databases {
  if (!_db) _db = new Databases(getClient());
  return _db;
}
function getAccount(): Account {
  if (!_account) _account = new Account(getClient());
  return _account;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export async function getUser() {
  return getAccount().get();
}
export async function loginWithEmail(email: string, password: string) {
  return getAccount().createEmailPasswordSession(email, password);
}
export async function registerWithEmail(email: string, password: string) {
  return getAccount().create(ID.unique(), email, password);
}
export async function logoutUser() {
  return getAccount().deleteSession('current');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Derive a stable local ID from an exercise name (never persisted to Appwrite).
export function exerciseId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

function docToTemplate(doc: Record<string, unknown>): WorkoutTemplate {
  const names   = doc.exerciseNames as string[];
  const sets    = doc.sets    as number[];
  const reps    = doc.reps    as number[];
  const weights = doc.weights as number[];
  return {
    id: doc.$id as string,
    name: doc.name as string,
    exercises: names.map((name, i) => ({
      id: exerciseId(name),
      name,
      sets:   sets[i],
      reps:   reps[i],
      weight: weights[i],
    })),
  };
}

export async function loadAllTemplates(userId: string): Promise<WorkoutTemplate[]> {
  try {
    const res = await getDb().listDocuments(AW_DB_ID, COL_TEMPLATES, [
      Query.equal('userId', userId),
      Query.limit(25),
    ]);
    return res.documents.map(d => docToTemplate(d as unknown as Record<string, unknown>));
  } catch (e) {
    console.warn('loadAllTemplates failed:', e);
    return [];
  }
}

// Creates a new template (no templateId) or updates an existing one (with templateId).
// Returns the Appwrite $id of the document.
export async function saveTemplate(
  userId: string,
  exercises: Exercise[],
  name: string,
  templateId?: string,
): Promise<string> {
  const data = {
    userId,
    name,
    exerciseNames: exercises.map(e => e.name),
    sets:    exercises.map(e => e.sets),
    reps:    exercises.map(e => e.reps),
    weights: exercises.map(e => e.weight),
  };
  try {
    const db = getDb();
    if (templateId) {
      await db.updateDocument(AW_DB_ID, COL_TEMPLATES, templateId, data);
      return templateId;
    } else {
      const doc = await db.createDocument(AW_DB_ID, COL_TEMPLATES, ID.unique(), data);
      return doc.$id;
    }
  } catch (e) {
    console.warn('saveTemplate failed:', e);
    return templateId ?? '';
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    await getDb().deleteDocument(AW_DB_ID, COL_TEMPLATES, templateId);
  } catch (e) {
    console.warn('deleteTemplate failed:', e);
  }
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────

export async function createSession(userId: string, templateName: string): Promise<string> {
  const doc = await getDb().createDocument(AW_DB_ID, COL_SESSIONS, ID.unique(), {
    userId,
    templateName,
    date:      new Date().toISOString().slice(0, 10),
    startedAt: new Date().toISOString(),
  });
  return doc.$id;
}

export async function completeSession(sessionId: string): Promise<void> {
  try {
    await getDb().updateDocument(AW_DB_ID, COL_SESSIONS, sessionId, {
      completedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('completeSession failed:', e);
  }
}

// ─── SETS ─────────────────────────────────────────────────────────────────────

export async function saveSet(
  sessionId: string,
  userId: string,
  exerciseName: string,
  setNumber: number,
  reps: number,
  weight: number,
  feel: string,
): Promise<void> {
  try {
    await getDb().createDocument(AW_DB_ID, COL_SETS, ID.unique(), {
      sessionId, userId, exerciseName, setNumber, reps, weight, feel,
    });
  } catch (e) {
    console.warn('saveSet failed:', e);
  }
}

// Update feel on all sets for a given exercise in a session.
export async function updateSetsFeel(sessionId: string, exerciseName: string, feel: string): Promise<void> {
  try {
    const db = getDb();
    const res = await db.listDocuments(AW_DB_ID, COL_SETS, [
      Query.equal('sessionId', sessionId),
      Query.equal('exerciseName', exerciseName),
    ]);
    await Promise.all(
      res.documents.map(doc => db.updateDocument(AW_DB_ID, COL_SETS, doc.$id, { feel }))
    );
  } catch (e) {
    console.warn('updateSetsFeel failed:', e);
  }
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────

// Returns the Appwrite $id of the user's most recent session, or null.
// Used as a cheap cache-validity key — one document, no set data.
export async function loadLatestSessionId(userId: string): Promise<string | null> {
  try {
    const res = await getDb().listDocuments(AW_DB_ID, COL_SESSIONS, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ]);
    return (res.documents[0]?.$id as string) ?? null;
  } catch {
    return null;
  }
}

// Fetches sets directly by userId (uses idx_userId_createdAt), bypassing the
// sessions → sets N+1 pattern.  Default limit covers ~10 typical sessions.
export async function loadRecentSets(userId: string, limit = 300): Promise<SessionSet[]> {
  try {
    const res = await getDb().listDocuments(AW_DB_ID, COL_SETS, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]);
    return res.documents as unknown as SessionSet[];
  } catch (e) {
    console.warn('loadRecentSets failed:', e);
    return [];
  }
}

export async function loadSessionDates(userId: string): Promise<{ sessionId: string; date: string }[]> {
  try {
    const res = await getDb().listDocuments(AW_DB_ID, COL_SESSIONS, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(60),
    ]);
    return res.documents.map(d => ({ sessionId: d.$id, date: d.date as string }));
  } catch (e) {
    console.warn('loadSessionDates failed:', e);
    return [];
  }
}

export async function loadSessionSets(sessionId: string): Promise<SessionSet[]> {
  try {
    const res = await getDb().listDocuments(AW_DB_ID, COL_SETS, [
      Query.equal('sessionId', sessionId),
      Query.orderAsc('setNumber'),
    ]);
    return res.documents as unknown as SessionSet[];
  } catch (e) {
    console.warn('loadSessionSets failed:', e);
    return [];
  }
}
