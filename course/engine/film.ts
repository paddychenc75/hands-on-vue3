/* 首页短片的浏览器端（自己的异步 chunk，不进站点主包）。
 *
 * 首页是一段约 54 秒的短片：画面是“影片时间”的函数（编排在 logic/filmTracks.ts，每个元素一条关键帧轨道，用 Web Animations API 暂停后按时间擦洗，
 * 只动 transform、opacity 和 SVG 描边）。影片时间由页面滚动位置换算：f = 滚动位置 / 最大滚动位置 × 总时长。
 * 所以手动滚动、拖进度条、自动播放用的是同一套画面逻辑——自动播放不过是“自己匀速滚动页面”，用户一动手（滚轮、触摸、键盘、拖滚动条）就让出控制权。
 * 另外这里做：播放控制条、幕进度指示、屏幕外的东西不工作（只更新这一刻有变化的轨道）、标签页在后台时暂停。
 * 不改滚动速度，不拦截滚轮/触摸/键盘（全部是被动监听，从不 preventDefault；键盘快捷键只在播放器获得焦点时生效）。 */
import { DURATIONS, LAST, MARKS, SCENE_NAMES, TOTAL } from './logic/filmData.ts';
import { type KF, type Measure, type Pt, type Tracks, buildTracks, flyerTracks } from './logic/filmTracks.ts';
import type { Engine } from './audio.ts';

const DYN = 'film-dyn';
const PLAYED = 'hands-on-vue3-film-played';
/** 这次页面加载里放过没有（模块级，只在内存里）：站内跳走再回首页不重放，刷新或重新打开会再自动放 */
let playedThisLoad = false;
const SOUND_PREF = 'hands-on-vue3-film-sound'; // localStorage：用户开过声音（不是学习进度的键）
const SOUND_TIP = 'hands-on-vue3-film-tip'; // localStorage：“开启配乐”的提示点过了
/** 本地有没有学习进度（和 config.mts 里首屏前脚本用同一个键，结构见 course/engine/store.ts） */
const hasProgress = (): boolean => {
  try {
    const d = JSON.parse(localStorage.getItem('hands-on-vue3-v1') || 'null');
    return !!d && typeof d === 'object' && Object.keys(d).length > 0;
  } catch {
    return false;
  }
};
const SCENE_LABELS: readonly string[] = SCENE_NAMES;
/** 测试用的倍速（页面里设 window.__filmSpeed）；正常使用恒为 1 */
const speed = (): number => (typeof window !== 'undefined' && (window as unknown as { __filmSpeed?: number }).__filmSpeed) || 1;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** 影片时间 → 第几幕 */
export const sceneOf = (f: number): number => {
  let i = 0;
  while (i < MARKS.length - 1 && f >= MARKS[i + 1]) i++;
  return i;
};
/** 滚动位置 → 影片时间（秒） */
export const timeOfScroll = (y: number, maxY: number): number => (maxY <= 0 ? 0 : clamp(y / maxY, 0, 1) * TOTAL);
export const scrollOfTime = (f: number, maxY: number): number => (clamp(f, 0, TOTAL) / TOTAL) * maxY;

/** 每一幕“停稳”的影片时间：这一幕的文字和动作都放完、画面完整，而下一幕的文字还没开始退场的那个点；收束幕是片尾。
 *  滚一下 = 前进或后退一幕 = 动画着走到相邻一幕的停稳点。 */
export const stopOf = (i: number): number => (i >= LAST ? TOTAL : i <= 0 ? MARKS[1] - 0.85 : MARKS[i + 1] - 0.55);
/** 从影片时间 f 往后走一幕：第一个停稳点在 f 之后的幕（f 恰好停在某幕上就是下一幕）；已经在片尾返回 -1 */
export const nextScene = (f: number): number => {
  // 第 0 幕（开场）从来不是“往后走”的目标：片子刚开始时开场的字已经全在了，第一次手势直接去第 1 幕；只有圆点、Home、往回走才会停到开场的停稳点
  for (let i = 1; i <= LAST; i++) if (stopOf(i) > f + 0.05) return i;
  return -1;
};
/** 往前走一幕：最后一个停稳点在 f 之前的幕；已经在开场之前返回 -1 */
export const prevScene = (f: number): number => {
  for (let i = LAST; i >= 0; i--) if (stopOf(i) < f - 0.05) return i;
  return -1;
};

interface Track {
  anims: Animation[];
  /** 值在变化的时间段（秒） */
  spans: [number, number][];
  key: string;
}

