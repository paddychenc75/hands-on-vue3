/* 首页短片的配乐和音效：用 Web Audio API 现场合成，没有任何音频文件（移植自 hands-on-react 的同名文件，和弦与音效换成 Vue 版的 9 幕）。
 * 只有用户在播放器上打开声音时，film.ts 才会动态 import 这个文件（自己的 chunk），不开声音的访客不会加载它。
 *
 * 音乐是“影片时间的函数”：scheduleScore(ctx, out, from, to, when) 给定任何 BaseAudioContext，把影片时间 [from, to) 里的所有声音
 * 排到 ctx 的时间 when 开始的位置。在线（AudioContext，前瞻调度）和离线（OfflineAudioContext，整段渲染成 WAV 来检查）共用这一个函数。
 * 排好的声音全部走一条母线：压缩器限幅、整体响度适中，开头淡入、结尾淡出。
 *
 * 想调听感，改下面这几处（都有注释）：KEY / CHORDS（调式和每一幕的和弦）、LEVEL（整体音量和各层的相对音量）、ARP（每幕的脉搏：速度、音色、八度）。 */
import { CUE, DATA, DURATIONS, MARKS, NODES, TOTAL } from './logic/filmData.ts';

/* ---------------- 可以调的参数 ---------------- */
/** D 小调。每一幕一个和弦（MIDI 音高）：从“简单、空”走向“丰富、明亮”，收束幕落在主和弦（Dm add9）上 */
export const CHORDS: number[][] = [
  [38, 45, 50], // 0 开场：D 5 度，空
  [38, 45, 50, 57], // 1 手动改 DOM：还是空，略带不安
  [38, 45, 53, 57, 62], // 2 Dm：Vue 1.0
  [34, 46, 53, 57, 62], // 3 Bb maj7：Vue 2.0
  [43, 50, 58, 62, 65], // 4 Gm7：Vue 3.0
  [41, 48, 57, 60, 64], // 5 F maj7：组合式
  [46, 53, 57, 60, 62], // 6 Bb maj9：3.4 / 3.5，明亮
  [41, 48, 57, 64, 67], // 7 F maj9：Vapor
  [38, 45, 53, 57, 64], // 8 Dm add9：落回主和弦
];
export const LEVEL = {
  /** 母线整体音量（压缩器之前）。峰值要低于 -3 dBFS，改大前先跑 e2e 里的离线检查 */
  master: 0.8,
  pad: 0.11,
  arp: 0.1,
  sfx: 1.0,
  /** 手动擦洗（没有在自动播放）时只保留一层铺底，音量降这么多 */
  manualPad: 0.45,
};
/** 脉搏：每一幕的节拍间隔（秒）、音高相对和弦的八度偏移、音色。null = 这一幕没有脉搏 */
export const ARP: ({ step: number; oct: number; type: OscillatorType; decay: number; from: number; to: number; pan?: 'sweep' } | null)[] = [
  null,
  null,
  { step: 0.5, oct: 1, type: 'triangle', decay: 0.5, from: MARKS[2] + 0.8, to: MARKS[3] - 0.2 },
  { step: 0.5, oct: 1, type: 'triangle', decay: 0.5, from: MARKS[3] + 0.5, to: MARKS[4] - 0.2 },
  { step: 0.25, oct: 1, type: 'sine', decay: 0.16, from: MARKS[4] + 2.0, to: MARKS[5] - 0.1 },
  { step: 0.4, oct: 2, type: 'sine', decay: 0.4, from: MARKS[5] + 0.3, to: MARKS[6] - 0.1 },
  { step: 0.5, oct: 1, type: 'triangle', decay: 0.45, from: MARKS[6] + 0.5, to: MARKS[7] - 0.2 },
  { step: 0.5, oct: 1, type: 'triangle', decay: 0.5, from: MARKS[7] + 0.5, to: MARKS[8] - 0.2, pan: 'sweep' },
  null,
];

/* ---------------- 底层小工具 ---------------- */
export interface Out {
  dry: AudioNode;
  rev: AudioNode;
  del: AudioNode;
}
export interface Bus {
  master: GainNode;
  /** 一个“世代”的入口：再次排程（拖进度条、换幕）时，旧世代整体淡出 */
  epoch(): Epoch;
}
export interface Epoch extends Out {
  kill(ctx: BaseAudioContext, at: number): void;
}
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
let seed = 1;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    seed = 7;
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}
function impulse(ctx: BaseAudioContext, sec = 2.6): AudioBuffer {
  seed = 11;
  const n = Math.floor(ctx.sampleRate * sec);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += (rnd() * 2 - 1 - lp) * 0.35; // 去掉刺耳的高频
      d[i] = lp * (1 - i / n) ** 2.6;
    }
  }
  return b;
}

