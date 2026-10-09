// 内存里的假 GitHub Gist 服务，给 sync.mjs 用。用 Playwright 的 route 拦截发往 api.github.com 的请求：不发任何真实请求，也不用真实令牌。
// 实现了同步用到的接口：GET /user、GET/POST /gists、GET/PATCH/DELETE /gists/:id（含 ETag / If-None-Match → 304），
// 以及可以注入的故障：mode = 'ok' | 'offline'（连接失败）| '401'（令牌失效）| 'rate'（403 + x-ratelimit-reset，到点自动恢复）。

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-expose-headers': 'ETag, Link, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-OAuth-Scopes',
};

export function fakeGitHub({ login = 'tester', scopes = 'gist' } = {}) {
  const st = {
    mode: 'ok',
    rateReset: 0,
    gists: new Map(),
    seq: 1,
    valid: new Set(),
    log: [],
    n304: 0,
    scopes,
    login,
  };
  const etagOf = g => `"v${g.ver}"`;
  const view = g => ({
    id: g.id,
    description: g.description,
    public: false,
    updated_at: new Date(g.ver * 1000).toISOString(),
    files: Object.fromEntries(
      Object.entries(g.files).map(([n, c]) => [
        n,
        { filename: n, size: c.length, truncated: false, content: c, raw_url: `https://gist.githubusercontent.com/${login}/${g.id}/raw/${n}` },
      ]),
    ),
  });
  async function handle(route) {
    const req = route.request();
    const url = new URL(req.url());
    const h = req.headers();
    const respond = (status, body, extra = {}) =>
      route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json', ...extra }, body: body === undefined ? '' : JSON.stringify(body) });
    if (req.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...CORS,
          'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE',
          'access-control-allow-headers': 'authorization, content-type, if-none-match, x-github-api-version, accept',
        },
      });
    }
    const token = (h.authorization || '').replace(/^Bearer /, '');
    st.log.push({
      method: req.method(),
      url: req.url(),
      host: url.host,
      path: url.pathname,
      auth: h.authorization,
      referer: h.referer,
      ifNoneMatch: h['if-none-match'],
      keepalive: undefined,
    });
    if (st.mode === 'offline') return route.abort('internetdisconnected');
    if (url.host !== 'api.github.com') return respond(404, { message: 'x' });
    if (st.mode === '401' || !st.valid.has(token)) return respond(401, { message: 'Bad credentials' });
    if (st.mode === 'rate' && Date.now() < st.rateReset) {
      return respond(
        403,
        { message: 'API rate limit exceeded' },
        { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.ceil(st.rateReset / 1000)) },
      );
    }
    const p = url.pathname;
    if (p === '/user') return respond(200, { login }, st.scopes === null ? {} : { 'x-oauth-scopes': st.scopes });
    if (p === '/gists' && req.method() === 'GET') return respond(200, [...st.gists.values()].reverse().map(view));
    if (p === '/gists' && req.method() === 'POST') {
      const b = JSON.parse(req.postData());
      const g = { id: ('a1b2c3d4e5f60718293a' + st.seq++).slice(-20).padStart(20, '0'), description: b.description, ver: 1, files: {} };
      for (const [n, f] of Object.entries(b.files)) g.files[n] = f.content;
      st.gists.set(g.id, g);
      return respond(201, view(g), { etag: etagOf(g) });
    }
    const m = /^\/gists\/([0-9a-f]+)$/.exec(p);
    if (m) {
      const g = st.gists.get(m[1]);
      if (!g) return respond(404, { message: 'Not Found' });
      if (req.method() === 'GET') {
        if (h['if-none-match'] === etagOf(g)) {
          st.n304++;
          return route.fulfill({ status: 304, headers: { ...CORS, etag: etagOf(g) } });
        }
        return respond(200, view(g), { etag: etagOf(g) });
      }
      if (req.method() === 'PATCH') {
        const b = JSON.parse(req.postData());
        for (const [n, f] of Object.entries(b.files || {})) {
          if (f === null) delete g.files[n];
          else g.files[n] = f.content;
        }
        g.ver++;
        return respond(200, view(g), { etag: etagOf(g) });
      }
      if (req.method() === 'DELETE') {
        st.gists.delete(g.id);
        return route.fulfill({ status: 204, headers: CORS });
      }
    }
    return respond(404, { message: 'Not Found' });
  }
  return {
    st,
    install: ctx => ctx.route(/^https:\/\/(api\.github\.com|gist\.githubusercontent\.com)\//, handle),
    /** 云端同步文件解析后的进度（没有返回 null） */
    remote(file = 'hands-on-vue3-progress.json') {
      const g = [...st.gists.values()][0];
      if (!g || !g.files[file]) return null;
      try {
        return JSON.parse(g.files[file]);
      } catch {
        return undefined;
      }
    },
    gist: () => [...st.gists.values()][0],
    writes: () => st.log.filter(r => r.method === 'PATCH' || r.method === 'POST'),
  };
}