/** 一条轨道里“值真的在变”的时间段：相邻两个关键帧的属性不同才算 */
export function changeSpans(kfs: KF[]): [number, number][] {
  const spans: [number, number][] = [];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    let diff = false;
    for (const p of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (p === 't' || p === 'easing') continue;
      if (a[p] !== b[p]) diff = true;
    }
    if (!diff) continue;
    const last = spans[spans.length - 1];
    if (last && Math.abs(last[1] - a.t) < 1e-6) last[1] = b.t;
    else spans.push([a.t, b.t]);
  }
  return spans;
}

export function attach(root: HTMLElement): () => void {
  const html = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowMQ = matchMedia('(max-width: 899px)');
  const world = root.querySelector<HTMLElement>('.world') as HTMLElement;
  const scenes = [...root.querySelectorAll<HTMLElement>('.sc')];
  const dots = [...root.querySelectorAll<HTMLAnchorElement>('.rail a')];
  const filmBtn = root.querySelector<HTMLButtonElement>('.film-play');
  const slot = root.querySelector<HTMLElement>('.player-slot');
  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const isDyn = () => !reduceMQ.matches;

  let addedDyn = false;
  if (!html.classList.contains(DYN)) {
    html.classList.add(DYN);
    addedDyn = true;
  }
  root.dataset.mode = 'film';

  /* ---------- 轨道 → Web Animations ---------- */
  let tracks: Track[] = [];
  let builtFor: boolean | null = null;
  const destroyAnims = () => {
    for (const t of tracks) for (const a of t.anims) a.cancel();
    tracks = [];
    builtFor = null;
  };
  let dynTimer = 0;
  let buildToken = 0;
  /** 建全部动画：一共几百条轨道，分批建（每批约 6ms），免得挤成一个长任务；建完才打开画面（root 上出现 .ready） */
  const build = (): Promise<void> => {
    destroyAnims();
    const token = ++buildToken;
    const mobile = narrowMQ.matches;
    const data: Tracks = buildTracks(mobile);
    const entries = Object.entries(data);
    let i = 0;
    return new Promise(resolve => {
      const slice = () => {
        if (token !== buildToken) return resolve();
        const t0 = performance.now();
        while (i < entries.length && performance.now() - t0 < 6) {
          const [name, kfs] = entries[i++];
          const els = name.startsWith('css:')
            ? [...root.querySelectorAll<HTMLElement>(name.slice(4))]
            : [...root.querySelectorAll<HTMLElement>(`[data-w="${name}"]`)];
          if (!els.length) continue;
          const frames: Keyframe[] = kfs.map(({ t, easing, ...props }) => ({
            offset: Math.min(1, t / TOTAL),
            easing,
            ...(props as Record<string, string | number>),
          }));
          const anims = els.map(el => {
            const a = el.animate(frames, { duration: TOTAL * 1000, fill: 'both', easing: 'linear' });
            a.pause();
            return a;
          });
          tracks.push({ anims, spans: changeSpans(kfs), key: '' });
        }
        if (i < entries.length) setTimeout(slice, 0);
        else {
          builtFor = mobile;
          staticCount = tracks.length;
          last = -1;
          paint(curF, true);
          resolve();
        }
      };
      slice();
    });
  };

  /* ---------- 过渡元素、时间轴上各站的位置：起点终点要量出来 ---------- */
  let staticCount = 0;
  const rectAt = (sel: string, f: number, nth = 0): DOMRect => {
    paint(f, true);
    const els = root.querySelectorAll(sel);
    return (els[Math.min(nth, els.length - 1)] as Element).getBoundingClientRect();
  };
  const buildDynamic = () => {
    if (!tracks.length) return;
    // 去掉上一次建的
    for (const t of tracks.splice(staticCount)) for (const a of t.anims) a.cancel();
    const saved = curF;
    const w = world.getBoundingClientRect();
    const center = (sel: string, f: number, nth = 0): Pt => {
      const r = rectAt(sel, f, nth);
      return { x: r.left + r.width / 2 - w.left, y: r.top + r.height / 2 - w.top };
    };
    const M = MARKS;
    const m: Measure = {
      a: ['Item1', 'Item2', 'Counter'].map(id => center(`[data-w="b-${id}"]`, M[1] + 3.5)) as Measure['a'],
      aEnd: center('[data-w="d-todos"]', M[2] + 2.6),
      bStart: center('[data-w="fl-Item1"]', M[3] + 5.9),
      bEnd: center('[data-w="n-Hint"]', M[4] + 2.0),
      cStart: { x: w.width / 2, y: w.height / 2 },
      li: Array.from(root.querySelectorAll('[data-w="cp-8"] .eras li .dt'), (_e, j) => center('[data-w="cp-8"] .eras li .dt', TOTAL, j)),
    };
    const data = flyerTracks(m);
    for (const [name, kfs] of Object.entries(data)) {
      const els = name.startsWith('css:')
        ? [...root.querySelectorAll<HTMLElement>(name.slice(4))]
        : [...root.querySelectorAll<HTMLElement>(`[data-w="${name}"]`)];
      const frames: Keyframe[] = kfs.map(({ t, easing, ...props }) => ({
        offset: Math.min(1, t / TOTAL),
        easing,
        ...(props as Record<string, string | number>),
      }));
      const anims = els.map(el => {
        const a = el.animate(frames, { duration: TOTAL * 1000, fill: 'both', easing: 'linear' });
        a.pause();
        return a;
      });
      tracks.push({ anims, spans: changeSpans(kfs), key: '' });
    }
    last = -1;
    paint(saved, true);
  };

  let curF = 0;
  let last = -1;
  const paint = (f: number, force = false) => {
    if (!tracks.length) return;
    if (!force && Math.abs(f - last) < 1e-4) return;
    last = f;
    const ms = f * 1000;
    for (const t of tracks) {
      // 在某一段变化里：每帧都要更新；在两段之间（值不变）：只在进入这一段空隙时更新一次
      let key = '';
      for (let i = 0; i < t.spans.length; i++) {
        const [a, b] = t.spans[i];
        if (f >= a - 0.02 && f <= b + 0.02) {
          key = 's' + i;
          break;
        }
        if (f < a) {
          key = 'g' + i;
          break;
        }
        key = 'g' + (i + 1);
      }
      const inside = key.startsWith('s');
      if (inside || key !== t.key || force) {
        t.key = key;
        for (const a of t.anims) a.currentTime = ms;
      }
    }
  };

  /* ---------- 画面尺寸 ---------- */
  const fitWorld = () => {
    const r = world.getBoundingClientRect();
    const narrow = narrowMQ.matches;
    // 三层空间旋转之后比平面大：留出余量
    const ws = narrow ? Math.min(r.width / 1000, r.height / 520) * 0.98 : Math.min(r.width / 1340, r.height / 650);
    world.style.setProperty('--ws', ws.toFixed(4));
  };

  /* ---------- 滚动 ↔ 影片时间 ---------- */
  const maxY = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const live = new Set<number>();
  let activeScene = -1;
  const status = (f: number) => {
    const s = sceneOf(f);
    for (let i = 0; i < scenes.length; i++) {
      const on = f >= MARKS[i] - 0.3 && f <= MARKS[i] + DURATIONS[i] + 0.3;
      if (on !== live.has(i)) {
        if (on) live.add(i);
        else live.delete(i);
        scenes[i].classList.toggle('live', on);
      }
    }
    if (s !== activeScene) {
      activeScene = s;
      dots.forEach((d, j) => (j === s ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
      root.dataset.active = String(s);
      onScene(s);
    }
    ui.update(f);
    counters(f);
    root.classList.toggle('fin-on', s === LAST);
  };
  /** 收束幕的三个统计数字：进入本幕后从 0 滚动到目标值（影片时间的函数，往回拖也会倒回去）；没有短片模式时直接是最终值 */
  const counts = [...root.querySelectorAll<HTMLElement>('.stats3 dt[data-count]')];
  const counted: number[] = [];
  const counters = (f: number) => {
    if (!isDyn()) return;
    const k = clamp((f - (MARKS[LAST] + 2.0)) / 0.8, 0, 1);
    const e = 1 - (1 - k) ** 3;
    counts.forEach((el, i) => {
      const v = Math.round(Number(el.dataset.count) * e);
      if (counted[i] !== v) {
        counted[i] = v;
        el.textContent = String(v);
      }
    });
  };
  const setF = (f: number) => {
    curF = clamp(f, 0, TOTAL);
    paint(curF);
    status(curF);
  };

  let lastY = 0;
  const onScroll = () => {
    if (!isDyn()) return;
    const y = scrollY;
    if (playing && Math.abs(y - lastY) > 3 && !tweening) pause('scrollbar');
    lastY = y;
    schedule();
  };
  let raf = 0;
  const schedule = () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (isDyn() && !playing) setF(timeOfScroll(scrollY, maxY()));
      });
  };
  const scrollTo = (y: number) => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    lastY = scrollY;
  };

  /* ---------- 播放器 ---------- */
  let playing = false;
  let tweening = false;
  let tick = 0;
  let prevTs = 0;
  let autoTimer = 0;
  let cleanups: (() => void)[] = [];
  /* ---------- 声音：默认静音，用户点了才创建 AudioContext 并加载 audio.ts（自己的 chunk） ---------- */
  const hasAudio = !!(
    (window as unknown as { AudioContext?: unknown }).AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext
  );
  let engine: Engine | null = null;
  let soundOn = false;
  let tipTimer = 0;
  const store = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 隐私模式：当作没记住 */
    }
  };
  const readStore = (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const enableSound = async () => {
    if (soundOn || !hasAudio) return;
    soundOn = true;
    ui.sound(true);
    store(SOUND_PREF, 'on');
    store(SOUND_TIP, '1');
    ui.showTip(false);
    try {
      if (!engine) {
        const m = await import('./audio.ts');
        if (!soundOn || ac.signal.aborted) return;
        engine = m.createEngine();
      }
      if (!engine) throw new Error('no audio');
      await engine.ctx.resume();
      if (playing) engine.sync(curF, true);
    } catch {
      soundOn = false;
      ui.sound(false);
      ui.hideSound();
    }
  };
  const disableSound = () => {
    soundOn = false;
    ui.sound(false);
    store(SOUND_PREF, 'off');
    engine?.hush();
  };
  const showTip = () => {
    if (!hasAudio || soundOn || readStore(SOUND_TIP)) return;
    ui.showTip(true);
    window.clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => ui.showTip(false), 6000);
  };
  let hashTimers: number[] = [];
  const ui = createUi();

  const loop = (ts: number) => {
    tick = 0;
    if (!playing) return;
    const dt = Math.min(0.1 * speed(), ((ts - prevTs) / 1000) * speed());
    prevTs = ts;
    const mY = maxY();
    const nf = clamp(curF + dt, 0, TOTAL);
    curF = nf;
    scrollTo(scrollOfTime(nf, mY));
    paint(nf);
    status(nf);
    if (soundOn && engine) engine.sync(nf, true);
    if (nf >= TOTAL) {
      finish();
      return;
    }
    tick = requestAnimationFrame(loop);
  };
  function play(gesture = false) {
    if (!isDyn() || playing) return;
    if (curF >= TOTAL - 0.05) curF = 0;
    playing = true;
    try {
      sessionStorage.setItem(PLAYED, '1');
      playedThisLoad = true;
    } catch {
      /* 隐私模式：当作没记住 */
    }
    window.clearTimeout(autoTimer);
    root.classList.add('playing');
    prevTs = performance.now();
    ui.state(true);
    if (gesture && !soundOn && readStore(SOUND_PREF) === 'on') void enableSound();
    else if (!soundOn) showTip();
    if (soundOn && engine) engine.sync(curF, true);
    tick = requestAnimationFrame(loop);
  }
  function pause(_why: string) {
    window.clearTimeout(autoTimer);
    if (!playing) return;
    playing = false;
    root.classList.remove('playing');
    if (tick) cancelAnimationFrame(tick);
    tick = 0;
    ui.state(false);
    engine?.hush();
  }
  function finish() {
    playing = false;
    root.classList.remove('playing');
    root.classList.add('ended');
    ui.state(false, true);
    window.setTimeout(() => engine?.hush(), 1500);
  }
  /** 让影片时间从当前值滑到 to（动画着把中间的动作过一遍，不是瞬移）：时长按路程折算，向前约 4 倍速、向后约 6 倍速，夹在 0.8–1.5 秒（倒放 0.6–1.2 秒） */
  let stepQueue: (() => void) | null = null;
  const animateTo = (to: number, then?: () => void) => {
    pause('step');
    window.clearTimeout(autoTimer);
    root.classList.remove('ended');
    to = clamp(to, 0, TOTAL);
    const done = () => {
      tweening = false;
      tick = 0;
      if (to >= TOTAL - 0.01) {
        playing = false;
        root.classList.add('ended');
        ui.state(false, true);
      }
      then?.();
      const q = stepQueue;
      stepQueue = null;
      q?.();
    };
    if (reduceMQ.matches || Math.abs(to - curF) < 0.01) {
      scrollTo(scrollOfTime(to, maxY()));
      setF(to);
      done();
      return;
    }
    tweening = true;
    const from = curF;
    const d = Math.abs(to - from);
    const dur = (to > from ? clamp(d / 4, 0.8, 1.5) : clamp(d / 6, 0.6, 1.2)) / speed();
    const t0 = performance.now();
    const step = (now: number) => {
      const x = clamp((now - t0) / (dur * 1000), 0, 1);
      const e = 1 - (1 - x) ** 2.2; // 先快后慢，停稳
      const v = from + (to - from) * e;
      scrollTo(scrollOfTime(v, maxY()));
      setF(v);
      if (x < 1) tick = requestAnimationFrame(step);
      else done();
    };
    tick = requestAnimationFrame(step);
  };
  /** 跳到某个影片时间：smooth 为假就瞬移（重播、锚点）；为真就用上面的滑动 */
  const seek = (f: number, smooth = true) => {
    const was = playing;
    pause('seek');
    root.classList.remove('ended');
    const to = clamp(f, 0, TOTAL);
    if (!smooth || reduceMQ.matches) {
      scrollTo(scrollOfTime(to, maxY()));
      setF(to);
      if (was) play();
      return;
    }
    animateTo(to, was ? () => play() : undefined);
  };
  /** 去第 i 幕的停稳点（圆点、进度条点击、上一幕/下一幕、键盘、滚动手势全部走这一个函数）；动画进行中再来的输入最多排队一个 */
  const goStop = (i: number) => {
    if (tweening) {
      stepQueue = () => goStop(i);
      return;
    }
    animateTo(stopOf(clamp(i, 0, LAST)));
  };
  /** 一次手势 = 一幕：dir 为 1 往后、-1 往前 */
  const userStep = (dir: 1 | -1) => {
    if (!isDyn()) return;
    if (tweening) {
      stepQueue = () => userStep(dir);
      return;
    }
    const i = dir > 0 ? nextScene(curF) : prevScene(curF);
    if (i < 0) {
      pause('user');
      return;
    }
    goStop(i);
  };

  // 用户接管：滚轮、触摸上滑下滑、键盘（↓ PageDown 空格 / ↑ PageUp）都是“一次一幕”。短片模式下页面没有原生滚动（html 是 overflow: hidden、touch-action: none），
  // 所以这里不需要、也没有 preventDefault，监听全是被动的；惯性滚动、一串滚轮事件按“手势”算一次
  const takeOver = () => {
    window.clearTimeout(autoTimer);
    hashTimers.forEach(t => window.clearTimeout(t));
  };
  const inFinaleScroller = (t: EventTarget | null) => {
    const c = (t as HTMLElement | null)?.closest?.('.s9 .sc-copy') as HTMLElement | null;
    return !!c && c.scrollHeight > c.clientHeight + 1;
  };
  let wheelBusy = false;
  let wheelIdle = 0;
  addEventListener(
    'wheel',
    e => {
      if (!isDyn() || e.ctrlKey || Math.abs(e.deltaY) < 2 || Math.abs(e.deltaY) < Math.abs(e.deltaX) || inFinaleScroller(e.target)) return;
      takeOver();
      window.clearTimeout(wheelIdle);
      wheelIdle = window.setTimeout(() => (wheelBusy = false), 160);
      if (wheelBusy) return;
      wheelBusy = true;
      userStep(e.deltaY > 0 ? 1 : -1);
    },
    { passive: true, ...sig },
  );
  let touchY = 0;
  let touchX = 0;
  let touchLive = false;
  addEventListener(
    'touchstart',
    e => {
      const t = e.target as HTMLElement | null;
      touchLive = isDyn() && e.touches.length === 1 && !t?.closest?.('.player, .snd-tip, .rail') && !inFinaleScroller(t);
      touchY = e.touches[0]?.clientY ?? 0;
      touchX = e.touches[0]?.clientX ?? 0;
    },
    { passive: true, ...sig },
  );
  addEventListener(
    'touchmove',
    e => {
      if (!touchLive) return;
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      const dx = touchX - (e.touches[0]?.clientX ?? touchX);
      if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        touchLive = false; // 一次滑动只算一幕
        takeOver();
        userStep(dy > 0 ? 1 : -1);
      }
    },
    { passive: true, ...sig },
  );
  addEventListener('touchend', () => (touchLive = false), { passive: true, ...sig });
  addEventListener('touchcancel', () => (touchLive = false), { passive: true, ...sig });
  addEventListener(
    'keydown',
    e => {
      if (!isDyn() || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      // 焦点在按钮、链接、输入框、进度条、播放器上时，这些键归它们自己（空格要能按按钮）
      if (t?.closest?.('.player, button, a, input, textarea, select, [role="slider"], [contenteditable]')) return;
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'PageDown' || e.key === 'ArrowDown') {
        takeOver();
        userStep(1);
      } else if (e.key === 'PageUp' || e.key === 'ArrowUp') {
        takeOver();
        userStep(-1);
      } else if (e.key === 'Home') {
        takeOver();
        goStop(0);
      } else if (e.key === 'End') {
        takeOver();
        goStop(LAST);
      }
    },
    { passive: true, ...sig },
  );
  addEventListener('scroll', onScroll, { passive: true, ...sig });
  addEventListener(
    'resize',
    () => {
      fitWorld();
      if (builtFor !== null && builtFor !== narrowMQ.matches) void build().then(buildDynamic);
      else {
        window.clearTimeout(dynTimer);
        dynTimer = window.setTimeout(buildDynamic, 250);
      }
      schedule();
    },
    { passive: true, ...sig },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && playing) {
        pause('hidden');
        ui.needResume();
      }
    },
    sig,
  );
  reduceMQ.addEventListener(
    'change',
    () => {
      if (reduceMQ.matches) {
        pause('reduced');
        destroyAnims();
      } else {
        fitWorld();
        void build();
        setF(timeOfScroll(scrollY, maxY()));
      }
      ui.show(!reduceMQ.matches);
    },
    sig,
  );

  /* ---------- 播放控制条 ---------- */
  function createUi() {
    const bar = document.createElement('div');
    bar.className = 'player';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '短片播放控制');
    const icon = (d: string) =>
      `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="${d}" fill="currentColor"/></svg>`;
    const I = {
      play: icon('M8 5v14l11-7z'),
      pause: icon('M6 5h4v14H6zM14 5h4v14h-4z'),
      prev: icon('M6 6h2v12H6zM9.5 12 18 6v12z'),
      next: icon('M16 6h2v12h-2zM6 18V6l8.5 6z'),
      replay: icon('M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z'),
      spk: icon('M3 9v6h4l5 4V5L7 9zM16 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2zM18.8 5.7a9 9 0 0 1 0 12.6l-1.4-1.4a7 7 0 0 0 0-9.8z'),
    };
    bar.innerHTML = `
      <button type="button" class="play" aria-pressed="false" aria-label="播放短片">${I.play}</button>
      <button type="button" class="prev" aria-label="上一幕">${I.prev}</button>
      <div class="scrub" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="开场">
        ${DURATIONS.map((d, i) => `<span class="seg" style="flex:${d}" data-i="${i}"><i></i></span>`).join('')}
        <span class="tip" aria-hidden="true"></span>
      </div>
      <button type="button" class="next" aria-label="下一幕">${I.next}</button>
      <button type="button" class="replay" aria-label="重播">${I.replay}</button>
      <button type="button" class="snd" aria-pressed="false" aria-label="声音（配乐）">${I.spk}<span class="snd-t">声音</span></button>
      <a class="skip" href="#scene-8" aria-label="跳到结尾">跳到结尾 →</a>`;
    const live = document.createElement('div');
    live.className = 'live-region';
    live.setAttribute('aria-live', 'polite');
    const q = <T extends HTMLElement>(s: string) => bar.querySelector(s) as T;
    const playBtn = q<HTMLButtonElement>('.play');
    const scrub = q<HTMLElement>('.scrub');
    const scrubTip = q<HTMLElement>('.tip');
    const skipEl = q<HTMLAnchorElement>('.skip');
    const segs = [...bar.querySelectorAll<HTMLElement>('.seg i')];
    let resume = false;
    let lastFin = false;
    let lastFill: number[] = [];
    const tip = document.createElement('button');
    tip.type = 'button';
    tip.className = 'snd-tip';
    tip.hidden = true;
    tip.textContent = '🔊 开启配乐';
    slot?.append(bar, tip, live);

    const setBtn = (isPlaying: boolean, ended = false) => {
      playBtn.setAttribute('aria-pressed', String(isPlaying));
      playBtn.innerHTML = isPlaying ? I.pause : I.play;
      playBtn.setAttribute('aria-label', isPlaying ? '暂停短片' : ended ? '重播短片' : resume ? '继续播放短片' : '播放短片');
      if (filmBtn) filmBtn.hidden = !isDyn() || isPlaying;
    };
    playBtn.addEventListener('click', () => (playing ? pause('button') : play(true)), sig);
    q('.prev').addEventListener('click', () => userStep(-1), sig);
    q('.next').addEventListener('click', () => userStep(1), sig);
    q('.replay').addEventListener(
      'click',
      () => {
        root.classList.remove('ended');
        seek(0, false);
        play(true);
      },
      sig,
    );
    // “跳到结尾”：不在片尾时去片尾；已经在片尾（放完后的画面）时，它就是“开始学习”，直接进入学习（和收束幕的主按钮同一个目标）
    skipEl.addEventListener(
      'click',
      e => {
        e.preventDefault();
        if (curF >= TOTAL - 0.05) (root.querySelector('.s9 .fin-actions .btn.big') as HTMLAnchorElement | null)?.click();
        else {
          pause('skip');
          goStop(LAST);
        }
      },
      sig,
    );
    filmBtn?.addEventListener('click', () => play(true), sig);
    const sndBtn = q<HTMLButtonElement>('.snd');
    if (!hasAudio) sndBtn.hidden = true;
    sndBtn.addEventListener('click', () => (soundOn ? disableSound() : void enableSound()), sig);
    tip.addEventListener('click', () => void enableSound(), sig);
    // 进度条：点击、拖动都是 scrub，同时暂停自动播放
    const frac = (e: PointerEvent) => {
      const r = scrub.getBoundingClientRect();
      return clamp((e.clientX - r.left) / r.width, 0, 1);
    };
    // 点一下进度条 = 去那一幕的停稳点；按住拖动 = 连续擦洗（拖动超过 5px 才算拖动）
    let dragging = false;
    let moved = false;
    let downX = 0;
    scrub.addEventListener(
      'pointerdown',
      e => {
        dragging = true;
        moved = false;
        downX = e.clientX;
        scrub.setPointerCapture(e.pointerId);
      },
      sig,
    );
    scrub.addEventListener(
      'pointermove',
      e => {
        const f = frac(e) * TOTAL;
        const r = scrub.getBoundingClientRect();
        scrubTip.textContent = SCENE_LABELS[sceneOf(f)];
        scrubTip.style.opacity = '1';
        scrubTip.style.transform = `translateX(${clamp(e.clientX - r.left - 40, 0, Math.max(0, r.width - 160))}px)`;
        if (dragging && (moved || Math.abs(e.clientX - downX) > 5)) {
          if (!moved) {
            moved = true;
            pause('scrub');
            root.classList.remove('ended');
          }
          scrollTo(scrollOfTime(f, maxY()));
          setF(f);
        }
      },
      sig,
    );
    scrub.addEventListener(
      'pointerup',
      e => {
        if (dragging && !moved) {
          pause('scrub');
          goStop(sceneOf(frac(e) * TOTAL));
        }
        dragging = false;
      },
      sig,
    );
    scrub.addEventListener('pointerleave', () => (scrubTip.style.opacity = '0'), sig);
    scrub.addEventListener(
      'focus',
      () => {
        scrubTip.textContent = SCENE_LABELS[activeScene];
        scrubTip.style.opacity = '1';
      },
      sig,
    );
    scrub.addEventListener('blur', () => (scrubTip.style.opacity = '0'), sig);
    // 键盘：只在播放器获得焦点时。空格播放/暂停（按钮自己会处理空格），左右方向键切幕
    bar.addEventListener(
      'keydown',
      e => {
        const onButton = (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'A';
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          userStep(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          userStep(-1);
        } else if ((e.key === ' ' || e.key === 'Spacebar') && !onButton) {
          e.preventDefault();
          if (playing) pause('key');
          else play();
        } else if (e.key === 'Home') {
          e.preventDefault();
          goStop(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          goStop(LAST);
        }
      },
      sig,
    );
    return {
      state: setBtn,
      sound(on: boolean) {
        sndBtn.setAttribute('aria-pressed', String(on));
        sndBtn.classList.toggle('on', on);
      },
      hideSound() {
        sndBtn.hidden = true;
        tip.hidden = true;
      },
      showTip(on: boolean) {
        tip.hidden = !on || !hasAudio;
      },
      needResume() {
        resume = true;
        setBtn(false);
        if (filmBtn) filmBtn.textContent = '▶ 继续播放';
      },
      show(on: boolean) {
        bar.hidden = !on;
        if (filmBtn) filmBtn.hidden = !on || playing;
      },
      update(f: number) {
        const s = sceneOf(f);
        const fin = f >= TOTAL - 0.05;
        if (fin !== lastFin) {
          lastFin = fin;
          const go = root.querySelector<HTMLAnchorElement>('.s9 .fin-actions .btn.big');
          skipEl.textContent = fin ? '开始学习 →' : '跳到结尾 →';
          skipEl.setAttribute('aria-label', fin ? '开始学习：' + (go?.textContent?.replace(/\s+/g, ' ').trim() ?? '') : '跳到结尾');
          if (fin && go) skipEl.setAttribute('href', go.getAttribute('href') || '#');
          else skipEl.setAttribute('href', '#scene-8');
        }
        segs.forEach((el, i) => {
          const v = Math.round(clamp((f - MARKS[i]) / DURATIONS[i], 0, 1) * 1000) / 1000;
          if (lastFill[i] !== v) {
            lastFill[i] = v;
            el.style.transform = `scaleX(${v})`;
          }
        });
        const pct = Math.round((f / TOTAL) * 100);
        if (scrub.getAttribute('aria-valuenow') !== String(pct)) {
          scrub.setAttribute('aria-valuenow', String(pct));
          scrub.setAttribute('aria-valuetext', `第 ${s} 幕：${SCENE_LABELS[s]}`);
        }
      },
      announce(s: number) {
        live.textContent = `第 ${s} 幕：${SCENE_LABELS[s]}`;
      },
    };
  }
  const onScene = (s: number) => {
    if (playing || tweening) ui.announce(s);
  };

  /* ---------- 幕进度指示（右侧圆点）和锚点 ---------- */
  dots.forEach((d, i) => {
    d.addEventListener(
      'click',
      e => {
        if (!isDyn()) return;
        e.preventDefault();
        goStop(i);
      },
      sig,
    );
  });

  function maybeAutoplay() {
    // 自动开始：每次打开或刷新首页都放（新访客和回访者一样），除非带锚点进来、开了减少动画、页面不在最上面、标签页在后台，
    // 或者这次页面加载里已经放过（站内跳走再回来）
    if (isDyn() && !playedThisLoad && !location.hash && scrollY < 80 && !document.hidden) {
      autoTimer = window.setTimeout(() => {
        if (scrollY < 80 && !playing && !document.hidden) play();
      }, 1200);
    }
  }

  /* ---------- 启动 ---------- */
  fitWorld();
  const hashed = !!location.hash && /^#scene-\d$/.test(location.hash);
  /** 带 #scene-N 进来：滚到那一幕。VitePress 的路由在加载之后也会按它自己的偏移量滚一次（时机不定），所以建好动画之后对一次，再隔一会儿对两次；用户已经动手就不再纠正 */
  const applyHash = () => {
    const i = Number(location.hash.slice(-1));
    const goto = () => {
      scrollTo(scrollOfTime(stopOf(i), maxY()));
      setF(stopOf(i));
    };
    goto();
    hashTimers = [300, 900].map(ms => window.setTimeout(goto, ms));
  };
  const start = () => {
    root.classList.add('ready');
    if (hashed && isDyn()) applyHash();
    else maybeAutoplay();
  };
  if (isDyn()) {
    ui.show(true);
    build().then(() => {
      buildDynamic();
      start();
    });
  } else {
    ui.show(false);
    start();
  }
  ui.state(false);
  if (filmBtn) filmBtn.hidden = !isDyn();
  if (!(hashed && isDyn())) {
    curF = timeOfScroll(scrollY, maxY());
    lastY = scrollY;
    setF(curF);
  }
  // 测试钩子：只有测试页面设了 window.__filmTest 才会有。读音频状态、离线渲染整段配乐做检查
  if ((window as unknown as { __filmTest?: boolean }).__filmTest) {
    (window as unknown as { __filmHook?: unknown }).__filmHook = {
      audio: () => ({ on: soundOn, created: !!engine, state: engine?.ctx.state ?? null, level: engine?.level() ?? 0, playing, info: engine?.info() ?? null }),
      render: async () => {
        const [a, an] = await Promise.all([import('./audio.ts'), import('./logic/scoreAnalysis.ts')]);
        const r = await a.renderOffline();
        return an.analyzeAndEncode(r.left, r.right, r.sampleRate);
      },
    };
  }

  return () => {
    ac.abort();
    window.clearTimeout(dynTimer);
    window.clearTimeout(tipTimer);
    engine?.dispose();
    engine = null;
    delete (window as unknown as { __filmHook?: unknown }).__filmHook;
    window.clearTimeout(autoTimer);
    hashTimers.forEach(t => window.clearTimeout(t));
    if (tick) cancelAnimationFrame(tick);
    if (raf) cancelAnimationFrame(raf);
    playing = false;
    destroyAnims();
    slot?.replaceChildren();
    for (const c of cleanups) c();
    cleanups = [];
    html.classList.remove(DYN); // 首屏前脚本加的也一并去掉：离开首页后不留短片模式的类（回到首页时 attach 会重新加上）
    scenes.forEach(s => s.classList.remove('live'));
    root.classList.remove('ready', 'playing', 'ended');
    delete root.dataset.mode;
  };
}
