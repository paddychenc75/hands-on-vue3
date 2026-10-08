// 实验台用的迷你表单库：第 32 章正文的 useForm / useField。
// 和 vee-validate、TanStack Form 等库相比，这里只保留设计上的关键决定，没有处理 IME、文件输入、嵌套 schema 的异步等细节。
import {
  reactive, ref, shallowRef, shallowReactive, computed, watch, toRaw, provide, inject,
  toValue, onScopeDispose
} from 'vue'

// ---------- 路径读写 ----------
const parse = p => p.split(/[.\[\]]/).filter(Boolean)
export const getPath = (obj, path) => parse(path).reduce((o, k) => o?.[k], obj)
export function setPath(obj, path, value) {
  const keys = parse(path)
  const last = keys.pop()
  let cur = obj
  keys.forEach((k, i) => {
    if (cur[k] == null) cur[k] = /^\d+$/.test(keys[i + 1] ?? last) ? [] : {}
    cur = cur[k]
  })
  cur[last] = value
}

const clone = v => structuredClone(toRaw(v))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const FORM = Symbol('form')

// ---------- 表单 ----------
export function useForm({ initialValues, schema, onSubmit }) {
  const initial = shallowRef(clone(initialValues))
  const values = reactive(clone(initialValues))
  const touched = reactive({})
  const asyncErrors = reactive({})
  const serverErrors = reactive({})
  const validating = reactive({})
  const submitCount = ref(0)
  const isSubmitting = ref(false)
  const fields = shallowReactive(new Map())

  const schemaErrors = computed(() => (schema ? schema(values) : {}))
  const errorOf = p => {
    const f = fields.get(p)
    return (f && f.syncError.value) || schemaErrors.value[p] || asyncErrors[p] || serverErrors[p] || ''
  }
  const isDirty = p => !same(p ? getPath(values, p) : values, p ? getPath(initial.value, p) : initial.value)
  const dirty = computed(() => isDirty())
  const isValid = computed(
    () => [...fields.keys()].every(p => !errorOf(p) && !validating[p]) && Object.keys(schemaErrors.value).length === 0
  )

  function register(path, meta) { fields.set(path, meta) }
  function unregister(path, meta) { if (fields.get(path) === meta) fields.delete(path) }

  function reset(next) {
    if (next) initial.value = clone(next)
    Object.keys(values).forEach(k => delete values[k])
    Object.assign(values, clone(initial.value))
    for (const s of [touched, asyncErrors, serverErrors]) Object.keys(s).forEach(k => delete s[k])
    submitCount.value = 0
  }

  // 数组操作：改完数组，把按路径存的状态也搬到新的下标上
  function remap(arr, mapIndex) {
    const re = new RegExp('^' + arr.replace(/[.\[\]]/g, '\\$&') + '\\[(\\d+)\\]')
    for (const store of [touched, asyncErrors, serverErrors]) {
      const moved = {}
      for (const key of Object.keys(store)) {
        const m = key.match(re)
        if (!m) continue
        const val = store[key]
        delete store[key]
        const j = mapIndex(+m[1])
        if (j != null) moved[key.replace(re, `${arr}[${j}]`)] = val
      }
      Object.assign(store, moved)
    }
  }
  const array = path => ({
    insert(i, item) {
      getPath(values, path).splice(i, 0, item)
      remap(path, j => (j >= i ? j + 1 : j))
    },
    remove(i) {
      getPath(values, path).splice(i, 1)
      remap(path, j => (j === i ? null : j > i ? j - 1 : j))
    },
    move(from, to) {
      const list = getPath(values, path)
      list.splice(to, 0, list.splice(from, 1)[0])
      remap(path, j => {
        if (j === from) return to
        if (from < to) return j > from && j <= to ? j - 1 : j
        return j >= to && j < from ? j + 1 : j
      })
    }
  })

  function setErrors(map) {
    Object.keys(serverErrors).forEach(k => delete serverErrors[k])
    Object.assign(serverErrors, map)
  }
  function focusFirstError() {
    const bad = [...fields.entries()].filter(([p, f]) => errorOf(p) && f.el)
    bad.sort((a, b) => (a[1].el.compareDocumentPosition(b[1].el) & 4 ? -1 : 1))
    bad[0]?.[1].el.focus()
  }

  async function submit() {
    if (isSubmitting.value) return
    isSubmitting.value = true
    submitCount.value++
    try {
      await Promise.all([...fields.values()].map(f => f.flush()))
      if (!isValid.value) return focusFirstError()
      await onSubmit(clone(values))
    } catch (e) {
      if (!e.fieldErrors) throw e
      setErrors(e.fieldErrors)
      focusFirstError()
    } finally {
      isSubmitting.value = false
    }
  }

  const form = {
    values, initial, touched, validating, asyncErrors, serverErrors, submitCount, isSubmitting, fields,
    errorOf, isDirty, dirty, isValid, register, unregister, reset, array, setErrors, submit
  }
  provide(FORM, form)
  return form
}

