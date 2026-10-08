<script setup lang="ts">
// 实验台：表单状态检查器。左边是用迷你表单库（formKit.ts）写的表单，右边实时显示每个字段的状态和各组件的更新次数。
import { ref } from 'vue'
import { domLog } from '../_shared'
import { useForm } from './formKit'
import { resetCounts, useRenderCount } from './renderCount'
import LabField from './LabField.vue'
import StatePanel from './StatePanel.vue'
import RawJson from './RawJson.vue'

const lg = ref<HTMLElement | null>(null)
const L = (c: string, m: string) => domLog(lg.value, c, m)
const sleep = (n: number) => new Promise(r => setTimeout(r, n))

const serverMode = ref<'ok' | 'fail'>('ok')
const debounceOn = ref(false)
const clearHidden = ref(false)
const done = ref('')

// 规则和 schema 写在组件外面：每次渲染传给字段的都是同一个数组，字段组件不会因为“新数组”而更新（32.2 节的注意）
const required = (v: any) => (v === '' || v == null ? '必填' : '')
const minLen = (n: number) => (v: any) => (String(v ?? '').length >= n ? '' : `至少 ${n} 个字符`)
const email = (v: any) => (/^\S+@\S+\.\S+$/.test(v ?? '') ? '' : '邮箱格式不正确')
const R_USERNAME = [required, minLen(3)]
const R_EMAIL = [required, email]
const R_PASSWORD = [minLen(6)]
const R_REQUIRED = [required]
const KINDS = [{ value: 'personal', label: '个人' }, { value: 'company', label: '公司' }]

let reqSeq = 0
const checkUsername = async (name: string) => {
  const id = ++reqSeq
  L('tr', `请求 #${id}：${name} 是否已被占用？（${name.length <= 3 ? '这个名字查得慢，约 0.9 秒' : '约 0.2 秒'}）`)
  await sleep(name.length <= 3 ? 900 : 200)
  const taken = ['ann', 'admin', 'bobby'].includes(name)
  L(taken ? 'x' : 'rn', `返回 #${id}：${name} ${taken ? '已被占用' : '可用'}`)
  return taken ? '已被占用' : ''
}
const A_USERNAME = [checkUsername]

let nextId = 3
const form = useForm({
  initialValues: {
    username: '', email: '', password: '', confirm: '', kind: 'personal', company: '',
    profile: { city: '' },
    contacts: [{ id: 1, name: '王芳' }, { id: 2, name: '' }]
  },
  schema: (v: any) => (v.password && v.confirm && v.password !== v.confirm ? { confirm: '两次输入不一致' } : {}),
  async onSubmit(values: any) {
    L('tr', '提交：' + JSON.stringify(values).slice(0, 80) + '…')
    await sleep(800)
    if (serverMode.value === 'fail') {
      L('x', '服务器返回 422：用户名已被注册，第 2 个联系人重复')
      throw Object.assign(new Error('422'), { fieldErrors: { username: '服务器：用户名已被注册', 'contacts[1].name': '服务器：联系人重复' } })
    }
    L('rn', '服务器返回 201')
    done.value = '提交成功'
  }
})
const contacts = form.array('contacts')
const rootBadge = useRenderCount()

function addContact() { contacts.insert(form.values.contacts.length, { id: nextId++, name: '' }) }
function fastType() {
  form.touched.username = true
  form.values.username = 'ann'
  L('m', '输入 ann')
  setTimeout(() => { form.values.username = 'anna'; L('m', '0.1 秒后改成 anna') }, 100)
}
async function onSubmit() {
  done.value = ''
  await form.submit()
  if (form.submitCount.value && !done.value && !form.isSubmitting.value) L('m', '提交结束（校验未通过或服务器拒绝）')
}
function resetForm() { form.reset(); done.value = '' }
</script>

<template>
  <div class="fi">
    <div class="row" style="margin-bottom:8px">
      <button class="b" type="button" data-act="fast" @click="fastType">快速输入 ann → anna</button>
      <button class="b" type="button" data-act="reset-counts" @click="resetCounts">更新次数清零</button>
      <label class="ctl"><input type="checkbox" v-model="debounceOn" data-opt="debounce"> 用户名防抖 400ms</label>
      <label class="ctl"><input type="checkbox" v-model="clearHidden" data-opt="clear"> 条件字段隐藏时清除值</label>
      <label class="ctl">服务器
        <select v-model="serverMode" data-opt="server"><option value="ok">接受提交</option><option value="fail">返回字段错误</option></select>
      </label>
    </div>
    <div class="stack">
      <form novalidate @submit.prevent="onSubmit">
        <p class="cap">表单根组件更新 <b ref="rootBadge" data-count="Root">0</b> 次</p>
        <LabField name="username" label="用户名" :rules="R_USERNAME" :async-rules="A_USERNAME" :delay="debounceOn ? 400 : 0" />
        <LabField name="email" label="邮箱" :rules="R_EMAIL" />
        <LabField name="password" label="密码" :rules="R_PASSWORD" />
        <LabField name="confirm" label="确认密码（表单级 schema 校验）" />
        <LabField name="profile.city" label="城市（嵌套路径 profile.city）" />
        <LabField name="kind" label="类型" as="select" :options="KINDS" />
        <LabField v-if="form.values.kind === 'company'" :key="String(clearHidden)" name="company" label="公司名（条件字段）" :rules="R_REQUIRED" :clear-on-unmount="clearHidden" />
        <fieldset>
          <legend class="cap">联系人（字段数组，key 用 id）</legend>
          <div v-for="(c, i) in form.values.contacts" :key="c.id" class="ct" :data-contact="c.id">
            <LabField :name="`contacts[${i}].name`" :label="`联系人 ${i + 1}`" :rules="R_REQUIRED" />
            <button class="b" type="button" data-act="up" :disabled="i === 0" @click="contacts.move(i, i - 1)">上移</button>
            <button class="b" type="button" data-act="del" @click="contacts.remove(i)">删除</button>
          </div>
          <button class="b" type="button" data-act="add" @click="addContact">添加联系人</button>
        </fieldset>
        <div class="row" style="margin-top:8px">
          <button class="b pri" data-act="submit" :disabled="form.isSubmitting.value">{{ form.isSubmitting.value ? '提交中…' : '提交' }}</button>
          <button class="b" type="button" data-act="reset-form" @click="resetForm">重置表单</button>
          <span v-if="done" role="status" style="color:var(--accent)">{{ done }}</span>
        </div>
      </form>
      <div style="min-width:0;margin-top:10px">
        <StatePanel />
        <RawJson />
      </div>
    </div>
    <div class="log" ref="lg" style="margin-top:8px"></div>
  </div>
</template>

<style scoped>
.fi { min-width: 0; }
.stack { display: flex; flex-direction: column; min-width: 0; }
.ct { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; align-items: end; }
fieldset { border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; min-width: 0; margin: 0; }
</style>