/** 母线：压缩器限幅 → 微调 → 输出。混响用程序生成的脉冲响应，延迟带反馈。 */
export function createBus(ctx: BaseAudioContext, dest: AudioNode, level = LEVEL.master): Bus {
  const master = ctx.createGain();
  master.gain.value = level;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 18;
  comp.ratio.value = 10;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  const trim = ctx.createGain();
  trim.gain.value = 0.9;
  master.connect(comp).connect(trim).connect(dest);
  const dryBus = ctx.createGain();
  dryBus.connect(master);
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx);
  const revG = ctx.createGain();
  revG.gain.value = 0.55;
  const revIn = ctx.createGain();
  revIn.connect(conv).connect(revG).connect(master);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.375;
  const fb = ctx.createGain();
  fb.gain.value = 0.34;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  const delIn = ctx.createGain();
  const delOut = ctx.createGain();
  delOut.gain.value = 0.5;
  delIn.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(delOut).connect(master);
  return {
    master,
    epoch() {
      const dry = ctx.createGain();
      const rev = ctx.createGain();
      const del = ctx.createGain();
      dry.connect(dryBus);
      rev.connect(revIn);
      del.connect(delIn);
      return {
        dry,
        rev,
        del,
        kill(c, at) {
          for (const g of [dry, rev, del]) {
            g.gain.cancelScheduledValues(at);
            g.gain.setTargetAtTime(0, at, 0.05);
          }
          setTimeout(() => {
            for (const g of [dry, rev, del]) g.disconnect();
          }, 900);
          void c;
        },
      };
    },
  };
}

interface VoiceOpts {
  pan?: number;
  rev?: number;
  del?: number;
}
/** 把一个声音节点接到世代的干声 / 混响发送 / 延迟发送 */
function route(ctx: BaseAudioContext, o: Out, node: AudioNode, v: VoiceOpts = {}): void {
  const p = ctx.createStereoPanner();
  p.pan.value = v.pan ?? 0;
  node.connect(p);
  p.connect(o.dry);
  if (v.rev) {
    const g = ctx.createGain();
    g.gain.value = v.rev;
    p.connect(g).connect(o.rev);
  }
  if (v.del) {
    const g = ctx.createGain();
    g.gain.value = v.del;
    p.connect(g).connect(o.del);
  }
}
function env(ctx: BaseAudioContext, t: number, a: number, peak: number, d: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}
function tone(
  ctx: BaseAudioContext,
  o: Out,
  t: number,
  f: number,
  type: OscillatorType,
  a: number,
  d: number,
  peak: number,
  v: VoiceOpts = {},
  f2?: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const g = env(ctx, t, a, peak, d);
  osc.connect(g);
  route(ctx, o, g, v);
  osc.start(t);
  osc.stop(t + a + d + 0.05);
}
/** 带通滤波的噪声：f0 扫到 f1 */
function sweep(ctx: BaseAudioContext, o: Out, t: number, dur: number, f0: number, f1: number, q: number, peak: number, v: VoiceOpts = {}, pan1?: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + Math.min(dur * 0.4, 0.07));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g);
  if (pan1 !== undefined) {
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(v.pan ?? 0, t);
    p.pan.linearRampToValueAtTime(pan1, t + dur);
    g.connect(p);
    p.connect(o.dry);
    if (v.rev) {
      const r = ctx.createGain();
      r.gain.value = v.rev;
      p.connect(r).connect(o.rev);
    }
  } else route(ctx, o, g, v);
  src.start(t, 0.1);
  src.stop(t + dur + 0.05);
}
function click(ctx: BaseAudioContext, o: Out, t: number, f: number, peak: number, pan = 0): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = f;
  hp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(hp).connect(g);
  route(ctx, o, g, { pan });
  src.start(t, 0.3);
  src.stop(t + 0.06);
}
/** 铺底：两个去谐的锯齿波叠加 + 低通滤波器缓慢开合 */
function pad(ctx: BaseAudioContext, o: Out, t: number, dur: number, f: number, pan: number, peak: number, fade: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + fade);
  g.gain.setValueAtTime(peak, t + dur - 1.6);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(380, t);
  lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.7);
  lp.frequency.linearRampToValueAtTime(700, t + dur);
  for (const cents of [-7, 6]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.detune.value = cents;
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  lp.connect(g);
  route(ctx, o, g, { pan, rev: 0.7 });
}

