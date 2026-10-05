/**
 * اختبارات متجر قائمة المتابعة مع تخزين وهمي (تأخير / فشل / سباق).
 * تشغيل: npx tsx src/chart/watchlistStore.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_WATCH_SYMBOLS,
  WATCHLIST_STORE_VERSION,
} from './watchlistSanitize';
import { parseV1Payload, parseV2Payload } from './watchlistParse';
import {
  WATCHLIST_KEY_V1,
  WATCHLIST_KEY_V2,
  addWatchSymbol,
  ensureWatchlistLoaded,
  getWatchlistSaveError,
  getWatchlistSnapshot,
  removeWatchSymbol,
  resetWatchlistMemory,
  resetWatchlistToDefault,
  setWatchlistStorage,
  type WatchlistStorage,
} from './watchlistStoreCore';

type Mem = Map<string, string>;

function makeStorage(opts?: {
  delayMs?: number;
  failSet?: boolean;
}): { storage: WatchlistStorage; mem: Mem } {
  const mem: Mem = new Map();
  const delay = opts?.delayMs ?? 0;
  const storage: WatchlistStorage = {
    async getItem(key) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      return mem.has(key) ? mem.get(key)! : null;
    },
    async setItem(key, value) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (opts?.failSet) throw new Error('persist failed');
      mem.set(key, value);
    },
    async removeItem(key) {
      mem.delete(key);
    },
  };
  return { storage, mem };
}

function reset(storage: WatchlistStorage) {
  setWatchlistStorage(storage);
  resetWatchlistMemory();
}

async function testParse() {
  const emptyOk = parseV2Payload(JSON.stringify({ v: 2, symbols: [] }));
  assert.equal(emptyOk.status, 'ok');
  if (emptyOk.status === 'ok') assert.equal(emptyOk.empty, true);

  const bare = parseV2Payload(JSON.stringify(['EURUSD']));
  assert.equal(bare.status, 'corrupt');

  const future = parseV2Payload(JSON.stringify({ v: 99, symbols: ['EURUSD'] }));
  assert.equal(future.status, 'corrupt');
  if (future.status === 'corrupt') assert.equal(future.reason, 'future-version');

  const badSym = parseV2Payload(JSON.stringify({ v: 2, symbols: 'EURUSD' }));
  assert.equal(badSym.status, 'corrupt');

  const v1 = parseV1Payload(JSON.stringify(['EURUSD', 'FAKE']));
  assert.equal(v1.status, 'ok');
  if (v1.status === 'ok') assert.deepEqual(v1.symbols, ['EURUSD']);

  console.log('parse: ok');
}

async function testEmptyVsCorrupt() {
  const { storage, mem } = makeStorage();
  mem.set(WATCHLIST_KEY_V2, JSON.stringify({ v: 2, symbols: [] }));
  reset(storage);
  const empty = await ensureWatchlistLoaded();
  assert.deepEqual(empty, []);

  resetWatchlistMemory();
  mem.set(WATCHLIST_KEY_V2, '{not-json');
  const corrupt = await ensureWatchlistLoaded();
  assert.deepEqual(corrupt, DEFAULT_WATCH_SYMBOLS);

  resetWatchlistMemory();
  mem.set(WATCHLIST_KEY_V2, JSON.stringify({ v: 9, symbols: [] }));
  const future = await ensureWatchlistLoaded();
  assert.deepEqual(future, DEFAULT_WATCH_SYMBOLS);

  console.log('empty-vs-corrupt: ok');
}

async function testV1Migrate() {
  const { storage, mem } = makeStorage();
  mem.set(WATCHLIST_KEY_V1, JSON.stringify(['GBPUSD', 'XAUUSD']));
  reset(storage);
  const got = await ensureWatchlistLoaded();
  assert.deepEqual(got, ['GBPUSD', 'XAUUSD']);
  const v2 = mem.get(WATCHLIST_KEY_V2);
  assert.ok(v2);
  const parsed = JSON.parse(v2!);
  assert.equal(parsed.v, WATCHLIST_STORE_VERSION);
  assert.deepEqual(parsed.symbols, ['GBPUSD', 'XAUUSD']);
  assert.equal(mem.has(WATCHLIST_KEY_V1), false);
  console.log('v1-migrate: ok');
}

async function testConcurrentOps() {
  const { storage, mem } = makeStorage({ delayMs: 15 });
  mem.set(
    WATCHLIST_KEY_V2,
    JSON.stringify({ v: 2, symbols: ['EURUSD', 'GBPUSD', 'USDJPY'] })
  );
  reset(storage);
  await ensureWatchlistLoaded();

  await Promise.all([
    removeWatchSymbol('EURUSD'),
    removeWatchSymbol('GBPUSD'),
    addWatchSymbol('XAUUSD'),
  ]);
  const final = getWatchlistSnapshot()!;
  assert.ok(!final.includes('EURUSD'));
  assert.ok(!final.includes('GBPUSD'));
  assert.ok(final.includes('XAUUSD'));
  assert.ok(final.includes('USDJPY'));
  const disk = JSON.parse(mem.get(WATCHLIST_KEY_V2)!);
  assert.deepEqual(disk.symbols, final);
  console.log('concurrent: ok', final.join(','));
}

async function testResetDuringLoad() {
  const { storage, mem } = makeStorage({ delayMs: 40 });
  mem.set(
    WATCHLIST_KEY_V2,
    JSON.stringify({ v: 2, symbols: ['EURUSD', 'GBPUSD'] })
  );
  reset(storage);
  const loadP = ensureWatchlistLoaded();
  const resetP = resetWatchlistToDefault();
  await Promise.all([loadP, resetP]);
  const snap = getWatchlistSnapshot()!;
  assert.deepEqual(snap, DEFAULT_WATCH_SYMBOLS);
  const disk = JSON.parse(mem.get(WATCHLIST_KEY_V2)!);
  assert.deepEqual(disk.symbols, DEFAULT_WATCH_SYMBOLS);
  console.log('reset-during-load: ok');
}

async function testPersistFailure() {
  const { storage, mem } = makeStorage();
  mem.set(
    WATCHLIST_KEY_V2,
    JSON.stringify({ v: 2, symbols: ['EURUSD', 'GBPUSD'] })
  );
  reset(storage);
  await ensureWatchlistLoaded();

  setWatchlistStorage({
    getItem: storage.getItem,
    setItem: async () => {
      throw new Error('disk full');
    },
    removeItem: storage.removeItem,
  });

  const after = await removeWatchSymbol('EURUSD');
  assert.deepEqual(after, ['EURUSD', 'GBPUSD']);
  assert.equal(getWatchlistSaveError(), 'wlSaveFailed');
  assert.deepEqual(getWatchlistSnapshot(), ['EURUSD', 'GBPUSD']);
  assert.deepEqual(JSON.parse(mem.get(WATCHLIST_KEY_V2)!).symbols, ['EURUSD', 'GBPUSD']);
  console.log('persist-failure: ok');
}

async function main() {
  const recovery = makeStorage();
  recovery.mem.set(WATCHLIST_KEY_V1, JSON.stringify(['EURUSD']));
  reset({ ...recovery.storage, getItem: async () => { throw new Error('read failed'); } });
  await assert.rejects(ensureWatchlistLoaded());
  assert.equal(getWatchlistSnapshot(), null);
  assert.equal(recovery.mem.has(WATCHLIST_KEY_V2), false);
  setWatchlistStorage({ ...recovery.storage, setItem: async () => { throw new Error('migration failed'); } });
  await assert.rejects(ensureWatchlistLoaded());
  assert.equal(getWatchlistSnapshot(), null);
  assert.ok(recovery.mem.has(WATCHLIST_KEY_V1));
  setWatchlistStorage(recovery.storage);
  assert.deepEqual(await ensureWatchlistLoaded(), ['EURUSD']);
  assert.equal(recovery.mem.has(WATCHLIST_KEY_V1), false);
  console.log('read-and-migration-retry: ok');
  await testParse();
  await testEmptyVsCorrupt();
  await testV1Migrate();
  await testConcurrentOps();
  await testResetDuringLoad();
  await testPersistFailure();
  resetWatchlistMemory();
  console.log('ALL watchlistStore.selftest PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
