import { describe, expect, it } from 'vitest';
import { PROGRESS_SCHEMA, SYNC_FILE, makeEnvelope, parseEnvelope, summarize } from '../../course/engine/logic/syncFormat.ts';
import {
  BACKOFF_CAP,
  MAX_ATTEMPTS,
  PUSH_MAX_WAIT,
  PUSH_QUIET,
  ago,
  backoffDelay,
  classify,
  LEASE_TTL,
  isAllowedUrl,
  leaseFree,
  lastFour,
  looksLikeToken,
  nextPage,
  parseGistId,
  pushDelay,
  rateLimitWait,
  shouldPullOnForeground,
} from '../../course/engine/logic/syncPlan.ts';

describe('同步文件格式', () => {
  it('生成再读回，内容不变', () => {
    const p = { a: { sc: { 0: 1 }, ex: { e1: { passed: true } }, done: true }, __srs: { 'a#0': { box: 1, n: 1, due: 2, last: 1 } } };
    const r = parseEnvelope(JSON.stringify(makeEnvelope(p as any, 'dev1', 123)));
    expect(r.ok && r.env.progress).toEqual(p);
    expect(r.ok && r.env.device).toBe('dev1');
    expect(r.ok && r.newer).toBe(false);
    expect(SYNC_FILE).toMatch(/\.json$/);
  });
  it('比自己新的 schema 标记为 newer，仍可读', () => {
    const r = parseEnvelope(JSON.stringify({ schema: PROGRESS_SCHEMA + 1, progress: { x: 1 } }));
    expect(r.ok && r.newer).toBe(true);
  });
  it('不合法的内容返回失败原因而不是抛异常', () => {
    expect(parseEnvelope('{oops')).toEqual({ ok: false, reason: 'json' });
    expect(parseEnvelope('')).toEqual({ ok: false, reason: 'json' });
    expect(parseEnvelope('[]')).toEqual({ ok: false, reason: 'shape' });
    expect(parseEnvelope('{"progress":{}}')).toEqual({ ok: false, reason: 'shape' });
    expect(parseEnvelope('{"schema":"1","progress":{}}')).toEqual({ ok: false, reason: 'shape' });
    expect(parseEnvelope('{"schema":1,"progress":[]}')).toEqual({ ok: false, reason: 'shape' });
    expect(parseEnvelope('{"schema":1,"app":"other","progress":{}}')).toEqual({ ok: false, reason: 'app' });
  });
  it('概况', () => {
    expect(summarize({ a: { done: true }, b: { done: false }, __srs: { k: {} } } as any)).toEqual({ chapters: 2, done: 1, cards: 1 });
  });
});

describe('推送防抖', () => {
  it('最后一次改动后等 6 秒', () => {
    expect(pushDelay(0, 1000, 1000)).toBe(PUSH_QUIET);
    expect(pushDelay(0, 3000, 5000)).toBe(PUSH_QUIET - 2000);
  });
  it('连续改动最多等 10 秒（从第一次改动算起）', () => {
    expect(pushDelay(0, 9000, 9000)).toBe(PUSH_MAX_WAIT - 9000);
    expect(pushDelay(0, 30000, 30000)).toBe(0);
  });
  it('不会是负数', () => {
    expect(pushDelay(0, 0, 99999)).toBe(0);
  });
});

describe('退避', () => {
  it('指数增长、有上限、抖动在 ±20% 内', () => {
    expect(backoffDelay(0, 0.5)).toBe(5000);
    expect(backoffDelay(1, 0.5)).toBe(10000);
    expect(backoffDelay(2, 0.5)).toBe(20000);
    expect(backoffDelay(20, 0.5)).toBe(BACKOFF_CAP);
    expect(backoffDelay(3, 0)).toBe(32000);
    expect(backoffDelay(3, 1)).toBe(48000);
    for (let i = 0; i < 30; i++) expect(backoffDelay(i, 1)).toBeLessThanOrEqual(BACKOFF_CAP * 1.2);
  });
  it('有最大尝试次数', () => {
    expect(MAX_ATTEMPTS).toBeGreaterThan(3);
    expect(MAX_ATTEMPTS).toBeLessThan(20);
  });
  it('可以缩小基数（测试用）', () => {
    expect(backoffDelay(2, 0.5, 100)).toBe(400);
  });
});

describe('限速等待', () => {
  const now = 1_000_000;
  it('用 x-ratelimit-reset（秒级时间戳）', () => {
    expect(rateLimitWait((now + 30_000) / 1000, undefined, now)).toBe(31_000);
  });
  it('retry-after 优先', () => {
    expect(rateLimitWait((now + 30_000) / 1000, 5, now)).toBe(6000);
  });
  it('已经过了重置时间也至少等 1 秒；最多等 1 小时；没有头信息等 1 分钟', () => {
    expect(rateLimitWait((now - 99_000) / 1000, undefined, now)).toBe(1000);
    expect(rateLimitWait((now + 9e9) / 1000, undefined, now)).toBe(3600e3);
    expect(rateLimitWait(undefined, undefined, now)).toBe(61_000);
  });
});

describe('前台再拉取', () => {
  it('超过间隔才拉', () => {
    expect(shouldPullOnForeground(1000, 1000 + 4 * 60e3)).toBe(false);
    expect(shouldPullOnForeground(1000, 1000 + 5 * 60e3)).toBe(true);
    expect(shouldPullOnForeground(0, 5)).toBe(true);
  });
});

