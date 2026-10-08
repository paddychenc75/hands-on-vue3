import { describe, expect, it } from 'vitest';
import { DAY } from '../../course/engine/logic/srs.ts';
import {
  COOLDOWN,
  PASS_PERCENT,
  RETEST_AFTER,
  STAGE_FRESH,
  STAGE_QUESTIONS,
  cooldownLeft,
  isPass,
  needsRetest,
  percent,
  pickStageQuestions,
  settlePending,
  settleResult,
} from '../../course/engine/logic/stageCheck.ts';
import { seeded } from '../../course/engine/logic/random.ts';
import { MIN, NOW, srsCard } from './fixtures.ts';

const cards = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ key: `${prefix}${i}` }));

describe('抽题：12 题 = 8 新 + 4 常规', () => {
  it('常量', () => {
    expect([STAGE_QUESTIONS, STAGE_FRESH, PASS_PERCENT]).toEqual([12, 8, 80]);
  });

  it('题够多时：共 12 题，其中 8 道是新题（阶段测验专用题），4 道是章内自测里见过的常规题', () => {
    const pool = cards('q', 30),
      fresh = cards('c', 20);
    const picks = pickStageQuestions(pool, fresh, {}, seeded('stage-1'));
    expect(picks).toHaveLength(12);
    expect(picks.filter(p => p.key.startsWith('c'))).toHaveLength(8);
    expect(picks.filter(p => p.key.startsWith('q'))).toHaveLength(4);
    expect(new Set(picks.map(p => p.key)).size).toBe(12);
  });

  it('新题里优先抽还没见过的（没有复习记录的）', () => {
    const pool = cards('q', 30),
      fresh = cards('c', 14);
    const seen = Object.fromEntries(fresh.slice(0, 6).map(c => [c.key, srsCard()]));
    for (let k = 0; k < 20; k++) {
      const picks = pickStageQuestions(pool, fresh, seen, seeded('stage-seen-' + k)).filter(p => p.key.startsWith('c'));
      // 未见过的 8 道正好填满 8 个名额，见过的 6 道一道也不会被抽到
      expect(picks.every(p => !seen[p.key])).toBe(true);
    }
  });

  it('新题不够 8 道：有几道用几道，其余用常规题补满 12 题', () => {
    const picks = pickStageQuestions(cards('q', 30), cards('c', 3), {}, seeded('stage-3'));
    expect(picks).toHaveLength(12);
    expect(picks.filter(p => p.key.startsWith('c'))).toHaveLength(3);
    expect(picks.filter(p => p.key.startsWith('q'))).toHaveLength(9);
  });

  it('题库太小时不会凑够 12 题（现有行为：没有重复题凑数）', () => {
    expect(pickStageQuestions(cards('q', 2), cards('c', 3), {}, seeded('stage-small'))).toHaveLength(5);
  });

  it('随机数固定时结果固定', () => {
    const a = pickStageQuestions(cards('q', 30), cards('c', 20), {}, () => 0.3);
    const b = pickStageQuestions(cards('q', 30), cards('c', 20), {}, () => 0.3);
    expect(a).toEqual(b);
  });
});

describe('及格判定：80%', () => {
  it('12 题答对 10 题（83%）通过，9 题（75%）不通过', () => {
    expect(percent(10, 12)).toBe(83);
    expect(isPass(percent(10, 12))).toBe(true);
    expect(percent(9, 12)).toBe(75);
    expect(isPass(percent(9, 12))).toBe(false);
  });
  it('正好 80% 算通过，79 不算', () => {
    expect(isPass(80)).toBe(true);
    expect(isPass(79)).toBe(false);
    expect(percent(4, 5)).toBe(80);
  });
});

describe('未通过的 30 分钟冷却', () => {
  it('冷却时间是 30 分钟', () => {
    expect(COOLDOWN).toBe(30 * MIN);
  });
  it('刚失败：还要等 30 分钟；过了一部分：只等剩下的', () => {
    expect(cooldownLeft({ failedAt: NOW }, NOW)).toBe(30 * MIN);
    expect(cooldownLeft({ failedAt: NOW - 10 * MIN }, NOW)).toBe(20 * MIN);
  });
  it('满 30 分钟或之后：不再冷却', () => {
    expect(cooldownLeft({ failedAt: NOW - 30 * MIN }, NOW)).toBe(0);
    expect(cooldownLeft({ failedAt: NOW - 3 * DAY }, NOW)).toBe(0);
  });
  it('没有失败记录、或者以最近一次为准已经通过：不冷却', () => {
    expect(cooldownLeft({}, NOW)).toBe(0);
    expect(cooldownLeft({ failedAt: NOW, passed: true }, NOW)).toBe(0);
  });
});

describe('35 天后提示复测', () => {
  it('RETEST_AFTER 是 35 天', () => {
    expect(RETEST_AFTER).toBe(35 * DAY);
  });
  it('通过后超过 35 天才提示（刚好 35 天不提示）', () => {
    expect(needsRetest({ passed: true, passedAt: NOW - 35 * DAY }, NOW)).toBe(false);
    expect(needsRetest({ passed: true, passedAt: NOW - 35 * DAY - 1 }, NOW)).toBe(true);
    expect(needsRetest({ passed: true, passedAt: NOW - DAY }, NOW)).toBe(false);
  });
  it('没通过、或没有通过时间：不提示', () => {
    expect(needsRetest({ passed: false, passedAt: NOW - 90 * DAY }, NOW)).toBe(false);
    expect(needsRetest({ passed: true }, NOW)).toBe(false);
  });
});

