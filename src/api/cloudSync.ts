/**
 * Account sync for the trader's workspace settings (signed-in users only).
 *
 * What syncs (each is one "document" stored on the server as a special layout row, `/api/layouts`):
 *   - watchlists : named watchlists               (localStorage `matrix.watchlists`)
 *   - layouts    : saved named layouts + splitter sizes (`matrix.layouts`, `matrix.layout.sizes.v1`)
 *   - indicators : indicators of every chart cell (`matrix.indicators.*`)
 * Chart drawings sync separately through `/api/drawings` (see drawings.ts).
 *
 * Model: the screens keep reading/writing localStorage exactly as before. This module notices those
 * writes, uploads the changed document a moment later, and on sign-in / app start downloads newer
 * documents from the account (last change wins), then tells the screens to re-read
 * (`matrix:cloud-sync-applied`).
 */
import { apiClient } from './client';
import { getToken, onSessionChange } from './session';

type DocName = 'watchlists' | 'layouts' | 'indicators';

interface DocSpec {
  keys?: string[];
  prefix?: string;
}

const DOCS: Record<DocName, DocSpec> = {
  watchlists: { keys: ['matrix.watchlists'] },
  layouts: { keys: ['matrix.layouts', 'matrix.layout.sizes.v1'] },
  indicators: { prefix: 'matrix.indicators.' },
};

const DOC_NAMES = Object.keys(DOCS) as DocName[];
const META_KEY = 'matrix.sync.meta.v1';
const PUSH_DELAY_MS = 2000;
const MAX_DOC_BYTES = 900_000; // server limit is 1 MB per layout payload

interface DocMeta {
  updatedAt: number; // ms, time of the last local change or of the server copy we applied
  rowId?: string; // server row id of this document for the current account
  owner?: number; // account the rowId belongs to
}

interface SyncPayload {
  id: string;
  kind: 'matrix-sync';
  v: 1;
  updatedAt: number;
  data: Record<string, string>;
}

export interface CloudSyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'error';
  lastSyncAt: number | null;
  error?: string;
}

let status: CloudSyncStatus = { state: 'off', lastSyncAt: null };
const statusListeners = new Set<(s: CloudSyncStatus) => void>();

function setStatus(next: Partial<CloudSyncStatus>) {
  status = { ...status, ...next };
  statusListeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      // listener errors must not break sync
    }
  });
}

export function getCloudSyncStatus(): CloudSyncStatus {
  return status;
}

export function onCloudSyncStatus(fn: (s: CloudSyncStatus) => void): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

// ---------------------------------------------------------------------------------------------
// Local storage helpers (every access guarded: storage can be blocked)

let applying = false; // true while we write server data locally (those writes are not "local changes")

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsKeys(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}

function readMeta(): Record<string, DocMeta> {
  const raw = lsGet(META_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, DocMeta>) {
  const prev = applying;
  applying = true;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  } finally {
    applying = prev;
  }
}

function docForKey(key: string): DocName | null {
  for (const name of DOC_NAMES) {
    const spec = DOCS[name];
    if (spec.keys && spec.keys.includes(key)) return name;
    if (spec.prefix && key.startsWith(spec.prefix)) return name;
  }
  return null;
}

function collect(name: DocName): Record<string, string> {
  const spec = DOCS[name];
  const data: Record<string, string> = {};
  const keys = spec.keys ? spec.keys : lsKeys().filter((k) => spec.prefix && k.startsWith(spec.prefix));
  for (const k of keys) {
    const v = lsGet(k);
    if (v !== null) data[k] = v;
  }
  return data;
}

function apply(name: DocName, data: Record<string, string>) {
  const spec = DOCS[name];
  applying = true;
  try {
    const current = spec.keys ? spec.keys : lsKeys().filter((k) => spec.prefix && k.startsWith(spec.prefix));
    for (const k of current) {
      if (!(k in data)) {
        try {
          window.localStorage.removeItem(k);
        } catch {
          // ignore
        }
      }
    }
    for (const [k, v] of Object.entries(data)) {
      if (docForKey(k) !== name || typeof v !== 'string') continue; // never let a server doc write other keys
      try {
        window.localStorage.setItem(k, v);
      } catch {
        // ignore
      }
    }
  } finally {
    applying = false;
  }
}

// ---------------------------------------------------------------------------------------------
// Change tracking

const pushTimers = new Map<DocName, ReturnType<typeof setTimeout>>();

function markDirty(name: DocName) {
  const meta = readMeta();
  meta[name] = { ...(meta[name] || {}), updatedAt: Date.now() };
  writeMeta(meta);
  if (!getToken()) return;
  const t = pushTimers.get(name);
  if (t) clearTimeout(t);
  pushTimers.set(
    name,
    setTimeout(() => {
      pushTimers.delete(name);
      void push(name);
    }, PUSH_DELAY_MS)
  );
}

let storagePatched = false;

function patchStorage() {
  if (storagePatched || typeof Storage === 'undefined') return;
  storagePatched = true;
  const proto = Storage.prototype;
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  proto.setItem = function (this: Storage, key: string, value: string) {
    origSet.call(this, key, value);
    try {
      if (!applying && this === window.localStorage) {
        const doc = docForKey(String(key));
        if (doc) markDirty(doc);
      }
    } catch {
      // tracking must never break the caller's write
    }
  };
  proto.removeItem = function (this: Storage, key: string) {
    origRemove.call(this, key);
    try {
      if (!applying && this === window.localStorage) {
        const doc = docForKey(String(key));
        if (doc) markDirty(doc);
      }
    } catch {
      // ignore
    }
  };
}

