/* 配乐的离线检查（纯函数，不碰 Web Audio）：给定渲染好的左右声道，量峰值、响度、削波、静音、立体声、各音效处的能量突起、频段占比，
 * 并编码成 16 位 WAV。只在测试钩子里（story.ts 的 __storyHook.render）才会被动态 import，访客不会加载。 */
import { DURATIONS, MARKS, TOTAL, cueList } from './filmData.ts';

export interface CueResult {
  name: string;
  t: number;
  ratio: number;
  ok: boolean;
}
export interface Stats {
  seconds: number;
  nan: number;
  peak: number;
  peakDb: number;
  rms: number;
  rmsDb: number;
  perScene: { scene: number; rmsDb: number; peakDb: number }[];
  clipped: number;
  longestQuiet: number;
  stereoDiff: number;
  cues: CueResult[];
  bands: Record<string, number>;
}
const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));

/** 简单的基 2 FFT（原地），返回功率谱的前 n/2 项 */
export function powerSpectrum(frame: Float32Array | number[]): Float64Array {
  const n = frame.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  const out = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = re[i] * re[i] + im[i] * im[i];
  return out;
}

export function analyze(left: Float32Array, right: Float32Array, sr: number): Stats {
  const n = Math.min(left.length, right.length);
  let nan = 0;
  let peak = 0;
  let sum2 = 0;
  let clipped = 0;
  let diff = 0;
  let mag = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i];
    const r = right[i];
    if (Number.isNaN(l) || Number.isNaN(r)) {
      nan++;
      continue;
    }
    const a = Math.max(Math.abs(l), Math.abs(r));
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
    sum2 += (l * l + r * r) / 2;
    diff += Math.abs(l - r);
    mag += Math.abs(l) + Math.abs(r);
  }
  const rms = Math.sqrt(sum2 / n);
  /** 20ms 窗的 RMS 包络（左右声道平均功率） */
  const win = Math.floor(sr * 0.02);
  const env: number[] = [];
  for (let s = 0; s + win <= n; s += win) {
    let e = 0;
    for (let i = s; i < s + win; i++) e += (left[i] * left[i] + right[i] * right[i]) / 2;
    env.push(Math.sqrt(e / win));
  }
  const at = (t: number) => Math.max(0, Math.min(env.length - 1, Math.floor(t / 0.02)));
  const meanEnv = (a: number, b: number) => {
    let s = 0;
    let c = 0;
    for (let i = at(a); i <= at(b); i++) {
      s += env[i];
      c++;
    }
    return c ? s / c : 0;
  };
  const perScene = DURATIONS.map((d, i) => {
    const a = Math.floor(MARKS[i] * sr);
    const b = Math.min(n, Math.floor((MARKS[i] + d) * sr));
    let e = 0;
    let p = 0;
    for (let k = a; k < b; k++) {
      e += (left[k] * left[k] + right[k] * right[k]) / 2;
      p = Math.max(p, Math.abs(left[k]), Math.abs(right[k]));
    }
    return { scene: i, rmsDb: db(Math.sqrt(e / Math.max(1, b - a))), peakDb: db(p) };
  });
  // 最长的静音（淡入的前 1.6 秒和淡出的最后 3 秒不算）
  let longestQuiet = 0;
  let run = 0;
  for (let i = at(1.6); i < at(TOTAL - 3); i++) {
    if (env[i] < 1e-3) {
      run++;
      longestQuiet = Math.max(longestQuiet, run * 0.02);
    } else run = 0;
  }
  // 每个音效的时间点上有没有能量突起：[t-0.05, t+0.12] 里的最大包络，比此前 0.4 秒的平均包络高多少
  const cues = cueList().map(c => {
    let m = 0;
    for (let i = at(c.t - 0.05); i <= at(c.t + 0.12); i++) m = Math.max(m, env[i]);
    const before = meanEnv(c.t - 0.5, c.t - 0.1) || 1e-6;
    const ratio = m / before;
    return { name: c.name, t: c.t, ratio: +ratio.toFixed(2), ok: ratio >= (c.soft ? 1.05 : 1.15) };
  });
  // 频段占比：每隔 0.75 秒取一帧 4096 点的 FFT，累加功率
  const N = 4096;
  const bands = { lt200: 0, '200-1k': 0, '1k-2k': 0, '2k-5k': 0, gt5k: 0 };
  const frame = new Float32Array(N);
  for (let s = 0; s + N < n; s += Math.floor(sr * 0.75)) {
    for (let i = 0; i < N; i++) frame[i] = (left[s + i] + right[s + i]) / 2;
    const p = powerSpectrum(frame);
    for (let k = 1; k < p.length; k++) {
      const f = (k * sr) / N;
      const key = f < 200 ? 'lt200' : f < 1000 ? '200-1k' : f < 2000 ? '1k-2k' : f < 5000 ? '2k-5k' : 'gt5k';
      bands[key] += p[k];
    }
  }
  const total = Object.values(bands).reduce((a, b) => a + b, 0) || 1;
  const frac: Record<string, number> = {};
  for (const [k, v] of Object.entries(bands)) frac[k] = +(v / total).toFixed(4);
  return {
    seconds: +(n / sr).toFixed(2),
    nan,
    peak,
    peakDb: +db(peak).toFixed(2),
    rms,
    rmsDb: +db(rms).toFixed(2),
    perScene: perScene.map(p => ({ ...p, rmsDb: +p.rmsDb.toFixed(1), peakDb: +p.peakDb.toFixed(1) })),
    clipped,
    longestQuiet: +longestQuiet.toFixed(2),
    stereoDiff: +(diff / Math.max(mag, 1e-9)).toFixed(4),
    cues,
    bands: frac,
  };
}

/** 16 位 PCM 立体声 WAV */
export function encodeWav(left: Float32Array, right: Float32Array, sr: number): Uint8Array {
  const n = Math.min(left.length, right.length);
  const out = new Uint8Array(44 + n * 4);
  const dv = new DataView(out.buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  dv.setUint32(4, 36 + n * 4, true);
  str(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * 4, true);
  dv.setUint16(32, 4, true);
  dv.setUint16(34, 16, true);
  str(36, 'data');
  dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, left[i])) * 32767, true);
    dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, right[i])) * 32767, true);
  }
  return out;
}

export function analyzeAndEncode(left: Float32Array, right: Float32Array, sr: number): { stats: Stats; wav: string } {
  const stats = analyze(left, right, sr);
  const bytes = encodeWav(left, right, sr);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { stats, wav: btoa(bin) };
}
