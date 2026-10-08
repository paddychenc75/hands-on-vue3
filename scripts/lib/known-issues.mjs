// 临时豁免：check:content 在现有内容里发现、但不在本次脚本改动范围内修的真实问题。
// key 对应 validate.mjs 里错误的 key。修好内容后，这一条会变成“豁免已失效”的错误，提醒你把它从这里删掉。
export const KNOWN_ISSUES = [
  // 首页“写作规则”表里的这三个术语，没有任何一章的“本章术语”块定义它们（章里只有“单文件组件”“函数式组件”等带限定词的组件）。
  // 修法二选一：在第 1 章或第 5 章的术语块里补“组件”“父组件”“子组件”；或者从 course/writing-terms.mjs 的 terms 里去掉。
  { key: 'wterm-missing:组件', why: '术语表里没有“组件”本身' },
  { key: 'wterm-missing:父组件', why: '术语表里没有“父组件”' },
  { key: 'wterm-missing:子组件', why: '术语表里没有“子组件”' },
];