describe('中途离开算未通过', () => {
  it('按已答的题计分，没答的算错，记为未通过并开始冷却', () => {
    const rec = settlePending({ best: 90, passed: true, passedAt: NOW - DAY, pending: { n: 12, answered: 5, right: 4, at: NOW - 5 * MIN, weak: ['refs'] } });
    expect(rec.pending).toBeUndefined();
    expect(rec.last).toBe(33);
    expect(rec.passed).toBe(false);
    expect(rec.failedAt).toBe(NOW - 5 * MIN);
    expect(rec.weak).toEqual(['refs']);
    expect(rec.best).toBe(90);
    expect(cooldownLeft(rec, NOW)).toBe(25 * MIN);
  });
  it('pending 里没有 weak 时记为空数组', () => {
    expect(settlePending({ pending: { n: 12, answered: 1, right: 1, at: NOW, weak: undefined } }).weak).toEqual([]);
  });
  it('不改传入的记录', () => {
    const rec = { pending: { n: 12, answered: 1, right: 1, at: NOW, weak: [] } };
    settlePending(rec);
    expect(rec.pending).toBeDefined();
  });
});

describe('交卷后的记录（以最近一次为准）', () => {
  it('通过：记 passed 和 passedAt，清掉 failedAt，best 取最大值', () => {
    const rec = settleResult({ best: 70, failedAt: NOW - MIN, passed: false, pending: { n: 12, answered: 11, right: 9, at: NOW, weak: [] } }, 83, [], NOW);
    expect(rec).toMatchObject({ passed: true, passedAt: NOW, best: 83, last: 83 });
    expect(rec.failedAt).toBeUndefined();
    expect(rec.pending).toBeUndefined();
  });
  it('通过：清掉之前未通过留下的 weak；没通过时仍然写入新的 weak', () => {
    const passed = settleResult({ passed: false, failedAt: NOW - MIN, weak: ['refs', 'computed'] }, 92, ['template'], NOW);
    expect(passed.weak).toBeUndefined();
    const failed = settleResult({ weak: ['refs'] }, 40, ['template'], NOW);
    expect(failed.weak).toEqual(['template']);
  });
  it('没通过：记 failedAt 和需要加强的章，开始冷却', () => {
    const rec = settleResult({}, 58, ['refs', 'computed'], NOW);
    expect(rec).toMatchObject({ passed: false, failedAt: NOW, weak: ['refs', 'computed'], best: 58, last: 58 });
    expect(cooldownLeft(rec, NOW)).toBe(30 * MIN);
  });
  it('通过过、后来没通过：以最近一次为准，passed 变回 false；best 保留最高分', () => {
    const rec = settleResult({ passed: true, passedAt: NOW - 40 * DAY, best: 92, last: 92 }, 50, ['template'], NOW);
    expect(rec.passed).toBe(false);
    expect(rec.best).toBe(92);
    expect(rec.last).toBe(50);
  });
});

import { daysSincePass, pendingRecord, stageStatus, uniqueInOrder } from '../../course/engine/logic/stageCheck.ts';
import { DAY as DAY2 } from '../../course/engine/logic/srs.ts';

describe('需要加强的章：去重并保持出现顺序', () => {
  it('答错的题可能来自同一章，只列一次', () => {
    expect(uniqueInOrder(['refs', 'computed', 'refs', 'comm', 'computed'])).toEqual(['refs', 'computed', 'comm']);
    expect(uniqueInOrder([])).toEqual([]);
  });
});

describe('中途离开时留下的记录', () => {
  it('记下题数、已答数、答对数、时间和需要加强的章', () => {
    expect(pendingRecord(12, 5, 3, ['refs', 'refs', 'comm'], NOW)).toEqual({ n: 12, answered: 5, right: 3, at: NOW, weak: ['refs', 'comm'] });
  });
  it('交给 settlePending 结算：没答的算错，记为未通过', () => {
    const rec = settlePending({ pending: pendingRecord(12, 5, 3, ['refs'], NOW) });
    expect(rec).toMatchObject({ last: 25, passed: false, failedAt: NOW, weak: ['refs'] });
    expect(rec.pending).toBeUndefined();
  });
});

describe('阶段测验的状态（侧边栏和首页显示）', () => {
  it('没有记录：none', () => {
    expect(stageStatus(undefined, NOW)).toBe('none');
    expect(stageStatus({}, NOW)).toBe('none');
  });
  it('通过了：passed；通过超过 35 天：retest', () => {
    expect(stageStatus({ passed: true, passedAt: NOW - DAY2 }, NOW)).toBe('passed');
    expect(stageStatus({ passed: true, passedAt: NOW - 36 * DAY2 }, NOW)).toBe('retest');
  });
  it('没通过：30 分钟内是 cooling，之后是 failed', () => {
    expect(stageStatus({ passed: false, failedAt: NOW - 10 * MIN, last: 50 }, NOW)).toBe('cooling');
    expect(stageStatus({ passed: false, failedAt: NOW - 31 * MIN, last: 50 }, NOW)).toBe('failed');
  });
  it('还有没结算的 pending：按 failed 看（进入页面时才会结算成未通过）', () => {
    expect(stageStatus({ pending: pendingRecord(12, 2, 1, [], NOW - 5 * DAY2) }, NOW)).toBe('failed');
  });
});

describe('通过多少天了', () => {
  it('向下取整', () => {
    expect(daysSincePass({ passed: true, passedAt: NOW - 40.7 * DAY2 }, NOW)).toBe(40);
    expect(daysSincePass({}, NOW)).toBe(0);
  });
});
