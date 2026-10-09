import { describe, expect, it } from 'vitest'
import { DATA, DURATIONS, ERA_COLORS, MARKS, MEM_DROP, MOVERS, NODES, SCENE_COUNT, SECONDS_PER_SCREEN, STATIONS, TOTAL, depthOf, subtree } from '../../course/engine/logic/filmData.ts'
import { buildTracks } from '../../course/engine/logic/filmTracks.ts'
import { changeSpans, nextScene, prevScene, sceneOf, scrollOfTime, stopOf, timeOfScroll } from '../../course/engine/film.ts'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** 课程里真实存在的章 id（读 course/chapters/*.md 的 frontmatter） */
const chapterIds = (): string[] => {
  const dir = path.resolve(import.meta.dirname, '../../course/chapters')
  return readdirSync(dir).filter(f => f.endsWith('.md')).flatMap(f => (/^id:\s*(\S+)/m.exec(readFileSync(path.join(dir, f), 'utf8').split('---')[1] || '') || []).slice(1))
}

describe('首页短片的时间轴', () => {
  it('整片 45–60 秒，幕的起点是时长的累加', () => {
    expect(TOTAL).toBeGreaterThanOrEqual(45)
    expect(TOTAL).toBeLessThanOrEqual(60)
    expect(MARKS[0]).toBe(0)
    for (let i = 1; i < MARKS.length; i++) expect(MARKS[i]).toBeCloseTo(MARKS[i - 1] + DURATIONS[i - 1], 9)
    expect(MARKS[MARKS.length - 1] + DURATIONS[DURATIONS.length - 1]).toBeCloseTo(TOTAL, 9)
  })
  it('9 幕；每一幕至少 5 秒，够读完标题和说明', () => {
    expect(SCENE_COUNT).toBe(9)
    DURATIONS.forEach(d => expect(d).toBeGreaterThanOrEqual(5))
  })
  it('手动滚动的总长度约 9 个屏幕高', () => {
    expect(TOTAL / SECONDS_PER_SCREEN).toBeGreaterThan(8.5)
    expect(TOTAL / SECONDS_PER_SCREEN).toBeLessThan(10.5)
  })
  it('滚动位置和影片时间互为反函数，两端夹住', () => {
    for (const f of [0, 3.3, 20, 41.7, TOTAL]) expect(timeOfScroll(scrollOfTime(f, 5000), 5000)).toBeCloseTo(f, 9)
    expect(timeOfScroll(-10, 5000)).toBe(0)
    expect(timeOfScroll(9999, 5000)).toBe(TOTAL)
    expect(timeOfScroll(10, 0)).toBe(0)
  })
  it('sceneOf：按幕的起点分幕', () => {
    expect(sceneOf(0)).toBe(0)
    expect(sceneOf(MARKS[3] - 0.01)).toBe(2)
    expect(sceneOf(MARKS[3])).toBe(3)
    expect(sceneOf(TOTAL)).toBe(SCENE_COUNT - 1)
  })
})

describe('虚拟 DOM 树和响应式数据', () => {
  it('10 个节点：App → Header(Logo, Title)、List(Item ×2)、Footer(Hint, Counter)', () => {
    expect(NODES.map(n => n.id)).toEqual(['App', 'Header', 'List', 'Footer', 'Logo', 'Title', 'Item1', 'Item2', 'Hint', 'Counter'])
    expect(subtree('List')).toEqual(['List', 'Item1', 'Item2'])
    expect(depthOf('Counter')).toBe(2)
  })
  it('绑定了数据的是 Title、Item1、Item2、Counter，Logo 和 Hint 是纯静态', () => {
    expect(NODES.filter(n => n.dyn).map(n => n.id)).toEqual(['Title', 'Item1', 'Item2', 'Counter'])
    expect(DATA.flatMap(d => d.targets).sort()).toEqual(['Counter', 'Item1', 'Item2', 'Title'])
  })
  it('三份响应式数据：title、todos 是 ref，remaining 是 computed', () => {
    expect(DATA.map(d => `${d.id}:${d.kind}`)).toEqual(['title:ref', 'todos:ref', 'remaining:computed'])
  })
})

