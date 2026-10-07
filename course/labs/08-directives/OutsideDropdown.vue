<script setup lang="ts">
import { ref } from 'vue'
import { ctx, vClickOutside } from './outsideCtx'

defineProps<{ wrong?: boolean }>()
const open = ref(false)
const picked = ref('（未选择）')
function close() {
  if (open.value) ctx.L('tr', '点击在外部 → 回调关闭菜单')
  open.value = false
}
function pick(x: string) { picked.value = x; open.value = false }
const items = ['编辑', '复制', '删除']
</script>

<template>
  <div v-if="!wrong" class="dd-wrap" v-click-outside="close" style="border: 1px dashed var(--accent); border-radius: 6px; padding: 8px">
    <button class="b" type="button" @click="open = !open">菜单 {{ open ? '▴' : '▾' }}</button>
    <ul v-if="open" style="margin: 6px 0 0; padding-left: 20px"><li v-for="x in items" :key="x"><a href="#" @click.prevent="pick(x)">{{ x }}</a></li></ul>
    <div class="cap" style="margin-top: 4px">已选择：{{ picked }}。虚线框是指令所在的元素。</div>
  </div>
  <div v-else style="border: 1px dashed var(--bad); border-radius: 6px; padding: 8px">
    <button class="b" type="button" @click="open = !open">菜单 {{ open ? '▴' : '▾' }}</button>
    <ul v-if="open" v-click-outside="close" style="margin: 6px 0 0; padding-left: 20px"><li v-for="x in items" :key="x"><a href="#" @click.prevent="pick(x)">{{ x }}</a></li></ul>
    <div class="cap" style="margin-top: 4px">已选择：{{ picked }}。指令在 v-if 的菜单上。</div>
  </div>
</template>