// ---------- 字段 ----------
export const useFormContext = () => inject(FORM)

export function useField(name, { rules = [], asyncRules = [], delay = 300, clearOnUnmount = false }: any = {}) {
  const form = inject(FORM)
  if (!form) throw new Error('useField 必须在 useForm 的后代组件里调用')
  const path = () => toValue(name)

  const value = computed({
    get: () => getPath(form.values, path()),
    set: v => setPath(form.values, path(), v)
  })
  const syncError = computed(() => {
    for (const rule of rules) {
      const msg = rule(value.value, form.values)
      if (msg) return msg
    }
    return ''
  })

  // 异步校验：每次调用领一个序号，只有最新的一次可以写结果
  let seq = 0, timer, ctrl, checked
  const meta = { syncError, el: null, flush }
  function cancel() { checked = undefined; seq++; clearTimeout(timer); ctrl?.abort(); delete form.validating[path()] }
  async function flush() {
    clearTimeout(timer)
    if (!asyncRules.length || syncError.value || checked === value.value) return
    const id = ++seq
    const p = path()
    ctrl?.abort()
    ctrl = new AbortController()
    form.validating[p] = true
    let msg = ''
    try {
      for (const rule of asyncRules) {
        msg = (await rule(value.value, form.values, ctrl.signal)) || ''
        if (msg) break
      }
    } catch (e) {
      if (e.name === 'AbortError') return
      msg = '校验失败，请稍后再试'
    }
    if (id !== seq) return // 已经有更新的一次，丢弃
    delete form.validating[p]
    checked = value.value
    if (msg) form.asyncErrors[p] = msg
  }

  watch(value, () => {
    cancel()
    delete form.asyncErrors[path()]
    delete form.serverErrors[path()]
    if (asyncRules.length && !syncError.value) {
      form.validating[path()] = true
      timer = setTimeout(flush, toValue(delay))
    }
  })

  watch(path, (p, _old, onCleanup) => {
    form.register(p, meta)
    onCleanup(() => form.unregister(p, meta))
  }, { immediate: true, flush: 'sync' })

  onScopeDispose(() => {
    cancel()
    if (clearOnUnmount) {
      const p = path()
      setPath(form.values, p, undefined)
      delete form.touched[p]; delete form.asyncErrors[p]; delete form.serverErrors[p]
    }
  })

  const error = computed(() => (form.touched[path()] || form.submitCount.value > 0 ? form.errorOf(path()) : ''))
  const onBlur = () => { form.touched[path()] = true }
  const setEl = el => { meta.el = el?.$el ?? el }
  return {
    value, error,
    touched: computed(() => !!form.touched[path()]),
    dirty: computed(() => form.isDirty(path())),
    validating: computed(() => !!form.validating[path()]),
    onBlur, setEl
  }
}