describe('收束幕的各站', () => {
  it('每一站链接的章都真实存在（章 id 取自 course/chapters）', () => {
    const ids = new Set(chapterIds())
    for (const s of STATIONS) for (const id of s.chapters) expect(ids.has(id), `${s.name} → ${id}`).toBe(true)
  })
  it('第 2 站标 2015（Vue 1.0），没有 2014；3.6 是候选版', () => {
    expect(STATIONS.some(s => s.year === '2014')).toBe(false)
    expect(STATIONS.find(s => s.note === 'Vue 1.0')?.year).toBe('2015')
    expect(STATIONS.find(s => s.name === 'Vapor')?.note).toMatch(/候选版/)
  })
})

describe('buildTracks', () => {
  for (const mobile of [false, true]) {
    const tracks = buildTracks(mobile)
    it(`${mobile ? '手机' : '桌面'}：每条轨道从 0 秒到结束，时间递增、都在 [0, 总时长] 里`, () => {
      expect(Object.keys(tracks).length).toBeGreaterThan(150)
      for (const [name, kfs] of Object.entries(tracks)) {
        expect(kfs[0].t, name).toBe(0)
        expect(kfs[kfs.length - 1].t, name).toBe(TOTAL)
        for (let i = 1; i < kfs.length; i++) expect(kfs[i].t, name).toBeGreaterThan(kfs[i - 1].t)
      }
    })
    it(`${mobile ? '手机' : '桌面'}：只动 transform、opacity 和 SVG 描边`, () => {
      const allowed = new Set(['t', 'easing', 'opacity', 'transform', 'strokeDashoffset', 'stroke'])
      for (const [name, kfs] of Object.entries(tracks)) for (const kf of kfs) for (const p of Object.keys(kf)) expect(allowed.has(p), `${name}.${p}`).toBe(true)
    })
  }
  const tracks = buildTracks(false)
  it('每幕的标题和说明（文字轨道）都在这一幕开始之后才出现、下一幕之前退场', () => {
    for (let i = 1; i <= 7; i++) {
      const kfs = tracks['cp-' + i]
      const on = kfs.filter(k => k.opacity === 1).map(k => k.t)
      expect(Math.min(...on)).toBeGreaterThanOrEqual(MARKS[i])
      expect(Math.max(...on)).toBeLessThanOrEqual(MARKS[i + 1])
    }
  })
  it('第 3 幕（Vue 2.0）：只有 Item1 和 Counter 被标出差别，只有它们的光束落到 DOM 层', () => {
    const inScene = (k: { t: number; opacity?: string | number }) => k.opacity === 1 && k.t > MARKS[3] && k.t < MARKS[4] + 0.5
    for (const id of ['Title', 'Item1', 'Item2', 'Counter']) {
      const beam = tracks['bm-' + id]
      expect(!!beam?.some(inScene), id).toBe(id === 'Item1' || id === 'Counter')
    }
  })
  it('第 4 幕（Vue 3.0）：静态节点（Logo、Hint）有“跳过”的盾，Item2 没有差别', () => {
    for (const id of ['Logo', 'Hint']) expect(tracks['sh-' + id].some(k => k.opacity === 0.95 && k.t > MARKS[4] && k.t < MARKS[5]), id).toBe(true)
    expect(tracks['fl-Item2']).toBeUndefined()
  })
  it('第 6 幕：computed 值没变，Counter 的块这一幕不会被更新', () => {
    const upd = tracks['bo-Counter'].some(k => k.opacity === 0.85 && k.t > MARKS[6] && k.t < MARKS[7])
    expect(upd).toBe(false)
  })
  it('第 7 幕（Vapor）：中间的虚拟 DOM 层退场，数据直接连到 DOM 块', () => {
    const pl2 = tracks.pl2.filter(k => k.t > MARKS[7] + 1.5 && k.t < MARKS[8])
    expect(pl2.every(k => k.opacity === 0)).toBe(true)
    for (const id of ['Item1', 'Item2', 'Counter']) expect(tracks['wv-' + id].some(k => k.opacity === 1 && k.t > MARKS[7]), id).toBe(true)
  })
  it('changeSpans：只有值真的在变的时间段', () => {
    expect(
      changeSpans([
        { t: 0, opacity: 0 },
        { t: 2, opacity: 0 },
        { t: 3, opacity: 1 },
        { t: 5, opacity: 1 },
        { t: 6, opacity: 0 },
        { t: 7, opacity: 0.5 }
      ])
    ).toEqual([
      [2, 3],
      [5, 7]
    ])
  })
})

