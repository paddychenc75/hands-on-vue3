import { describe, expect, it } from 'vitest'
import { CUE, MARKS, STATIONS, TOTAL, cueList } from '../../course/engine/logic/filmData.ts'
import { arcPoints, buildTracks, flyerTracks } from '../../course/engine/logic/filmTracks.ts'
import { analyze, encodeWav, powerSpectrum } from '../../course/engine/logic/scoreAnalysis.ts'

const dummy = () => ({
  a: [
    { x: 100, y: 200 },
    { x: 220, y: 260 },
    { x: 400, y: 300 }
  ] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }],
  aEnd: { x: 500, y: 100 },
  bStart: { x: 600, y: 300 },
  bEnd: { x: 300, y: 700 },
  cStart: { x: 640, y: 360 },
  li: Array.from({ length: STATIONS.length }, (_, i) => ({ x: 100 + i * 150, y: 300 + (i % 2) * 20 }))
})

describe('音效的时间点和画面关键帧对得上', () => {
  const tracks = { ...buildTracks(false), ...flyerTracks(dummy()) }
  it('每个音效时间点 ±50ms 内，对应的画面轨道上有关键帧', () => {
    for (const c of cueList()) {
      const kfs = tracks[c.track]
      expect(kfs, `${c.name} 没有轨道 ${c.track}`).toBeTruthy()
      const near = Math.min(...kfs.map(k => Math.abs(k.t - c.t)))
      expect(near, `${c.name}@${c.t.toFixed(2)} 距轨道 ${c.track} 最近的关键帧 ${near.toFixed(3)} 秒`).toBeLessThanOrEqual(0.05)
    }
  })
  it('音效时间点都在影片里，每一幕（第 1 幕起）至少一个声音设计', () => {
    const list = cueList()
    for (const c of list) {
      expect(c.t).toBeGreaterThanOrEqual(0)
      expect(c.t).toBeLessThan(TOTAL)
    }
    for (let i = 1; i < MARKS.length; i++) expect(list.some(c => c.t >= MARKS[i] - 0.1 && c.t < (MARKS[i + 1] ?? TOTAL) + 0.1), '第 ' + i + ' 幕').toBe(true)
    expect(CUE.group).toBeGreaterThan(CUE.gather)
  })
})

describe('过渡元素', () => {
  it('弧线的起点终点就是给定的两点', () => {
    const pts = arcPoints({ x: 0, y: 0 }, { x: 100, y: 50 })
    expect(pts[0]).toEqual({ x: 0, y: 0 })
    expect(pts[pts.length - 1].x).toBeCloseTo(100, 9)
    expect(pts[pts.length - 1].y).toBeCloseTo(50, 9)
  })
  it('收束幕各站各一条轨道，最后一站最先出现，其余依次拉出', () => {
    const t = flyerTracks(dummy())
    const n = STATIONS.length
    const starts = Array.from({ length: n }, (_, j) => (t[`css:[data-w="cp-8"] .eras li:nth-child(${j + 1})`].find(x => x.opacity === 1)?.t ?? 0))
    for (let j = 0; j < n - 1; j++) expect(starts[j]).toBeGreaterThan(starts[j + 1])
  })
  it('三个过渡元素都落在影片里，只动 transform 和 opacity', () => {
    const t = flyerTracks(dummy())
    for (const name of ['fly-a-0', 'fly-a-1', 'fly-a-2', 'fly-b', 'fly-b-ring', 'fly-c']) {
      expect(t[name], name).toBeTruthy()
      for (const kf of t[name]) for (const p of Object.keys(kf)) expect(['t', 'easing', 'opacity', 'transform'].includes(p), `${name}.${p}`).toBe(true)
    }
  })
})

describe('配乐分析', () => {
  const sr = 8000
  const tone = (f: number, sec: number, amp = 0.5) => Float32Array.from({ length: Math.floor(sr * sec) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / sr))
  it('峰值、削波、频段', () => {
    const l = tone(440, 60)
    const st = analyze(l, l, sr)
    expect(st.peak).toBeCloseTo(0.5, 2)
    expect(st.clipped).toBe(0)
    expect(st.nan).toBe(0)
    expect(st.bands['200-1k']).toBeGreaterThan(0.95)
    expect(st.stereoDiff).toBe(0)
    const hot = tone(440, 60, 1.2).map(x => Math.max(-1, Math.min(1, x)))
    expect(analyze(hot, hot, sr).clipped).toBeGreaterThan(1000)
  })
  it('立体声差异、静音检测', () => {
    const l = tone(440, 60)
    const r = tone(660, 60)
    expect(analyze(l, r, sr).stereoDiff).toBeGreaterThan(0.5)
    const quiet = new Float32Array(sr * 60)
    expect(analyze(quiet, quiet, sr).longestQuiet).toBeGreaterThan(40)
  })
  it('FFT：正弦波的能量落在对应的频点上', () => {
    const p = powerSpectrum(tone(1000, 0.5, 1).subarray(0, 1024))
    const k = p.indexOf(Math.max(...p))
    expect((k * sr) / 1024).toBeCloseTo(1000, -1)
  })
  it('WAV 头：16 位立体声', () => {
    const w = encodeWav(tone(440, 1), tone(440, 1), sr)
    expect(String.fromCharCode(...w.subarray(0, 4))).toBe('RIFF')
    expect(w.length).toBe(44 + sr * 4)
    expect(new DataView(w.buffer).getUint16(22, true)).toBe(2)
  })
})
