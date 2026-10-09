/* 跨设备同步引擎：把学习进度存在学习者自己 GitHub 账号下的一个私密 Gist 里。
   独立的异步 chunk（`sync-engine`），只有开启了同步的人才会加载；纯逻辑在 logic/merge.ts、syncFormat.ts、syncPlan.ts（有单元测试）。

   工作方式：
   - 云端文件 hands-on-vue3-progress.json = { schema, app, updatedAt, device, progress }。每次同步都是"读云端 → 和本机合并 → 合并结果写回两边"。
   - 时机：开启时立即一次；页面加载后拉取；本机进度变化后防抖 6~10 秒推送；回到前台超过 5 分钟再拉；页面隐藏时尽力用 keepalive 推一次。
     推送前总是先读云端（用 ETag 条件请求，没变就是 304 且不计入限额），所以不会覆盖另一台设备刚写的内容。
   - 多标签页：用 Web Locks 选出一个"负责联网"的标签页；其他标签页写进 localStorage 的进度，靠 storage 事件合并进负责的那个页面。
   - 绝不丢本地数据：每次用合并结果覆盖本机之前先备份（最近 2 份）；先写 localStorage、成功了才改内存；任何错误都不动本地进度。
   - 令牌：只存在本机 localStorage 的 SYNC_KEY，只发往 https://api.github.com（见 request 里的白名单检查），不进 URL、不写日志、不放进提示文字。 */
import { type Envelope, PROGRESS_SCHEMA, SYNC_DESC, SYNC_FILE, makeEnvelope, parseEnvelope } from './logic/syncFormat.ts';
import { canon, changedChapters, mergeProgress, sameProgress } from './logic/merge.ts';
import {
  MAX_ATTEMPTS,
  backoffDelay,
  classify,
  isAllowedUrl,
  looksLikeToken,
  nextPage,
  parseGistId,
  pushDelay,
  rateLimitWait,
  shouldPullOnForeground,
} from './logic/syncPlan.ts';
import { PROGRESS_EVENT, STORE_KEY, SAVED_EVENT, progress, resyncStamps } from './store.ts';
import { BACKUP_KEY, STATUS_EVENT, STATUS_KEY, SYNC_KEY, type SyncConfig, type SyncStatus, getMergeContext, readConfig, readStatus } from './syncState.ts';

type Obj = Record<string, any>;
const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
/** 测试用的时间调节（e2e 里用 addInitScript 设置）；正式环境不存在 */
const tune = (): Obj => (typeof window !== 'undefined' && (window as any).__hovSyncTest) || {};

export type ErrKind = 'auth' | 'scope' | 'rate' | 'forbidden' | 'gone' | 'network' | 'server' | 'corrupt' | 'newer' | 'storage' | 'toolarge' | 'client';
export class SyncError extends Error {
  kind: ErrKind;
  retryAt?: number;
  constructor(kind: ErrKind, message: string, retryAt?: number) {
    super(message);
    this.kind = kind;
    this.retryAt = retryAt;
  }
}