/* ---------------- 排程：影片时间 [from, to) → ctx 时间 when 起 ---------------- */
export interface ScheduleOpts {
  /** 从中途开始：把正在响的铺底补上（淡入） */
  catchUp?: boolean;
  /** 只排铺底（手动擦洗时） */
  padOnly?: boolean;
}
export function scheduleScore(ctx: BaseAudioContext, o: Out, from: number, to: number, when: number, opts: ScheduleOpts = {}): void {
  const at = (t: number) => when + (t - from);
  const inR = (t: number) => t >= from && t < to;
  const sfx = LEVEL.sfx;

  /* 铺底：每一幕一个和弦，前后重叠，和声随时代推进 */
  for (let i = 0; i < CHORDS.length; i++) {
    const a = i === 0 ? 0 : MARKS[i] - 0.6;
    const b = i === CHORDS.length - 1 ? TOTAL + 1.2 : MARKS[i + 1] + 1.0;
    const started = inR(a);
    const cover = opts.catchUp && a < from && b > from + 0.5;
    if (!started && !cover) continue;
    const ts = started ? a : from;
    const level = LEVEL.pad * (0.7 + 0.04 * i) * (opts.padOnly ? LEVEL.manualPad : 1);
    CHORDS[i].forEach((m, j) =>
      pad(ctx, o, at(ts), b - ts, hz(m), (j / Math.max(1, CHORDS[i].length - 1) - 0.5) * 0.8, level / Math.sqrt(CHORDS[i].length / 3), started ? 1.8 : 0.8),
    );
  }
  if (opts.padOnly) return;

  /* 脉搏：琶音，每一幕的速度和音色不同 */
  ARP.forEach((cfg, i) => {
    if (!cfg) return;
    const chord = CHORDS[i];
    const tones = [chord[1], chord[2], chord[3] ?? chord[2] + 12, chord[4] ?? chord[1] + 12];
    const n = Math.floor((cfg.to - cfg.from) / cfg.step);
    for (let s = 0; s < n; s++) {
      const t = cfg.from + s * cfg.step;
      if (!inR(t)) continue;
      const m = tones[[0, 1, 2, 3, 2, 1][s % 6] % tones.length] + 12 * cfg.oct;
      const pan = cfg.pan === 'sweep' ? ((t - cfg.from) / (cfg.to - cfg.from)) * 1.7 - 0.85 : Math.sin(s * 0.9) * 0.25;
      tone(ctx, o, at(t), hz(m), cfg.type, 0.008, cfg.decay, LEVEL.arp, { pan, rev: 0.35, del: 0.5 });
    }
  });

  const bind = ['Title', 'Item1', 'Item2', 'Counter'].map(id => NODES.find(n => n.id === id) as (typeof NODES)[number]);
  const panOf = (x: number) => (x / 1000) * 1.4 - 0.7;
  /* 第 1 幕：手动改了两块（各一声轻点）；漏掉的那一块，一个轻微的不协和音（D 和降 E 的小二度） */
  CUE.manual.forEach((t, i) => {
    if (inR(t)) tone(ctx, o, at(t), hz(74 + i * 3), 'triangle', 0.004, 0.4, 0.2 * sfx, { pan: panOf(bind[1 + i].x), rev: 0.5 });
  });
  if (inR(CUE.miss)) {
    tone(ctx, o, at(CUE.miss), 293.66, 'triangle', 0.02, 0.7, 0.16 * sfx * 2, { pan: 0.3, rev: 0.4 });
    tone(ctx, o, at(CUE.miss), 311.13, 'triangle', 0.02, 0.7, 0.16 * sfx * 2, { pan: 0.3, rev: 0.4 });
  }
  /* 第 2 幕：四个 watcher 依次冒出，音高上行；数据变了，三条光束依次落到 DOM，每次一个“叮” */
  const scale = [74, 77, 81, 84];
  bind.forEach((n, i) => {
    const t = CUE.watch(i);
    if (!inR(t)) return;
    tone(ctx, o, at(t), hz(scale[i]), 'sine', 0.004, 0.55, 0.3 * sfx, { pan: panOf(n.x), rev: 0.6, del: 0.45 });
    tone(ctx, o, at(t), hz(scale[i] + 12), 'sine', 0.004, 0.22, 0.07 * sfx, { pan: panOf(n.x), rev: 0.6 });
  });
  CUE.wire2.forEach((t, i) => {
    if (!inR(t)) return;
    sweep(ctx, o, at(t) - 0.2, 0.5, 700, 2400, 3, 0.2 * sfx, { rev: 0.4, pan: -0.3 }, panOf(bind[1 + i].x));
    tone(ctx, o, at(t), hz(81 + i * 3), 'sine', 0.003, 0.5, 0.34 * sfx, { pan: panOf(bind[1 + i].x), rev: 0.6, del: 0.3 });
  });
  /* 第 3 幕：四个组件 watcher（低一点的拨弦）；List、Footer 重新生成 vnode 子树（光扫过的 swish）；标出差别；提交（低频落点加尾音） */
  [0, 1, 2, 3].forEach(i => {
    const t = CUE.pw(i);
    if (inR(t)) tone(ctx, o, at(t), hz([69, 72, 76, 79][i]), 'triangle', 0.004, 0.45, 0.22 * sfx, { pan: -0.3 + i * 0.2, rev: 0.6, del: 0.3 });
  });
  CUE.redo.forEach((t, i) => {
    if (!inR(t)) return;
    sweep(ctx, o, at(t), 0.9, 500, 3000, 2, 0.2 * sfx, { rev: 0.4, pan: i ? 0.3 : -0.2 }, i ? 0.7 : 0.2);
    tone(ctx, o, at(t), hz(i ? 79 : 76), 'triangle', 0.003, 0.4, 0.3 * sfx, { rev: 0.5, del: 0.3, pan: i ? 0.3 : -0.2 });
  });
  if (inR(CUE.flag3)) {
    tone(ctx, o, at(CUE.flag3), 740, 'triangle', 0.003, 0.35, 0.22 * sfx, { rev: 0.6, del: 0.4, pan: 0.2 });
    tone(ctx, o, at(CUE.flag3) + 0.12, 988, 'triangle', 0.003, 0.35, 0.18 * sfx, { rev: 0.6, del: 0.4, pan: 0.4 });
  }
  if (inR(CUE.land3)) {
    tone(ctx, o, at(CUE.land3), 80, 'sine', 0.01, 0.8, 0.5 * sfx, { rev: 0.3 }, 38);
    sweep(ctx, o, at(CUE.land3) + 0.05, 1.4, 1800, 260, 4, 0.2 * sfx, { rev: 0.8, pan: -0.2 }, 0.3);
    click(ctx, o, at(CUE.land3) + 0.18, 900, 0.05 * sfx);
  }
  /* 第 4 幕：Proxy 的三个环（高音拨弦）；静态节点的盾（轻轻一声）；区块的扁平连线（上行扫频）；差别标记；提交 */
  DATA.forEach((d, i) => {
    const t = CUE.proxy(i);
    if (inR(t)) tone(ctx, o, at(t), hz([86, 89, 93][i]), 'sine', 0.003, 0.45, 0.22 * sfx, { pan: panOf(d.x), rev: 0.6, del: 0.4 });
  });
  if (inR(CUE.shield)) tone(ctx, o, at(CUE.shield), hz(62), 'triangle', 0.01, 0.5, 0.3 * sfx, { pan: -0.4, rev: 0.5 });
  if (inR(CUE.flat)) sweep(ctx, o, at(CUE.flat), 1.2, 400, 4200, 5, 0.22 * sfx, { rev: 0.4, pan: -0.2 }, 0.3);
  if (inR(CUE.flag4)) {
    tone(ctx, o, at(CUE.flag4), 880, 'triangle', 0.003, 0.35, 0.22 * sfx, { rev: 0.6, del: 0.4, pan: 0.3 });
  }
  if (inR(CUE.land4)) {
    tone(ctx, o, at(CUE.land4), 80, 'sine', 0.01, 0.8, 0.5 * sfx, { rev: 0.3 }, 38);
    sweep(ctx, o, at(CUE.land4) + 0.05, 1.2, 1800, 260, 4, 0.2 * sfx, { rev: 0.8, pan: 0.2 }, -0.3);
  }
  /* 第 5 幕：五个小块从三列聚到分组（一道上行的扫频），分组框落下时一个和弦的“叮” */
  if (inR(CUE.gather)) sweep(ctx, o, at(CUE.gather), 1.3, 400, 3400, 2, 0.24 * sfx, { rev: 0.5 }, 0.5);
  if (inR(CUE.group)) {
    for (const m of [74, 81, 86]) tone(ctx, o, at(CUE.group), hz(m), 'sine', 0.004, 1.2, 0.14 * sfx, { rev: 0.8, del: 0.3 });
  }
  /* 第 6 幕：computed 的值没变，下游被挡住（一声低沉的“咚”）；3.5 的内存条缩短（一个下滑音） */
  if (inR(CUE.hold)) {
    tone(ctx, o, at(CUE.hold), 110, 'sine', 0.004, 0.5, 0.4 * sfx, { rev: 0.3 }, 70);
    tone(ctx, o, at(CUE.hold), hz(62), 'triangle', 0.01, 0.35, 0.12 * sfx, { rev: 0.5 });
  }
  if (inR(CUE.mem)) tone(ctx, o, at(CUE.mem), 880, 'sine', 0.02, 0.9, 0.2 * sfx, { rev: 0.6, del: 0.3 }, 440);
  /* 第 7 幕：Vapor 的 effect 标记明亮地冒出；三条直连光束从左流向右，落位时一个“叮” */
  bind.forEach((n, i) => {
    const t = CUE.vwatch(i);
    if (inR(t)) tone(ctx, o, at(t), hz(81 + i * 2), 'sine', 0.004, 0.45, 0.36 * sfx, { pan: panOf(n.x), rev: 0.6, del: 0.4 });
  });
  CUE.vwire.forEach((t, i) => {
    if (!inR(t)) return;
    sweep(ctx, o, at(t) - 0.25, 0.55, 600, 3200, 3, 0.3 * sfx, { pan: -0.7, rev: 0.4 }, 0.7);
    tone(ctx, o, at(t), hz(86 + i * 3), 'sine', 0.003, 0.5, 0.36 * sfx, { pan: 0.3 + i * 0.15, rev: 0.6, del: 0.3 });
  });
  /* 年份数字滚动的“咔哒”；换幕的 whoosh */
  CUE.ticks.forEach(t => {
    if (inR(t)) {
      click(ctx, o, at(t), 2600, 2.0 * sfx);
      click(ctx, o, at(t) + 0.13, 2200, 1.4 * sfx);
    }
  });
  for (let i = 1; i <= 8; i++) {
    const t = CUE.whoosh(i);
    if (inR(t)) sweep(ctx, o, at(t), 0.8, 500, 2600, 0.8, 0.8 * sfx, { rev: 0.5, pan: i % 2 ? -0.4 : 0.4 }, i % 2 ? 0.4 : -0.4);
  }
  /* 收束：三层空间缩成一个点（上行的滑音），落成时间轴上的最后一个点（一个和弦的“叮”） */
  if (inR(MARKS[8] + 0.2)) tone(ctx, o, at(MARKS[8] + 0.2), 220, 'sine', 0.3, 1.1, 0.12 * sfx, { rev: 0.5 }, 880);
  if (inR(CUE.fin)) {
    for (const m of [74, 81, 86]) tone(ctx, o, at(CUE.fin), hz(m), 'sine', 0.004, 1.8, 0.14 * sfx, { rev: 0.8, del: 0.3 });
  }
  /* 母线：开头淡入、结尾淡出 */
  void DURATIONS;
}

