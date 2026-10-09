export { ago, lastFour } from './syncView.ts';
/* 同步的时机与错误处理的纯逻辑：退避、防抖、限速等待、地址白名单、响应分类、令牌显示。不读时间（now 由调用方传入）。 */

/** 推送前的防抖：最后一次改动后等 6 秒，但从第一次改动算起最多等 10 秒 */
export const PUSH_QUIET = 6000;
export const PUSH_MAX_WAIT = 10000;
export const pushDelay = (firstDirtyAt: number, lastChangeAt: number, now: number, quiet = PUSH_QUIET, maxWait = PUSH_MAX_WAIT): number =>
  Math.max(0, Math.min(lastChangeAt + quiet, firstDirtyAt + maxWait) - now);

/** 失败后重试的等待：5 秒起步、每次翻倍、最多 5 分钟；rnd 在 0..1，给 ±20% 的抖动。连续失败到 MAX_ATTEMPTS 次就不再自动重试 */
export const BACKOFF_BASE = 5000;
export const BACKOFF_CAP = 5 * 60e3;
export const MAX_ATTEMPTS = 8;
export const backoffDelay = (attempt: number, rnd = 0.5, base = BACKOFF_BASE): number => {
  const raw = Math.min(BACKOFF_CAP, base * 2 ** Math.max(0, attempt));
  return Math.round(raw * (0.8 + 0.4 * rnd));
};

/** 回到前台时要不要再拉一次：距上次拉取超过 gap（默认 5 分钟） */
export const FOREGROUND_GAP = 5 * 60e3;
export const shouldPullOnForeground = (lastPullAt: number, now: number, gap = FOREGROUND_GAP): boolean => !lastPullAt || now - lastPullAt >= gap;

/** 被限速后要等多久（毫秒）。优先用 retry-after（秒），其次 x-ratelimit-reset（秒级时间戳）；至少 1 秒，最多 1 小时，多等 1 秒避免卡点 */
export function rateLimitWait(resetSec: number | undefined, retryAfterSec: number | undefined, now: number): number {
  let ms = 60e3;
  if (retryAfterSec !== undefined && Number.isFinite(retryAfterSec)) ms = retryAfterSec * 1000;
  else if (resetSec !== undefined && Number.isFinite(resetSec)) ms = resetSec * 1000 - now;
  return Math.min(3600e3, Math.max(1000, ms + 1000));
}

/** 请求地址白名单：令牌只发往 api.github.com（kind='api'）；读 Gist 原文的 raw_url 只允许 GitHub 的 gist 域名（kind='raw'，不带令牌） */
const API_HOSTS = ['api.github.com'];
const RAW_HOSTS = ['gist.githubusercontent.com', 'gist.github.com'];
export function isAllowedUrl(url: string, kind: 'api' | 'raw'): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  return (kind === 'api' ? API_HOSTS : RAW_HOSTS).includes(u.hostname);
}

export type Verdict = 'ok' | 'notModified' | 'auth' | 'rate' | 'forbidden' | 'gone' | 'retry' | 'client';
/** 把响应状态分成要做的事。403/429 里 remaining 为 0 或带 retry-after 的是限速，其余 403 是权限不够 */
export function classify(status: number, h: { remaining?: string | null; retryAfter?: string | null }): Verdict {
  if (status === 304) return 'notModified';
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401) return 'auth';
  if (status === 429) return 'rate';
  if (status === 403) return h.remaining === '0' || h.retryAfter ? 'rate' : 'forbidden';
  if (status === 404) return 'gone';
  if (status === 408 || status >= 500) return 'retry';
  return 'client';
}

/** Link 响应头里的下一页页码（没有下一页返回 null）。只取 page 参数，不跟随头里的任意地址 */
export function nextPage(link: string | null | undefined): number | null {
  const m = /<([^>]+)>;\s*rel="next"/.exec(link || '');
  if (!m) return null;
  try {
    const n = Number(new URL(m[1]).searchParams.get('page'));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** 令牌的基本格式（只查字符和长度，不代表有效）：ghp_ / github_pat_ 开头或旧式 40 位十六进制 */
export const looksLikeToken = (t: string): boolean => /^[A-Za-z0-9_]{20,255}$/.test(t);

/** 从用户粘贴的 Gist 链接或 id 里取出 id；不像 id 返回 null */
export function parseGistId(input: string): string | null {
  const s = input.trim();
  const m = /(?:^|\/)([0-9a-f]{20,40})(?:[/?#.]|$)/i.exec(s);
  return m ? m[1].toLowerCase() : null;
}

/** 联网负责人的租约（存在 localStorage 里：{ id 标签页, at 最近续约时间, vis 当时是否可见 }）。
 *  这个标签页能不能当负责人：没有租约、租约是自己的、租约超过 ttl 没续约，或自己可见而持有者不可见（可见页面可以接管不可见页面） */
export const LEASE_TTL = 15_000;
export const leaseFree = (l: { id: string; at: number; vis: boolean } | null | undefined, me: string, now: number, visible: boolean, ttl = LEASE_TTL): boolean =>
  !l || typeof l.id !== 'string' || l.id === me || now - Number(l.at) > ttl || (visible && !l.vis);
