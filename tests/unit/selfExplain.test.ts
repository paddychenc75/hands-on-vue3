import { describe, expect, it } from 'vitest';
import { SELF_EXPLAIN_MIN, effectiveLength } from '../../course/engine/logic/selfExplain.ts';

describe('自我解释的有效字数', () => {
  it('至少 30 个有效字', () => {
    expect(SELF_EXPLAIN_MIN).toBe(30);
  });

  it('空白和标点不算字', () => {
    expect(effectiveLength('a b, c！ d。')).toBe(4);
    expect(effectiveLength('  \n\t ')).toBe(0);
    expect(effectiveLength('')).toBe(0);
  });

  it('符号（\\p{S}）也不算字', () => {
    expect(effectiveLength('1+2=3 $ ^ ~')).toBe(3);
  });

  it('连续重复的字折叠成一个：用"啊啊啊"凑数没用', () => {
    expect(effectiveLength('啊'.repeat(40))).toBe(1);
    expect(effectiveLength('好好好好学学学习习')).toBe(3);
  });

  it('不同字少于 10 个：有效字数被压低到最多 9（即使没有连续重复）', () => {
    expect(effectiveLength('ab'.repeat(40))).toBe(9);
    expect(effectiveLength('abcd'.repeat(30))).toBe(9);
    expect(effectiveLength('abc')).toBe(3);
  });

  it('不同字正好 10 个：不再压低，按折叠后的长度算', () => {
    expect(effectiveLength('abcdefghij')).toBe(10);
    expect(effectiveLength('abcdefghij'.repeat(4))).toBe(40);
  });

  it('认真写一两句话，能达到 30 个有效字', () => {
    const text = 'ref 把值包成响应式对象：读写要经过 .value，模板里会自动解包，解构 reactive 会丢失连接。';
    expect(effectiveLength(text)).toBeGreaterThanOrEqual(SELF_EXPLAIN_MIN);
  });

  it('差一个字：29 个不够，30 个够', () => {
    const base = 'abcdefghijklmnopqrstuvwxyz1234';
    expect(effectiveLength(base.slice(0, 29))).toBe(29);
    expect(effectiveLength(base)).toBe(30);
    expect(effectiveLength(base) >= SELF_EXPLAIN_MIN).toBe(true);
  });
});

import { selfExplainState } from '../../course/engine/logic/selfExplain.ts';

describe('自我解释区域的状态', () => {
  const long = '组件的状态改变以后页面会自动更新因为响应式系统会收集依赖并在数据变化时触发更新所以不用手动改节点';
  it('什么也没写：还差 30 个字，没展开', () => {
    expect(selfExplainState('', undefined)).toEqual({ len: 0, remain: 30, unlocked: false });
    expect(selfExplainState(undefined, false).remain).toBe(30);
  });
  it('凑字不算：连续重复的字折叠，还是没展开', () => {
    const s = selfExplainState('啊'.repeat(40), false);
    expect(s.unlocked).toBe(false);
    expect(s.remain).toBe(29);
  });
  it('写够 30 个有效字：展开', () => {
    const s = selfExplainState(long, false);
    expect(s.len).toBeGreaterThanOrEqual(30);
    expect(s).toMatchObject({ remain: 0, unlocked: true });
  });
  it('点过对照（sx）：即使之后删短了也保持展开', () => {
    expect(selfExplainState('短', true).unlocked).toBe(true);
  });
});