describe('第二轮：时代主色、功能聚合、内存条', () => {
  it('每一幕一个主色；收束幕的第 i 站用第 i+1 幕的颜色，所以站数 = 讲解幕数', () => {
    expect(ERA_COLORS.length).toBe(SCENE_COUNT)
    expect(STATIONS.length).toBe(SCENE_COUNT - 2)
    expect(new Set(ERA_COLORS.slice(1, SCENE_COUNT - 1)).size).toBeGreaterThanOrEqual(6)
  })
  it('第 5 幕：五个小块（三份数据 + 两个方法），落点分属两个功能分组，数据的落点就是真正药丸的位置', () => {
    expect(MOVERS.map(m => m.id)).toEqual(['title', 'todos', 'remaining', 'addTodo', 'setTitle'])
    expect(MOVERS.filter(m => m.group === 'todos').length).toBe(3)
    for (const d of DATA) {
      const m = MOVERS.find(x => x.id === d.id)!
      expect([m.fx, m.fy]).toEqual([d.x, d.y])
    }
  })
  it('第 6 幕：内存条只用官方博客的数字（降低 56%），第二根条缩到 44%', () => {
    expect(MEM_DROP).toBe(0.56)
    const t = buildTracks(false)['mem-b']
    expect(t.some(k => k.transform === 'scaleX(0.44)')).toBe(true)
  })
  it('收束幕的时间轴、数字、按钮、页脚都有出现轨道；三层空间在收束时淡出', () => {
    const t = buildTracks(false)
    for (const sel of ['.fin-eyebrow', '.mk-in', '.fin-head .desc', '.stats3', '.fin-actions', '.foot']) expect(t[`css:[data-w=cp-8] ${sel}`], sel).toBeTruthy()
    expect(t['tl-draw']).toBeTruthy()
    for (const n of ['pl1', 'pl3', 'pl4']) expect(t[n].some(k => k.opacity === 0 && k.t > MARKS[8]), n).toBe(true)
  })
})

describe('一次一幕：每一幕的停稳点和步进', () => {
  it('停稳点在这一幕的文字退场之前（文字 M[i+1]-0.5 开始退场），收束幕是片尾，按幕严格递增', () => {
    for (let i = 0; i < SCENE_COUNT - 1; i++) {
      expect(sceneOf(stopOf(i))).toBe(i)
      expect(stopOf(i)).toBeLessThanOrEqual(MARKS[i + 1] - 0.5)
      if (i) expect(stopOf(i)).toBeGreaterThan(stopOf(i - 1))
    }
    expect(stopOf(SCENE_COUNT - 1)).toBe(TOTAL)
    expect(sceneOf(stopOf(SCENE_COUNT - 1))).toBe(SCENE_COUNT - 1)
  })
  it('往后：刚开始直接去第 1 幕；停在某幕的停稳点就是下一幕；幕中间先到本幕停稳点；片尾没有下一幕', () => {
    expect(nextScene(0)).toBe(1)
    expect(nextScene(stopOf(0))).toBe(1)
    expect(nextScene(stopOf(3))).toBe(4)
    expect(nextScene(MARKS[3] + 1)).toBe(3)
    expect(nextScene(TOTAL)).toBe(-1)
  })
  it('往前：停在某幕的停稳点就是上一幕；幕中间回到上一幕的停稳点；开场之前没有上一幕', () => {
    expect(prevScene(stopOf(3))).toBe(2)
    expect(prevScene(MARKS[3] + 1)).toBe(2)
    expect(prevScene(TOTAL)).toBe(SCENE_COUNT - 2)
    expect(prevScene(stopOf(0))).toBe(-1)
    expect(prevScene(0)).toBe(-1)
  })
})
