import { describe, expect, it } from 'vitest';
import { seeded, shuffled } from '../../course/engine/logic/random.ts';

describe('选项打乱的种子随机', () => {
  it('同一个字符串每次得到同一串随机数（预测题的选项顺序固定）', () => {
    const a = seeded('refs|解构后的 count'),
      b = seeded('refs|解构后的 count');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('固定种子给出固定的值', () => {
    const r = seeded('abc');
    expect([r(), r(), r()]).toEqual([0.5166419988963753, 0.6596221292857081, 0.0018796597141772509]);
  });
  it('不同的字符串得到不同的序列', () => {
    expect(seeded('abc')()).not.toBe(seeded('abd')());
  });
  it('值在 [0, 1) 里', () => {
    const r = seeded('range');
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffled 洗牌', () => {
  it('结果是 0..n-1 的一个排列', () => {
    for (const n of [0, 1, 2, 4, 10]) expect([...shuffled(n, seeded('perm' + n))].sort((a, b) => a - b)).toEqual([...Array(n).keys()]);
  });
  it('随机数固定时结果固定', () => {
    expect(shuffled(5, () => 0)).toEqual([1, 2, 3, 4, 0]);
    expect(shuffled(5, () => 0.999)).toEqual([0, 1, 2, 3, 4]);
  });
  it('用种子随机洗牌：同一道题每次的选项顺序相同', () => {
    expect(shuffled(4, seeded('x|y'))).toEqual(shuffled(4, seeded('x|y')));
  });
});