/* ---------- 请求 ---------- */
interface Res {
  status: number;
  etag?: string;
  link?: string;
  scopes?: string;
  json?: any;
}
interface ReqOpts {
  token: string;
  body?: unknown;
  etag?: string;
  keepalive?: boolean;
}
/** 唯一带令牌的出口。地址不在白名单里就拒绝；不跟随重定向到别处；不发 Referer；不带 cookie。错误只用固定的中文，不回显服务器内容 */
async function request(method: string, path: string, o: ReqOpts): Promise<Res> {
  const url = API + path;
  if (!isAllowedUrl(url, 'api')) throw new SyncError('client', '请求地址不被允许。');
  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + o.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
  };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.etag) headers['If-None-Match'] = o.etag;
  let r: Response;
  try {
    r = await fetch(url, {
      method,
      headers,
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      keepalive: o.keepalive,
    });
  } catch {
    throw new SyncError('network', '无法连接到 GitHub。');
  }
  const h = (n: string) => r.headers.get(n);
  const v = classify(r.status, { remaining: h('x-ratelimit-remaining'), retryAfter: h('retry-after') });
  if (v === 'auth') throw new SyncError('auth', 'GitHub 不认这个令牌。');
  if (v === 'rate') {
    const wait = rateLimitWait(num(h('x-ratelimit-reset')), num(h('retry-after')), Date.now());
    throw new SyncError('rate', 'GitHub 限制了请求次数。', Date.now() + wait);
  }
  if (v === 'forbidden') throw new SyncError('forbidden', '令牌没有这项权限。');
  if (v === 'gone') throw new SyncError('gone', '找不到这个 Gist。');
  if (v === 'retry') throw new SyncError('server', 'GitHub 暂时不可用。');
  if (v === 'client') throw new SyncError('client', 'GitHub 拒绝了这个请求。');
  const res: Res = { status: r.status, etag: h('etag') || undefined, link: h('link') || undefined, scopes: h('x-oauth-scopes') ?? undefined };
  if (v === 'ok' && r.status !== 204) {
    try {
      res.json = await r.json();
    } catch {
      throw new SyncError('server', 'GitHub 返回了读不懂的内容。');
    }
  }
  return res;
}
const num = (s: string | null): number | undefined => (s !== null && s !== '' && Number.isFinite(Number(s)) ? Number(s) : undefined);

/* ---------- 状态与存储 ---------- */
function setStatus(patch: Partial<SyncStatus>): void {
  const next = { ...readStatus(), ...patch };
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(STATUS_EVENT));
}
interface Backup {
  at: number;
  reason: string;
  data: string;
}
export const listBackups = (): Backup[] => {
  try {
    const v = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    return Array.isArray(v) ? v.filter(b => b && typeof b.data === 'string') : [];
  } catch {
    return [];
  }
};
/** 覆盖本机进度前备份当前内容，只留最近 2 份。写不进去（空间不足）就抛 storage 错误，调用方因此不会去覆盖 */
function backupLocal(reason: string): void {
  const cur = JSON.stringify(progress);
  const list = listBackups();
  if (list[0] && list[0].data === cur) return;
  list.unshift({ at: Date.now(), reason, data: cur });
  for (const keep of [2, 1]) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, keep)));
      return;
    } catch {}
  }
  throw new SyncError('storage', '浏览器存储空间不足，没法先备份本机进度。');
}

/** 把 src 的内容就地写进 target：保持 target 里已有对象的身份（页面里的组件还拿着它们），target 多出来的键删掉 */
function deepAssign(target: Obj, src: Obj): void {
  for (const k of Object.keys(target)) if (!(k in src)) delete target[k];
  for (const [k, v] of Object.entries(src)) {
    const t = target[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && t && typeof t === 'object' && !Array.isArray(t)) deepAssign(t, v);
    else target[k] = v;
  }
}

const merge = (a: unknown, b: unknown) => mergeProgress(a, b, getMergeContext());

