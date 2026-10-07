// diff 模拟器的算法部分（旧版 vue3-course.html 第 9059-9181 行）：getSequence 和 simulate，逻辑原样搬来。
export interface Step { op: string; key: string; phase: string; text: string }
export interface SimInfo { range?: string; n2o?: string; lis?: string }
export interface Sim { steps: Step[]; info: SimInfo }

export function getSequence(arr: number[]): number[] {
  const p = arr.slice(), result = [0]
  let i: number, j: number, u: number, v: number, c: number
  const len = arr.length
  for (i = 0; i < len; i++) {
    const cur = arr[i]
    if (cur !== 0) {
      j = result[result.length - 1]
      if (arr[j] < cur) { p[i] = j; result.push(i); continue }
      u = 0; v = result.length - 1
      while (u < v) { c = (u + v) >> 1; if (arr[result[c]] < cur) u = c + 1; else v = c }
      if (cur < arr[result[u]]) { if (u > 0) p[i] = result[u - 1]; result[u] = i }
    }
  }
  u = result.length; v = result[u - 1]
  while (u-- > 0) { result[u] = v; v = p[v] }
  return result
}

export function simulate(c1: string[], c2: string[]): Sim {
  const steps: Step[] = []
  const info: SimInfo = {}
  let i = 0, e1 = c1.length - 1, e2 = c2.length - 1
  while (i <= e1 && i <= e2 && c1[i] === c2[i]) { steps.push({ op: 'patch', key: c1[i], phase: '① 头部同步', text: 'patch ' + c1[i] + '（头部 key 相同）' }); i++ }
  while (i <= e1 && i <= e2 && c1[e1] === c2[e2]) { steps.push({ op: 'patch', key: c1[e1], phase: '② 尾部同步', text: 'patch ' + c1[e1] + '（尾部 key 相同）' }); e1--; e2-- }
  if (i > e1) {
    for (let k = i; k <= e2; k++) steps.push({ op: 'mount', key: c2[k], phase: '③ 仅剩新增', text: 'mount ' + c2[k] + ' 插入到 ' + (c2[e2 + 1] || '末尾') + ' 之前' })
  } else if (i > e2) {
    for (let k = i; k <= e1; k++) steps.push({ op: 'unmount', key: c1[k], phase: '④ 仅剩删除', text: 'unmount ' + c1[k] })
  } else {
    const s1 = i, s2 = i, keyToNew = new Map<string, number>()
    for (let k = s2; k <= e2; k++) keyToNew.set(c2[k], k)
    const toBePatched = e2 - s2 + 1
    const n2o: number[] = new Array(toBePatched).fill(0)
    let moved = false, maxSoFar = 0
    for (let k = s1; k <= e1; k++) {
      const ni = keyToNew.get(c1[k])
      if (ni === undefined) steps.push({ op: 'unmount', key: c1[k], phase: '⑤ 乱序区：遍历旧节点', text: 'unmount ' + c1[k] + '（新列表中不存在）' })
      else {
        n2o[ni - s2] = k + 1
        if (ni >= maxSoFar) maxSoFar = ni; else moved = true
        steps.push({ op: 'patch', key: c1[k], phase: '⑤ 乱序区：遍历旧节点', text: 'patch ' + c1[k] + '，newIndexToOldIndex[' + (ni - s2) + '] = ' + (k + 1) + (ni < maxSoFar ? '，检测到逆序 → moved = true' : '') })
      }
    }
    const seq = moved ? getSequence(n2o) : []
    info.range = '旧 [' + s1 + '..' + e1 + ']，新 [' + s2 + '..' + e2 + ']'
    info.n2o = '[' + n2o.join(', ') + ']（0 表示新节点，值为旧索引 + 1）'
    info.lis = moved ? '下标 [' + seq.join(', ') + '] → 稳定节点 ' + seq.map(x => c2[s2 + x]).join(' ') : '无逆序，不需要移动'
    let j = seq.length - 1
    for (let x = toBePatched - 1; x >= 0; x--) {
      const ni = s2 + x, anchor = c2[ni + 1] || '末尾'
      if (n2o[x] === 0) steps.push({ op: 'mount', key: c2[ni], phase: '⑤ 乱序区：倒序处理', text: 'mount ' + c2[ni] + ' 插入到 ' + anchor + ' 之前' })
      else if (moved) {
        if (j < 0 || x !== seq[j]) steps.push({ op: 'move', key: c2[ni], phase: '⑤ 乱序区：倒序处理', text: 'move ' + c2[ni] + ' 到 ' + anchor + ' 之前（不在 LIS 中）' })
        else { steps.push({ op: 'stay', key: c2[ni], phase: '⑤ 乱序区：倒序处理', text: c2[ni] + ' 在 LIS 中，原地不动' }); j-- }
      }
    }
  }
  return { steps, info }
}
