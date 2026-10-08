// 第 20 章实验台和正文共用的 useListbox（第一层：状态与行为，不含任何标记）
import { computed, ref, toValue, useId, type MaybeRefOrGetter } from 'vue'

export interface ListboxOption { value: string; label: string; disabled?: boolean }

export interface UseListboxOptions {
  options: MaybeRefOrGetter<ListboxOption[]>
  /** 传了（不是 undefined）就是受控：选中值由调用方持有。null 表示"受控，但没选" */
  modelValue?: MaybeRefOrGetter<string | null | undefined>
  /** 非受控时的初始值 */
  defaultValue?: string | null
  onChange?: (value: string) => void
  orientation?: 'vertical' | 'horizontal'
}

export function useListbox(opts: UseListboxOptions) {
  const id = useId()
  const inner = ref<string | null>(opts.defaultValue ?? null)
  const isControlled = () => toValue(opts.modelValue) !== undefined
  const selected = computed(() => (isControlled() ? toValue(opts.modelValue) : inner.value) ?? null)
  const active = ref(-1)
  const list = () => toValue(opts.options)
  const optId = (i: number) => `${id}-opt-${i}`

  function select(i: number) {
    const o = list()[i]
    if (!o || o.disabled) return
    if (!isControlled()) inner.value = o.value
    opts.onChange?.(o.value)
  }
  // 从 from 出发，朝 step 方向找下一个可用项；到头就停在原地
  function move(from: number, step: 1 | -1) {
    const l = list()
    let i = from
    do i += step
    while (i >= 0 && i < l.length && l[i].disabled)
    return i >= 0 && i < l.length ? i : from
  }
  function onKeydown(e: KeyboardEvent) {
    const [prev, next] = opts.orientation === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
    if (e.key === next) active.value = move(active.value, 1)
    else if (e.key === prev) active.value = move(active.value, -1)
    else if (e.key === 'Home') active.value = move(-1, 1)
    else if (e.key === 'End') active.value = move(list().length, -1)
    else if (e.key === 'Enter' || e.key === ' ') select(active.value)
    else return
    e.preventDefault() // 方向键、空格不要让页面滚动
  }
  function onFocus() {
    if (active.value >= 0) return
    const at = list().findIndex(o => o.value === selected.value)
    active.value = at >= 0 ? at : move(-1, 1)
  }

  const listboxProps = computed(() => ({
    id, role: 'listbox', tabindex: 0,
    'aria-orientation': opts.orientation ?? 'vertical',
    'aria-activedescendant': active.value >= 0 ? optId(active.value) : undefined,
    onKeydown, onFocus
  }))
  function optionProps(i: number) {
    const o = list()[i]
    return {
      id: optId(i), role: 'option',
      'aria-selected': o.value === selected.value,
      'aria-disabled': o.disabled || undefined,
      'data-active': active.value === i || undefined,
      onClick: () => { if (o.disabled) return; active.value = i; select(i) }
    }
  }
  return { selected, active, listboxProps, optionProps, select }
}
