import type { ComputedRef, InjectionKey, Ref } from 'vue'

export interface ScCtx {
  /** Opt 挂载时调用，返回自己的序号（按出现顺序从 0 起） */
  registerOpt(): number
  /** 选中的选项（答错的那一项也算；还没选是 -1） */
  picked: Ref<number>
  /** 已答对（先猜题：已核对）。这时才显示对错和解析 */
  answered: Ref<boolean>
  /** 先猜题：已猜、还没核对 */
  guessed: Ref<boolean>
  /** 章内自测：答错了，正在等用户点“再答一次”。这时只标出选错的那一项，不亮正确答案 */
  wrong: Ref<boolean>
  /** 章内自测：重试时要隐藏的选项（上一次选错的那一项），没有是 -1 */
  hidden: Ref<number>
  /** 选项是否已锁定（答对、先猜题已核对、或答错等待重试） */
  locked: ComputedRef<boolean>
  correct: number
  pick(i: number): void
}
export const ScKey: InjectionKey<ScCtx> = Symbol('sc')

export interface LabCtx {
  id: string
  open(): void
  setPending(p: { text: string; check: () => void } | null): void
}
export const LabKey: InjectionKey<LabCtx> = Symbol('lab')