describe('地址白名单', () => {
  it('令牌请求只允许 https://api.github.com', () => {
    expect(isAllowedUrl('https://api.github.com/gists?per_page=100', 'api')).toBe(true);
    for (const u of [
      'http://api.github.com/gists',
      'https://api.github.com.evil.com/gists',
      'https://evil.com/api.github.com',
      'https://user:pw@api.github.com/gists',
      'https://api.github.com:8443/gists',
      'https://gist.githubusercontent.com/x/raw',
      'https://github.com/settings/tokens',
      '//api.github.com/gists',
      'not a url',
      '',
    ])
      expect(isAllowedUrl(u, 'api'), u).toBe(false);
  });
  it('raw_url 只允许 GitHub 的 gist 域名', () => {
    expect(isAllowedUrl('https://gist.githubusercontent.com/u/abc/raw/f.json', 'raw')).toBe(true);
    expect(isAllowedUrl('https://api.github.com/gists', 'raw')).toBe(false);
    expect(isAllowedUrl('https://githubusercontent.com/x', 'raw')).toBe(false);
    expect(isAllowedUrl('https://gist.githubusercontent.com.evil.io/x', 'raw')).toBe(false);
    expect(isAllowedUrl('http://gist.githubusercontent.com/x', 'raw')).toBe(false);
  });
});

describe('响应分类', () => {
  it('各状态码', () => {
    expect(classify(200, {})).toBe('ok');
    expect(classify(201, {})).toBe('ok');
    expect(classify(304, {})).toBe('notModified');
    expect(classify(401, {})).toBe('auth');
    expect(classify(404, {})).toBe('gone');
    expect(classify(429, {})).toBe('rate');
    expect(classify(500, {})).toBe('retry');
    expect(classify(503, {})).toBe('retry');
    expect(classify(422, {})).toBe('client');
  });
  it('403：剩余为 0 或带 retry-after 是限速，否则是权限不够', () => {
    expect(classify(403, { remaining: '0' })).toBe('rate');
    expect(classify(403, { retryAfter: '60' })).toBe('rate');
    expect(classify(403, { remaining: '4999' })).toBe('forbidden');
    expect(classify(403, {})).toBe('forbidden');
  });
});

describe('其他小函数', () => {
  it('Link 头的下一页', () => {
    const link = '<https://api.github.com/gists?per_page=100&page=2>; rel="next", <https://api.github.com/gists?per_page=100&page=5>; rel="last"';
    expect(nextPage(link)).toBe(2);
    expect(nextPage('<https://api.github.com/gists?page=5>; rel="last"')).toBe(null);
    expect(nextPage(null)).toBe(null);
    expect(nextPage('<::>; rel="next"')).toBe(null);
  });
  it('相对时间', () => {
    expect(ago(undefined, 1)).toBe('还没有同步过');
    expect(ago(1000, 1000 + 10e3)).toBe('刚刚');
    expect(ago(1000, 1000 + 3 * 60e3)).toBe('3 分钟前');
    expect(ago(1000, 1000 + 2 * 3600e3)).toBe('2 小时前');
    expect(ago(1000, 1000 + 3 * 86400e3)).toBe('3 天前');
  });
  it('只显示令牌末四位', () => {
    expect(lastFour('ghp_abcdefghijklmnop1234')).toBe('…1234');
    expect(lastFour('abc')).toBe('…');
    expect(lastFour('ghp_abcdefghijklmnop1234')).not.toContain('ghp_');
  });
  it('令牌格式', () => {
    expect(looksLikeToken('ghp_' + 'a'.repeat(36))).toBe(true);
    expect(looksLikeToken('github_pat_' + 'A1_'.repeat(20))).toBe(true);
    expect(looksLikeToken('short')).toBe(false);
    expect(looksLikeToken('has space ' + 'a'.repeat(30))).toBe(false);
    expect(looksLikeToken('ghp_' + 'a'.repeat(36) + '\n')).toBe(false);
  });
  it('Gist 链接或 id', () => {
    const id = 'aa5a315d61ae9438b18d';
    expect(parseGistId(id)).toBe(id);
    expect(parseGistId(`https://gist.github.com/someone/${id}`)).toBe(id);
    expect(parseGistId(`https://gist.github.com/${id}/`)).toBe(id);
    expect(parseGistId('hello')).toBe(null);
  });
});

describe('联网负责人的租约', () => {
  const now = 100_000
  it('没有租约、租约是自己的：可以当负责人', () => {
    expect(leaseFree(null, 'a', now, true)).toBe(true)
    expect(leaseFree({ id: 'a', at: now, vis: true }, 'a', now, false)).toBe(true)
  })
  it('别人的租约还新鲜：不能抢（都可见，或自己不可见）', () => {
    expect(leaseFree({ id: 'b', at: now - 5000, vis: true }, 'a', now, true)).toBe(false)
    expect(leaseFree({ id: 'b', at: now - 1000, vis: true }, 'a', now, false)).toBe(false)
    expect(leaseFree({ id: 'b', at: now - 1000, vis: false }, 'a', now, false)).toBe(false)
  })
  it('15 秒没续约就算失效', () => {
    expect(leaseFree({ id: 'b', at: now - LEASE_TTL, vis: true }, 'a', now, false)).toBe(false)
    expect(leaseFree({ id: 'b', at: now - LEASE_TTL - 1, vis: true }, 'a', now, false)).toBe(true)
    expect(leaseFree({ id: 'b', at: now - 1000, vis: true }, 'a', now, false, 500)).toBe(true)
  })
  it('可见页面可以接管不可见页面，反过来不行', () => {
    expect(leaseFree({ id: 'b', at: now, vis: false }, 'a', now, true)).toBe(true)
    expect(leaseFree({ id: 'b', at: now, vis: true }, 'a', now, false)).toBe(false)
  })
  it('租约内容坏了按没有租约处理', () => {
    expect(leaseFree({ id: 5 } as any, 'a', now, false)).toBe(true)
  })
})
