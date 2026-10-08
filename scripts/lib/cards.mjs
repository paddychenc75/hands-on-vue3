// 复习卡片键快照的计算与比较（纯函数）。规则和 hands-on-react 完全一致：
//   章内自测第 N 题（从 0 起，不含先猜）的键是 `章id#N`；阶段测验专用题（checks/questions.ts 里属于这一章的第 N 道）是 `章id#cN`。
//   指纹 = 题干文字的 sha1 前 8 位。先猜题的键是实验台 id（进度里 __pred 用）。
import { createHash } from 'node:crypto';

export const fingerprint = text => createHash('sha1').update(String(text).trim()).digest('hex').slice(0, 8);

export const SNAPSHOT_NOTE =
  '复习卡片键快照，由 npm run check:content -- --update 生成，不要手改。键 = 章id#N（章内自测第 N 题，不含先猜）或 章id#cN（阶段测验专用题，N 是这一章的第几道）；值 = 题干文字的指纹。已有的键不能消失、不能换位置，新题只能追加在每章自测题和 checks/questions.ts 的末尾。predictions 是先猜题所在的实验台 id（进度里 __pred 用），不能消失。';

/**
 * chapters: 按章号排好的 [{ id, stems: [自测题干…], predictLabs: [实验台 id…] }]
 * questions: checks/questions.ts 的 Q（每行 [题干, 选项, 解析, 章id, 代码?]）
 * 返回 { cards: { 键: 指纹 }, predictions: [实验台 id] }
 */
export function computeCards(chapters, questions) {
  const cards = {};
  for (const c of chapters) {
    c.stems.forEach((stem, i) => {
      cards[`${c.id}#${i}`] = fingerprint(stem);
    });
    let n = 0;
    for (const row of questions) if (row[3] === c.id) cards[`${c.id}#c${n++}`] = fingerprint(row[0]);
  }
  const predictions = chapters.flatMap(c => c.predictLabs);
  return { cards, predictions };
}

/** 对照快照。返回 { problems: [消息], added: [新卡片键], addedPred: [新预测键] } */
export function compareSnapshot(snap, current) {
  const problems = [];
  for (const [key, fp] of Object.entries(snap.cards || {})) {
    const id = key.split('#')[0];
    const field = key.split('#')[1]?.startsWith('c') ? 'checks/questions.ts 里这一章的专用题' : '章内自测';
    if (!(key in current.cards)) {
      problems.push(`${key} 消失了（${id} 的${field}里没有这一题了）。学习者记录里的这张卡片会对不上。恢复这道题，不要删中间的题。`);
    } else if (current.cards[key] !== fp) {
      const movedFrom = Object.entries(snap.cards).find(([k2, f2]) => k2 !== key && f2 === current.cards[key])?.[0];
      if (movedFrom) {
        problems.push(`${key} 现在放的是原来 ${movedFrom} 的题：题的顺序被调换或移动了。把它们放回原来的位置；新题只能追加到${field}的末尾。`);
      } else {
        problems.push(
          `${key} 的题干变了（指纹 ${fp} → ${current.cards[key]}）。是不是调换了顺序或换了题？${field}的顺序不能动，新题追加到末尾。如果只是改错别字，运行 npm run check:content -- --update --force。`,
        );
      }
    }
  }
  for (const p of snap.predictions || []) {
    if (!current.predictions.includes(p)) problems.push(`先猜题 ${p} 消失了：实验台被删了、id 改了，或实验台不再有 #predict 先猜题。学习者的预测记录会对不上。`);
  }
  const added = Object.keys(current.cards).filter(k => !(k in (snap.cards || {})));
  const addedPred = current.predictions.filter(p => !(snap.predictions || []).includes(p));
  return { problems, added, addedPred };
}

/**
 * 生成要写进文件的快照对象。force 为真时已有键也用新指纹；否则只追加新键。
 * 键的顺序保持快照里原来的顺序，新键追加在后面：移动章的位置时，git diff 里已有条目不会跟着挪动，只看得到新增。
 */
export function nextSnapshot(snap, current, { force = false } = {}) {
  const old = snap?.cards || {};
  const keep = Object.keys(old).filter(k => k in current.cards);
  const fresh = Object.keys(current.cards).filter(k => !(k in old));
  const cards = Object.fromEntries([...keep, ...fresh].map(k => [k, force || !(k in old) ? current.cards[k] : old[k]]));
  const oldPred = (snap?.predictions || []).filter(p => !force || current.predictions.includes(p));
  const predictions = [...oldPred, ...current.predictions.filter(p => !oldPred.includes(p))];
  return { 说明: SNAPSHOT_NOTE, cards, predictions };
}
