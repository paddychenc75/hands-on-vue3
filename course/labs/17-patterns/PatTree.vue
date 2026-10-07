<script setup lang="ts">
// 实验台：递归的文件树（旧版 #demo-pat-tree）
import { computed, reactive } from 'vue'
import TreeNode from './TreeNode.vue'

const tree = reactive<any>({
  name: 'src',
  children: [
    { name: 'components', children: [{ name: 'Button.vue' }, { name: 'forms', children: [{ name: 'Input.vue' }] }] },
    { name: 'views', children: [{ name: 'Home.vue' }] },
    { name: 'main.js' }
  ]
})
const stats = computed(() => {
  let n = 0, d = 0
  ;(function walk(x: any, k: number) { n++; d = Math.max(d, k); (x.children || []).forEach((c: any) => walk(c, k + 1)) })(tree, 0)
  return { n, d }
})
</script>

<template>
  <div class="cap">共 {{ stats.n }} 个节点，最大深度 {{ stats.d }}。每个 TreeNode 用 inject 读取 depth，再 provide depth + 1。</div>
  <ul style="margin: 8px 0 0; padding: 0"><TreeNode :node="tree" /></ul>
</template>
