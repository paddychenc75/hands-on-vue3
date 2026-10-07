<script setup lang="ts">
// 实验台：具名插槽、作用域插槽和后备内容（旧 demo-slots）
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SlotCard from './SlotCard.vue'
import SlotUserList from './SlotUserList.vue'

const o = reactive({ header: true, body: true, footer: false, scoped: true })
const users = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 }
]
const wrap = ref<HTMLElement | null>(null)
const html = ref('')
const read = () => {
  if (!wrap.value) return
  html.value = wrap.value.innerHTML
    .replace(/ style="[^"]*"/g, '')
    .replace(/ data-v-[^=]+=""/g, '')
    .replace(new RegExp('<' + '!---->', 'g'), '<' + '!--v-if-->')
    .replace(/></g, '>\n<')
}
onMounted(read)
watch(o, read, { flush: 'post', deep: true })

const code = computed(() => {
  const lines = ['<Card>']
  if (o.header) lines.push('  <template #header>标题</template>')
  if (o.body) lines.push('  正文')
  if (o.footer) lines.push('  <template #footer="{ year }">© {{ year }}</template>')
  lines.push('</Card>', '')
  lines.push(
    o.scoped
      ? '<UserList :users="users">\n  <template #default="{ user, index }">\n    {{ index + 1 }}. <b>{{ user.name }}</b>（{{ user.age }}）\n  </template>\n</UserList>'
      : '<UserList :users="users" />   <' + '!-- 使用后备内容 -->'
  )
  return lines.join('\n')
})
</script>

<template>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="o.header" /> 提供 #header</label>
    <label class="ctl"><input type="checkbox" v-model="o.body" /> 提供默认插槽</label>
    <label class="ctl"><input type="checkbox" v-model="o.footer" /> 提供 #footer</label>
    <label class="ctl"><input type="checkbox" v-model="o.scoped" /> UserList 用作用域插槽</label>
  </div>
  <div class="cols" style="margin-top: 8px">
    <LabCode :code="code" style="margin: 0" />
    <div ref="wrap">
      <SlotCard>
        <template v-if="o.header" #header>标题</template>
        <template v-if="o.body" #default>正文</template>
        <template v-if="o.footer" #footer="{ year }">© {{ year }}</template>
      </SlotCard>
      <SlotUserList v-if="o.scoped" :users="users">
        <template #default="{ user, index }">{{ index + 1 }}. <b>{{ user.name }}</b>（{{ user.age }}）</template>
      </SlotUserList>
      <SlotUserList v-else :users="users" />
    </div>
  </div>
  <div class="cap" style="margin-top: 6px">子组件渲染的 HTML（取消“提供 #header”，header 元素消失，只留下注释）：</div>
  <div class="domview" style="max-height: 220px; overflow: auto">{{ html }}</div>
</template>