/** 整体的淡入淡出放在母线上（和 scheduleScore 分开，因为在线时每个世代的起点不同） */
export function masterFades(ctx: BaseAudioContext, bus: Bus, from: number, when: number, level = LEVEL.master): void {
  const g = bus.master.gain;
  const at = (t: number) => when + (t - from);
  if (from < 1) {
    g.setValueAtTime(0.0001, at(0));
    g.linearRampToValueAtTime(level, at(0) + 1.5);
  } else g.setValueAtTime(level, when);
  g.setValueAtTime(level, at(TOTAL - 3));
  g.linearRampToValueAtTime(0.0001, at(TOTAL));
  void ctx;
}

/* ---------------- 离线渲染（检查用：把整段配乐渲染成缓冲区） ---------------- */
export async function renderOffline(sr = 44100): Promise<{ left: Float32Array; right: Float32Array; sampleRate: number }> {
  const ctx = new OfflineAudioContext(2, Math.ceil((TOTAL + 1.5) * sr), sr);
  const bus = createBus(ctx, ctx.destination);
  const ep = bus.epoch();
  masterFades(ctx, bus, 0, 0);
  scheduleScore(ctx, ep, 0, TOTAL + 2, 0);
  const buf = await ctx.startRendering();
  return { left: buf.getChannelData(0), right: buf.getChannelData(1), sampleRate: sr };
}

