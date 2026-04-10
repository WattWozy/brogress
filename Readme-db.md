# Database Structure

The app uses **Appwrite** as its backend. There is one database (`AW_DB_ID`) containing five collections, plus browser **localStorage** for offline-first caching and a write queue.

---

## Collections

### `exercises`
Stores the exercise library for a user. Seeded from `DEFAULT_EXERCISES` on first login.

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Owner of this exercise |
| `name` | string | Display name (e.g. "Squat") |
| `defaultSets` | number | Default set count |
| `defaultReps` | number | Default rep count |
| `defaultRestSeconds` | number | Rest timer default (120 s) |

Document ID pattern: `{userId}_{exerciseId}` (e.g. `abc123_ex_squat`)

---

### `routine`
One document per user — the ordered list of exercises they plan to do each session.

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Owner |
| `exerciseIds` | string[] | Ordered array of exercise IDs |
| `sets` | number[] | Set count per exercise (parallel array) |
| `reps` | number[] | Rep count per exercise (parallel array) |

Document ID pattern: `routine_{userId}` — there is always exactly one per user.

---

### `weights`
Tracks the current working weight for each exercise per user. Updated whenever a weight changes.

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Owner |
| `exerciseId` | string | References an exercise |
| `currentWeight` | number | Weight in kg |

Document ID pattern: `w_{exerciseId}_{userId}`

---

### `sessions`
One document per workout session — records when the session happened.

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Device ID (or user ID when logged in) |
| `date` | string | ISO date, e.g. `2026-04-10` |
| `startedAt` | string | Full ISO timestamp |

Document ID pattern: auto-generated session ID (stored in app state as `currentSessionId`).

---

### `session_sets`
One document per completed set within a session. This is the most granular table — it holds the actual workout log.

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string | Links to a `sessions` document |
| `exerciseId` | string | Links to an `exercises` document |
| `exerciseName` | string | Denormalized name (for display without a join) |
| `setNumber` | number | Which set within the exercise (1-indexed) |
| `reps` | number | Reps performed |
| `weight` | number | Weight used in kg |
| `feel` | string | `'easy'`, `'right'`, `'hard'`, or `''` |

Document ID pattern: `set_{sessionId}_{exerciseId}_{setNumber}`

---

## Relationships

```
exercises (1) ──< weights (many)        one weight record per exercise per user
exercises (1) ──< session_sets (many)   sets reference which exercise was done
routine   (1) ──  exercises (many)      routine holds an ordered list of exercise IDs
sessions  (1) ──< session_sets (many)   each session has many logged sets
```

---

## localStorage (offline layer)

In addition to Appwrite, the browser caches data locally:

| Key | Content |
|---|---|
| `brogress_routine` | Full routine JSON — used when offline or before Appwrite loads |
| `brogress_weight_{exId}` | Last known weight per exercise |
| `brogress_device_id` | Stable anonymous device ID used as `userId` before login |
| `brogress_queue` | Pending write operations that failed (flushed on reconnect) |

The write queue (`brogress_queue`) replays failed Appwrite writes automatically when the browser comes back online via a `window.addEventListener('online', flushQueue)` listener.