/** 用 next 换掉本机进度。先写 localStorage（失败就抛错，内存不动），再就地更新内存、重算时间戳基线、通知界面 */
function applyLocal(next: Obj, o: { backup?: string }): void {
  const str = JSON.stringify(next);
  try {
    if (o.backup) backupLocal(o.backup);
    localStorage.setItem(STORE_KEY, str);
  } catch (e) {
    if (e instanceof SyncError) throw e;
    throw new SyncError('storage', '浏览器存储空间不足，没法保存合并后的进度。');
  }
  deepAssign(progress, JSON.parse(str));
  resyncStamps();
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

/* ---------- 引擎状态 ---------- */
let cfg: SyncConfig | null = null;
let started = false;
let isLeader = false;
let running = false;
let rerun = false;
let stopped = false; // 出错需要人处理，或连续失败太多：不再自动重试
let dirty = false;
/** 上次同步完成时，不含阅读位置的进度签名：只有阅读位置变了不触发推送（读一页会不停更新它），下次有别的改动时一起带上 */
let cleanSig = '';
const sigOf = (): string => {
  const { __last: _last, ...rest } = progress as Obj;
  return canon(rest);
};
let changeSeq = 0;
let firstDirty = 0;
let lastChange = 0;
let attempts = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastRemote: Obj | undefined;
let bc: BroadcastChannel | undefined;

const randomId = (): string => {
  const a = new Uint8Array(4);
  crypto.getRandomValues(a);
  return [...a].map(x => x.toString(16).padStart(2, '0')).join('');
};

/** 其他标签页写进 localStorage 的进度，合并进本页内存（并把合并结果写回，两边收敛）。返回内存是否有变化 */
function reconcile(): boolean {
  let ls: unknown;
  try {
    ls = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    return false;
  }
  if (!ls || typeof ls !== 'object') return false;
  const merged = merge(progress, ls);
  const memChanged = !sameProgress(merged, progress);
  if (memChanged) {
    try {
      applyLocal(merged, {});
    } catch {
      return false;
    }
  } else if (!sameProgress(merged, ls)) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(merged));
    } catch {}
  }
  return memChanged;
}

function markDirty(): void {
  if (!dirty && sigOf() === cleanSig) return;
  changeSeq++;
  lastChange = Date.now();
  if (!dirty) {
    dirty = true;
    firstDirty = lastChange;
    setStatus({ dirty: true, state: running ? 'syncing' : stopped ? readStatus().state : 'pending' });
  }
  if (isLeader && !stopped && !running) schedule(pushDelay(firstDirty, lastChange, Date.now(), tune().debounce, tune().maxWait));
}
function schedule(ms: number): void {
  clearTimeout(timer);
  timer = setTimeout(() => void cycle('timer'), ms);
}

function remoteChangedNotice(n: number): void {
  if (!n) return;
  // 章页、复习页、阶段测验页的内容是打开时画出来的：不替用户重绘（可能正在答题），只在状态里记一笔，顶栏标记和同步面板据此提示“刷新页面”
  setStatus({ remoteChanged: (readStatus().remoteChanged || 0) + n });
}

/* ---------- 一次同步 ---------- */
interface CycleResult {
  /** 从云端合并进本机、内容有变化的章 */
  fromCloud: string[];
  pushed: boolean;
}

async function fileText(f: Obj): Promise<string> {
  if (!f.truncated) return typeof f.content === 'string' ? f.content : '';
  // 超过单文件 1 MB 时，API 返回的 content 被截断，完整内容在 raw_url（只允许 GitHub 的 gist 域名，不带令牌）
  if (!isAllowedUrl(String(f.raw_url), 'raw')) throw new SyncError('toolarge', '云端文件太大，读不全。');
  try {
    const r = await fetch(f.raw_url, { referrerPolicy: 'no-referrer', credentials: 'omit', cache: 'no-store' });
    if (!r.ok) throw 0;
    return await r.text();
  } catch {
    throw new SyncError('toolarge', '云端文件太大，读不全。');
  }
}

async function push(c: SyncConfig, prog: Obj): Promise<void> {
  const content = JSON.stringify(makeEnvelope(prog, c.device, Date.now()));
  if (content.length > 900_000) throw new SyncError('toolarge', '进度数据超过了 Gist 单文件的大小上限。');
  const r = await request('PATCH', '/gists/' + c.gist, { token: c.token, body: { files: { [SYNC_FILE]: { content } } } });
  setStatus({ etag: r.etag });
  lastRemote = JSON.parse(JSON.stringify(prog));
}

