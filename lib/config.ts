// ─── APPWRITE CONFIG ─────────────────────────────────────────────────────────
// Swap these values for your Appwrite project
export const AW_ENDPOINT   = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT   ?? 'https://cloud.appwrite.io/v1';
export const AW_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? 'YOUR_PROJECT_ID';
export const AW_DB_ID      = process.env.NEXT_PUBLIC_APPWRITE_DB_ID      ?? 'YOUR_DATABASE_ID';

// Collection IDs
export const COL_EXERCISES = 'exercises';
export const COL_ROUTINE   = 'routine';
export const COL_SESSIONS  = 'sessions';
export const COL_SETS      = 'session_sets';
export const COL_WEIGHTS   = 'weights';