// ---------------------------------------------------------------------------------------------
// Server

interface ServerLayout {
  id: string;
  name: string;
  payload: unknown;
}

function currentUserId(): number | null {
  const raw = lsGet('matrix.session.user');
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    return typeof u?.user_id === 'number' ? u.user_id : null;
  } catch {
    return null;
  }
}

async function push(name: DocName): Promise<boolean> {
  if (!getToken()) return false;
  const meta = readMeta();
  const m = meta[name] || { updatedAt: Date.now() };
  const data = collect(name);
  const payload: SyncPayload = { id: `sync:${name}`, kind: 'matrix-sync', v: 1, updatedAt: m.updatedAt || Date.now(), data };
  const size = JSON.stringify(payload).length;
  if (size > MAX_DOC_BYTES) {
    setStatus({ state: 'error', error: `too_large:${name}` });
    return false;
  }
  const uid = currentUserId();
  const body: Record<string, unknown> = { name: `sync:${name}`, payload };
  if (m.rowId && m.owner === uid) body.id = m.rowId;
  setStatus({ state: 'syncing' });
  const res = await apiClient.post<{ ok: boolean; layout?: { id?: string } }>('/api/layouts', body);
  if (!res.ok) {
    setStatus({ state: 'error', error: res.error || `http_${res.status}` });
    return false;
  }
  const rowId = res.data?.layout?.id;
  const fresh = readMeta();
  fresh[name] = { ...(fresh[name] || { updatedAt: payload.updatedAt }), rowId: rowId || m.rowId, owner: uid ?? undefined };
  writeMeta(fresh);
  setStatus({ state: 'idle', lastSyncAt: Date.now(), error: undefined });
  return true;
}

function isSyncPayload(p: unknown, name: DocName): p is SyncPayload {
  if (!p || typeof p !== 'object') return false;
  const o = p as Partial<SyncPayload>;
  return o.id === `sync:${name}` && o.kind === 'matrix-sync' && typeof o.updatedAt === 'number' && !!o.data && typeof o.data === 'object';
}

let pulling: Promise<void> | null = null;

/** Download newer documents from the account and upload local ones the account does not have yet. */
export function syncNow(): Promise<void> {
  if (!getToken()) {
    setStatus({ state: 'off' });
    return Promise.resolve();
  }
  if (pulling) return pulling;
  pulling = (async () => {
    setStatus({ state: 'syncing' });
    const res = await apiClient.get<{ layouts: ServerLayout[] }>('/api/layouts');
    if (!res.ok || !res.data || !Array.isArray(res.data.layouts)) {
      setStatus({ state: 'error', error: res.error || `http_${res.status}` });
      return;
    }
    const uid = currentUserId();
    const meta = readMeta();
    const applied: DocName[] = [];
    const toPush: DocName[] = [];

    for (const name of DOC_NAMES) {
      const rows = res.data.layouts.filter((l) => isSyncPayload(l.payload, name));
      const newest = rows.sort((a, b) => (b.payload as SyncPayload).updatedAt - (a.payload as SyncPayload).updatedAt)[0];
      const local = meta[name];
      const localHasData = Object.keys(collect(name)).length > 0;
      if (newest) {
        const server = newest.payload as SyncPayload;
        const localTime = local && local.owner === uid ? local.updatedAt : local?.updatedAt ?? 0;
        if (server.updatedAt > localTime || !localHasData) {
          apply(name, server.data);
          meta[name] = { updatedAt: server.updatedAt, rowId: newest.id, owner: uid ?? undefined };
          applied.push(name);
        } else {
          meta[name] = { ...(local as DocMeta), rowId: newest.id, owner: uid ?? undefined };
          if (server.updatedAt < localTime) toPush.push(name);
        }
      } else if (localHasData) {
        meta[name] = { ...(local || { updatedAt: Date.now() }), rowId: undefined, owner: uid ?? undefined };
        toPush.push(name);
      }
    }
    writeMeta(meta);

    if (applied.length > 0) {
      window.dispatchEvent(new CustomEvent('matrix:cloud-sync-applied', { detail: { docs: applied } }));
    }
    for (const name of toPush) {
      await push(name);
    }
    setStatus({ state: 'idle', lastSyncAt: Date.now(), error: undefined });
  })().finally(() => {
    pulling = null;
  });
  return pulling;
}

/** Subscribe to "server data was applied locally" (screens re-read their localStorage). */
export function onCloudSyncApplied(fn: (docs: string[]) => void): () => void {
  const handler = (e: Event) => {
    const docs = (e as CustomEvent<{ docs: string[] }>).detail?.docs || [];
    fn(docs);
  };
  window.addEventListener('matrix:cloud-sync-applied', handler);
  return () => window.removeEventListener('matrix:cloud-sync-applied', handler);
}

let started = false;

export function startCloudSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  patchStorage();
  onSessionChange((user) => {
    if (user) void syncNow();
    else setStatus({ state: 'off' });
  });
  // Pick up changes made on other devices when the trader comes back to this tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getToken()) void syncNow();
  });
  if (getToken()) void syncNow();
}