async function core(c: SyncConfig, force: boolean): Promise<CycleResult> {
  const st = readStatus();
  const r = await request('GET', '/gists/' + c.gist, { token: c.token, etag: force ? undefined : st.etag });
  setStatus({ pulledAt: Date.now() });
  if (r.status === 304) {
    if (!dirty) return { fromCloud: [], pushed: false };
    await push(c, JSON.parse(JSON.stringify(progress)));
    return { fromCloud: [], pushed: true };
  }
  setStatus({ etag: r.etag });
  const file = r.json?.files?.[SYNC_FILE];
  let remote: Envelope | undefined;
  let newer = false;
  if (file) {
    const text = await fileText(file);
    const p = parseEnvelope(text);
    if (!p.ok) {
      await saveCorruptCopy(c, text);
      throw new SyncError('corrupt', '云端的同步文件读不懂。');
    }
    remote = p.env;
    newer = p.newer;
  }
  const local = progress;
  const merged = merge(local, remote ? remote.progress : {});
  const fromCloud = changedChapters(local, merged);
  const touched = !sameProgress(merged, local);
  if (touched) applyLocal(merged, { backup: '与云端合并前' });
  lastRemote = remote ? JSON.parse(JSON.stringify(remote.progress)) : undefined;
  if (touched) remoteChangedNotice(Math.max(fromCloud.length, 1));
  if (newer) throw new SyncError('newer', '另一台设备的站点版本更新。');
  let pushed = false;
  if (!remote || !sameProgress(merged, remote.progress)) {
    await push(c, JSON.parse(JSON.stringify(merged)));
    pushed = true;
  }
  return { fromCloud, pushed };
}

/** 云端文件读不懂：不覆盖，把原文另存成 Gist 里的一个备份文件（同一份只存一次） */
async function saveCorruptCopy(c: SyncConfig, text: string): Promise<void> {
  if (!text.trim()) return;
  const name = `hands-on-vue3-progress.backup-${text.length}.json`;
  try {
    await request('PATCH', '/gists/' + c.gist, { token: c.token, body: { files: { [name]: { content: text } } } });
  } catch {}
}

const MSG: Record<ErrKind, string> = {
  auth: 'GitHub 不认这个令牌，可能已过期或被撤销。请重新创建令牌，粘贴到同步面板里。本机进度没有改动。',
  scope: '这个令牌没有 gist 权限。请重新创建令牌，并且勾选 gist。本机进度没有改动。',
  rate: 'GitHub 限制了请求次数，到时间会自动再试。本机进度没有改动。',
  forbidden: '这个令牌没有写入 Gist 的权限。请重新创建令牌，并且勾选 gist。本机进度没有改动。',
  gone: '云端的 Gist 找不到了（可能被删除，也可能是令牌没有 Gist 权限）。可以重新创建一个；本机进度没有改动。',
  network: '连不上 GitHub，稍后会自动重试。本机进度没有改动。',
  server: 'GitHub 暂时出了问题，稍后会自动重试。本机进度没有改动。',
  corrupt: '云端的同步文件读不懂，没有覆盖它。已在 Gist 里另存了一份原文件的备份。本机进度没有改动。',
  newer: '另一台设备的站点版本更新，请刷新页面。刷新之前不会覆盖云端的数据。',
  storage: '浏览器的存储空间不足，没法保存合并后的进度。本机进度没有改动。可以清理一些站点数据后重试。',
  toolarge: '云端文件太大，读不全，没有覆盖它。本机进度没有改动。',
  client: '同步请求被 GitHub 拒绝了。本机进度没有改动。',
};

function fail(e: unknown): void {
  const err = e instanceof SyncError ? e : new SyncError('client', '同步时出了意外的错误。');
  const k = err.kind;
  if (k === 'network' || k === 'server') {
    attempts++;
    if (attempts >= MAX_ATTEMPTS) {
      stopped = true;
      setStatus({ state: 'pending', code: k, msg: '多次连不上，已暂停自动重试。回到本页或点“立即同步”再试。本机进度没有改动。', retryAt: undefined });
    } else {
      const ms = backoffDelay(attempts - 1, Math.random(), tune().backoff);
      setStatus({ state: 'pending', code: k, msg: MSG[k], retryAt: Date.now() + ms });
      if (isLeader) schedule(ms);
    }
    return;
  }
  if (k === 'rate') {
    const at = err.retryAt || Date.now() + 60e3;
    setStatus({ state: 'pending', code: k, msg: MSG.rate, retryAt: at });
    if (isLeader) schedule(Math.max(1000, at - Date.now()));
    return;
  }
  stopped = true; // 需要人处理：不再自动重试
  setStatus({ state: 'error', code: k, msg: MSG[k], retryAt: undefined });
}

