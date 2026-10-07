import type { InjectionKey, Ref } from 'vue'

export interface ScCtx {
  /** Opt 挂载时调用，返回自己的序号（按出现顺序从 0 起） */
  registerOpt(): number
  picked: Ref<number>
  answered: Ref<boolean>
  guessed: Ref<boolean>
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