/* ---------------- 在线引擎：前瞻调度，跟着影片时间走 ---------------- */
export interface Engine {
  ctx: AudioContext;
  /** 每帧调用：影片时间 f、是否在自动播放。拖进度条 / 换幕 / 暂停 / 恢复都在这里被发现并重新排程 */
  sync(f: number, playing: boolean): void;
  /** 淡出并停下（暂停、后台标签页） */
  hush(): void;
  /** 当前输出电平（0..1 的 RMS），给测试看 */
  level(): number;
  /** 当前排程的起点（影片时间）和状态，给测试看 */
  info(): { anchorF: number; mode: string };
  dispose(): void;
}
export function createEngine(): Engine | null {
  const AC =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  let ctx: AudioContext;
  try {
    ctx = new AC({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.connect(ctx.destination);
  const bus = createBus(ctx, analyser);
  bus.master.gain.value = 0.0001;
  let ep: Epoch | null = null;
  let anchorCtx = 0; // 影片时间 anchorF 对应的 ctx 时间
  let anchorF = 0;
  let scheduledTo = 0;
  let mode: 'film' | 'pad' | 'off' = 'off';
  let timer = 0;
  const buf = new Float32Array(analyser.fftSize);

  const newEpoch = (f: number, m: 'film' | 'pad') => {
    const now = ctx.currentTime;
    if (ep) ep.kill(ctx, now);
    ep = bus.epoch();
    mode = m;
    anchorCtx = now + 0.06;
    anchorF = f;
    scheduledTo = f;
    const g = bus.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    if (m === 'film') {
      // 从当前影片时间淡入（不是从头）
      g.linearRampToValueAtTime(LEVEL.master, now + (f < 1 ? 1.6 : 0.5));
      masterFadeOut(f);
      scheduleScore(ctx, ep, f, f + 0.01, anchorCtx, { catchUp: true });
    } else {
      g.linearRampToValueAtTime(LEVEL.master, now + 0.6);
      scheduleScore(ctx, ep, f, f + 0.01, anchorCtx, { catchUp: true, padOnly: true });
    }
  };
  const masterFadeOut = (f: number) => {
    const g = bus.master.gain;
    const t = anchorCtx + (TOTAL - 3 - f);
    if (t > ctx.currentTime) {
      g.setValueAtTime(LEVEL.master, t);
      g.linearRampToValueAtTime(0.0001, t + 3);
    }
  };
  const pump = () => {
    if (mode !== 'film' || !ep || ctx.state !== 'running') return;
    const target = anchorF + (ctx.currentTime + 0.3 - anchorCtx);
    if (target > scheduledTo) {
      scheduleScore(ctx, ep, scheduledTo, Math.min(target, TOTAL + 2), anchorCtx + (scheduledTo - anchorF));
      scheduledTo = target;
    }
  };
  timer = window.setInterval(pump, 40);

  return {
    ctx,
    sync(f, playing) {
      // 手动擦洗、暂停时选择“直接静音”：配乐只在自动播放时响，擦洗时断断续续的和弦反而吵
      if (!playing) {
        this.hush();
        return;
      }
      if (ctx.state === 'suspended') void ctx.resume();
      const predicted = anchorF + (ctx.currentTime - anchorCtx);
      if (mode !== 'film' || Math.abs(predicted - f) > 0.25) newEpoch(f, 'film');
    },
    hush() {
      if (mode === 'off') return;
      mode = 'off';
      const now = ctx.currentTime;
      const g = bus.master.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(0.0001, g.value), now);
      g.linearRampToValueAtTime(0.0001, now + 0.3);
      if (ep) ep.kill(ctx, now + 0.3);
      ep = null;
      window.setTimeout(() => {
        if (mode === 'off' && ctx.state === 'running') void ctx.suspend();
      }, 380);
    },
    info() {
      return { anchorF, mode };
    },
    level() {
      analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (const x of buf) s += x * x;
      return Math.sqrt(s / buf.length);
    },
    dispose() {
      window.clearInterval(timer);
      mode = 'off';
      try {
        void ctx.close();
      } catch {
        /* 已经关了 */
      }
    },
  };
}
