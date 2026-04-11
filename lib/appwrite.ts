'use client';

import { Client, Account, Databases, ID, Query } from 'appwrite';
import { AW_ENDPOINT, AW_PROJECT_ID, AW_DB_ID, COL_TEMPLATES, COL_SESSIONS } from './config';
import type { Exercise, Feel, SessionSet, StoredSet, WorkoutTemplate } from '@/types';

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
// Sets are stored as a JSON blob on the session document — no separate collection.
// The caller always passes the complete current set list; last write wins.

export async function persistSessionSets(sessionId: string, sets: StoredSet[]): Promise<void> {
  try {
    await getDb().updateDocument(AW_DB_ID, COL_SESSIONS, sessionId, {
      sets: JSON.stringify(sets),
    });
  } catch (e) {
    console.warn('persistSessionSets failed:', e);
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

// Fetches sets from the most recent sessions. One request for N sessions,
// each carrying its full sets blob — replaces the old 300-document query.
export async function loadRecentSets(userId: string, sessionLimit = 15): Promise<SessionSet[]> {
  try {
    const res = await getDb().listDocuments(AW_DB_ID, COL_SESSIONS, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(sessionLimit),
      Query.select(['$id', 'sets']),
    ]);
    const sets: SessionSet[] = [];
    for (const doc of res.documents) {
      if (!doc.sets) continue;
      const stored: StoredSet[] = JSON.parse(doc.sets as string);
      for (const s of stored) {
        sets.push({
          $id: `${doc.$id}:${s.exerciseName}:${s.setNumber}`,
          sessionId: doc.$id,
          userId,
          exerciseName: s.exerciseName,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          feel: s.feel as Feel | '',
        });
      }
    }
    return sets;
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
      Query.select(['$id', 'date']),
    ]);
    return res.documents.map(d => ({ sessionId: d.$id, date: d.date as string }));
  } catch (e) {
    console.warn('loadSessionDates failed:', e);
    return [];
  }
}

export async function loadSessionSets(sessionId: string): Promise<SessionSet[]> {
  try {
    const doc = await getDb().getDocument(AW_DB_ID, COL_SESSIONS, sessionId);
    if (!doc.sets) return [];
    const stored: StoredSet[] = JSON.parse(doc.sets as string);
    return stored.map(s => ({
      $id: `${sessionId}:${s.exerciseName}:${s.setNumber}`,
      sessionId,
      userId: doc.userId as string,
      exerciseName: s.exerciseName,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      feel: s.feel as Feel | '',
    }));
  } catch (e) {
    console.warn('loadSessionSets failed:', e);
    return [];
  }
}
