// 一次重排所有章的顺序和阶段（纯函数）。reorder-chapters.mjs 用它把“新顺序”算成 planRenumber 要的映射。
// 和逐章 move-chapter 相比：只扫一遍文件，所有章号同时映射，不会连环替换，也不用中间状态都能通过校验。

/**
 * @param chapters 现有章 [{ base, id, no, stage }]
 * @param plan     { order: [章 id…]（新顺序，必须恰好包含每一章一次）, stages?: { 章 id: 新阶段号 } }
 * @returns { errors: [文字], renumber: { 旧 base: 新章号 }, stages: { 旧 base: 新阶段号 }（只含阶段有变化的章）, table: [{ id, oldNo, newNo, oldStage, newStage }] }
 */
export function planReorder(chapters, plan, stageCount = 9) {
  const errors = [];
  const byId = new Map(chapters.map(c => [c.id, c]));
  const order = plan?.order;
  if (!Array.isArray(order)) return { errors: ['plan.order 必须是章 id 数组'], renumber: {}, stages: {}, table: [] };
  const seen = new Set();
  for (const id of order) {
    if (!byId.has(id)) errors.push(`order 里的 "${id}" 不是已有的章`);
    else if (seen.has(id)) errors.push(`order 里的 "${id}" 出现了两次`);
    seen.add(id);
  }
  for (const c of chapters) if (!seen.has(c.id)) errors.push(`order 漏了章 "${c.id}"`);
  const stagesOf = plan.stages || {};
  for (const [id, s] of Object.entries(stagesOf)) {
    if (!byId.has(id)) errors.push(`stages 里的 "${id}" 不是已有的章`);
    if (!Number.isInteger(s) || s < 1 || s > stageCount) errors.push(`stages 里 "${id}" 的阶段号必须是 1 到 ${stageCount} 的整数`);
  }
  if (errors.length) return { errors, renumber: {}, stages: {}, table: [] };
  const table = order.map((id, i) => {
    const c = byId.get(id);
    return { id, oldNo: c.no, newNo: i + 1, oldStage: c.stage, newStage: stagesOf[id] ?? c.stage };
  });
  for (let i = 1; i < table.length; i++)
    if (table[i].newStage < table[i - 1].newStage) errors.push(`${table[i].id}（阶段 ${table[i].newStage}）排在阶段 ${table[i - 1].newStage} 的 ${table[i - 1].id} 后面：同一阶段的章要连续，阶段从小到大`);
  const renumber = {};
  const stages = {};
  for (const t of table) {
    const c = byId.get(t.id);
    renumber[c.base] = t.newNo;
    if (t.newStage !== t.oldStage) stages[c.base] = t.newStage;
  }
  return { errors, renumber, stages, table };
}