async function cycle(reason: string, manual = false): Promise<{ ok: true; res: CycleResult } | { ok: false; kind: ErrKind } | undefined> {
  if (!cfg) return undefined;
  if (running) {
    rerun = true;
    return undefined;
  }
  if (stopped && !manual) return undefined;
  if (typeof navigator !== 'undefined' && navigator.onLine === false && !manual) {
    setStatus({ state: 'pending', code: 'offline', msg: '现在离线，联网后会自动同步。本机进度没有改动。' });
    return undefined;
  }
  void reason;
  running = true;
  clearTimeout(timer);
  const seq = changeSeq;
  if (manual) stopped = false;
  setStatus({ state: 'syncing' });
  try {
    reconcile();
    const res = await core(cfg, manual && reason === 'force');
    attempts = 0;
    stopped = false;
    const more = changeSeq !== seq;
    if (!more) {
      dirty = false;
      cleanSig = sigOf();
    }
    setStatus({ state: more ? 'pending' : 'synced', at: Date.now(), dirty: more || undefined, msg: undefined, code: undefined, retryAt: undefined });
    if (more && isLeader) schedule(pushDelay(firstDirty, lastChange, Date.now(), tune().debounce, tune().maxWait));
    return { ok: true, res };
  } catch (e) {
    fail(e);
    return { ok: false, kind: e instanceof SyncError ? e.kind : 'client' };
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      if (isLeader && !stopped) schedule(0);
    }
  }
}

/** 页面隐藏或关闭时，尽力把未推送的改动推出去（keepalive，请求体不能超过 64 KB，超过就放弃，下次打开页面时再同步） */
function flushKeepalive(): void {
  if (!cfg || !isLeader || !dirty || stopped || running) return;
  const merged = lastRemote ? merge(progress, lastRemote) : progress;
  const content = JSON.stringify(makeEnvelope(merged, cfg.device, Date.now()));
  if (content.length > 60_000) return;
  request('PATCH', '/gists/' + cfg.gist, { token: cfg.token, body: { files: { [SYNC_FILE]: { content } } }, keepalive: true }).catch(() => {});
}

