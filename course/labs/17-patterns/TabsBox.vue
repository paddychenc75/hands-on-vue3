<script setup lang="ts">
import { provide, readonly, ref } from 'vue'
import { TabsKey, tabsLog } from './patternKeys'

const L = (c: string, m: string) => tabsLog.L(c, m)
const tabs = ref<{ name: string; title: string }[]>([])
const active = ref('')
provide(TabsKey, {
  active: readonly(active),
  register(tab) {
    tabs.value.push(tab)
    L('rn', 'register("' + tab.name + '")  顺序：' + tabs.value.map(t => t.name).join(', '))
    if (!active.value) active.value = tab.name
    return () => {
      tabs.value = tabs.value.filter(t => t.name !== tab.name)
      L('x', 'unregister("' + tab.name + '")  顺序：' + tabs.value.map(t => t.name).join(', '))
      if (active.value === tab.name) active.value = tabs.value.length ? tabs.value[0].name : ''
    }
  },
  select(name) { active.value = name }
})
</script>

<template>
  <div>
    <div class="tabs" role="tablist">
      <button v-for="t in tabs" :key="t.name" type="button" role="tab" :aria-selected="active === t.name" :class="{ on: active === t.name }" @click="active = t.name">{{ t.title }}</button>
    </div>
    <div style="padding: 8px 2px"><slot></slot></div>
  </div>
</template>