/* ---------- 启动 ---------- */
export function start(): void {
  if (typeof window === 'undefined') return;
  cfg = readConfig();
  if (!cfg || started) return;
  started = true;
  dirty = !!readStatus().dirty;
  cleanSig = dirty ? '' : sigOf();
  firstDirty = lastChange = Date.now();
  setStatus({ remoteChanged: undefined });
  window.addEventListener(SAVED_EVENT, markDirty);
  window.addEventListener('storage', e => {
    if (e.key === SYNC_KEY && !e.newValue) {
      cfg = null;
      clearTimeout(timer);
      return;
    }
    if (e.key === SYNC_KEY) cfg = readConfig();
    if (e.key === STORE_KEY || e.key === null) {
      if (reconcile() && isLeader) markDirty();
    }
  });
  window.addEventListener('online', () => {
    if (isLeader && cfg && (dirty || readStatus().state === 'pending')) {
      attempts = 0;
      void cycle('online');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') return flushKeepalive();
    if (!isLeader || !cfg) return;
    const st = readStatus();
    if (stopped && st.state !== 'pending') return;
    if (shouldPullOnForeground(st.pulledAt || 0, Date.now(), tune().pullAfter)) {
      stopped = false;
      attempts = 0;
      void cycle('foreground');
    }
  });
  window.addEventListener('pagehide', flushKeepalive);
  try {
    bc = new BroadcastChannel('hov-sync');
    bc.onmessage = e => {
      if (e.data === 'sync-now' && isLeader) void cycle('manual', true);
    };
  } catch {}
  const lead = () => {
    isLeader = true;
    setTimeout(() => void cycle('load'), tune().initialDelay ?? 300);
  };
  if (navigator.locks?.request) {
    navigator.locks.request('hov-sync-leader', () => {
      lead();
      return new Promise<void>(() => {});
    });
  } else lead();
}

/* ---------- 给界面用的操作 ---------- */
export interface EnableResult {
  created: boolean;
  fromCloud: number;
  uploaded: boolean;
  login: string;
}

async function findGist(token: string): Promise<string | null> {
  let page = 1;
  for (let i = 0; i < 20; i++) {
    const r = await request('GET', `/gists?per_page=100&page=${page}`, { token });
    const list = Array.isArray(r.json) ? r.json : [];
    const hit = list.find((g: Obj) => g && g.files && Object.hasOwn(g.files, SYNC_FILE));
    if (hit) return String(hit.id);
    const n = nextPage(r.link);
    if (!n) break;
    page = n;
  }
  return null;
}

async function createGist(token: string, device: string): Promise<string> {
  const body = {
    description: SYNC_DESC,
    public: false,
    files: { [SYNC_FILE]: { content: JSON.stringify(makeEnvelope(JSON.parse(JSON.stringify(progress)), device, Date.now())) } },
  };
  const r = await request('POST', '/gists', { token, body });
  return String(r.json?.id);
}

/** 开启同步：先校验令牌，找到（或创建）Gist，保存配置，再做第一次同步。失败会抛 SyncError（message 是给人看的中文）；失败时不保存任何配置 */
export async function enable(tokenInput: string, gistInput?: string): Promise<EnableResult> {
  const token = tokenInput.trim();
  if (!looksLikeToken(token)) throw new SyncError('client', '这看起来不是 GitHub 令牌。请把创建好的令牌整段粘贴进来，不要带空格和换行。');
  let me: Res;
  try {
    me = await request('GET', '/user', { token });
  } catch (e) {
    if (e instanceof SyncError && e.kind === 'auth') throw new SyncError('auth', MSG.auth);
    throw e instanceof SyncError ? new SyncError(e.kind, MSG[e.kind]) : e;
  }
  // 经典令牌会在 x-oauth-scopes 里列出权限；细粒度令牌没有这个头，权限留到读写 Gist 时才知道
  if (me.scopes !== undefined && !me.scopes.split(',').some(s => s.trim() === 'gist')) throw new SyncError('scope', MSG.scope);
  const login = String(me.json?.login || '');
  let gist: string | null = null;
  let created = false;
  try {
    if (gistInput?.trim()) {
      gist = parseGistId(gistInput);
      if (!gist) throw new SyncError('client', '这不像 Gist 的链接或编号。');
      await request('GET', '/gists/' + gist, { token });
    } else gist = await findGist(token);
    const device = readConfig()?.device || randomId();
    if (!gist) {
      gist = await createGist(token, device);
      created = true;
    }
    const next: SyncConfig = { token, gist, login, device };
    localStorage.setItem(SYNC_KEY, JSON.stringify(next));
  } catch (e) {
    if (e instanceof SyncError) throw new SyncError(e.kind, e.kind === 'client' ? e.message : (MSG[e.kind] ?? e.message));
    throw new SyncError('storage', MSG.storage);
  }
  stopped = false;
  attempts = 0;
  dirty = false;
  setStatus({
    state: 'syncing',
    etag: undefined,
    pulledAt: undefined,
    msg: undefined,
    code: undefined,
    remoteChanged: undefined,
    dirty: undefined,
    retryAt: undefined,
  });
  cfg = readConfig();
  start();
  const r = await cycle('enable', true);
  if (!r || !r.ok) throw new SyncError(r && 'kind' in r ? r.kind : 'client', readStatus().msg || MSG.client);
  return { created, fromCloud: r.res.fromCloud.length, uploaded: created || r.res.pushed, login };
}

/** 立即同步。负责联网的是另一个标签页时，通知它去做 */
export async function syncNow(): Promise<void> {
  if (!cfg) cfg = readConfig();
  if (!cfg) return;
  if (!started) start();
  if (isLeader) await cycle('force', true);
  else {
    try {
      bc?.postMessage('sync-now');
    } catch {}
  }
}

/** 断开同步：删除本机的令牌和 Gist 编号。deleteRemote 为真时再尝试删除云端的 Gist（失败不影响断开） */
export async function disconnect(deleteRemote = false): Promise<{ remoteDeleted: boolean }> {
  const c = readConfig();
  let remoteDeleted = false;
  if (deleteRemote && c) {
    try {
      await request('DELETE', '/gists/' + c.gist, { token: c.token });
      remoteDeleted = true;
    } catch {}
  }
  try {
    localStorage.removeItem(SYNC_KEY);
    localStorage.removeItem(STATUS_KEY);
  } catch {}
  cfg = null;
  lastRemote = undefined;
  dirty = false;
  clearTimeout(timer);
  window.dispatchEvent(new Event(STATUS_EVENT));
  return { remoteDeleted };
}

/** 云端文件读不懂时，用本机进度重建它（原文件的备份已经另存在 Gist 里） */
export async function rebuildRemote(): Promise<void> {
  if (!cfg) return;
  try {
    await push(cfg, JSON.parse(JSON.stringify(progress)));
    stopped = false;
    attempts = 0;
    dirty = false;
    setStatus({ state: 'synced', at: Date.now(), msg: undefined, code: undefined, dirty: undefined });
  } catch (e) {
    fail(e);
  }
}

/** Gist 被删之后，重新创建一个并继续同步 */
export async function recreateGist(): Promise<void> {
  const c = readConfig();
  if (!c) return;
  try {
    const gist = await createGist(c.token, c.device);
    localStorage.setItem(SYNC_KEY, JSON.stringify({ ...c, gist }));
    cfg = readConfig();
    stopped = false;
    attempts = 0;
    setStatus({ etag: undefined, msg: undefined, code: undefined });
    await cycle('force', true);
  } catch (e) {
    fail(e);
  }
}

/** 恢复一份同步前的备份（先备份当前内容）。下次同步仍会把云端和别的设备上的进度合并回来；要彻底回到那时，先断开同步 */
export function restoreBackup(i: number): void {
  const b = listBackups()[i];
  if (!b) throw new SyncError('client', '找不到这份备份。');
  let data: Obj;
  try {
    data = JSON.parse(b.data);
  } catch {
    throw new SyncError('client', '这份备份读不出来。');
  }
  applyLocal(data, { backup: '恢复备份前' });
  setStatus({ etag: undefined });
  if (readConfig()) markDirty();
}

export const exportEnvelope = (): Envelope => makeEnvelope(JSON.parse(JSON.stringify(progress)), readConfig()?.device || 'export', Date.now());

export function exportFileName(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `hands-on-vue3-progress-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/** 导入文件：mode='merge' 与本机合并；'replace' 用文件替换本机进度。两种都先备份。schema 比本站新的不让导入 */
export function importEnvelope(text: string, mode: 'merge' | 'replace'): { changed: number } {
  const p = parseEnvelope(text);
  if (!p.ok) throw new SyncError('client', (p as { reason: string }).reason === 'json' ? '这个文件不是有效的 JSON。' : '这不是“动手学 Vue 3”导出的进度文件。');
  if (p.newer) throw new SyncError('newer', `这个文件来自更新版本的站点（进度结构 v${p.env.schema}，本页只认到 v${PROGRESS_SCHEMA}）。请先刷新页面。`);
  const before = JSON.parse(JSON.stringify(progress));
  const next = mode === 'merge' ? merge(progress, p.env.progress) : JSON.parse(JSON.stringify(p.env.progress));
  applyLocal(next, { backup: mode === 'merge' ? '导入文件前' : '用文件替换前' });
  setStatus({ etag: undefined });
  if (readConfig()) markDirty();
  return { changed: Math.max(changedChapters(before, next).length, sameProgress(before, next) ? 0 : 1) };
}
