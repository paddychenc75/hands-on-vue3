<script setup lang="ts">
// 递归组件：SFC 用自己的文件名 TreeNode 在模板里引用自己
import { computed, inject, provide, ref } from 'vue'
import { DepthKey, treeUid } from './patternKeys'

interface Node { name: string; children?: Node[] }
const props = defineProps<{ node: Node }>()
const depth = inject(DepthKey, 0)
provide(DepthKey, depth + 1) // 子节点的深度 = 自己的深度 + 1
const open = ref(depth < 2)
const isFolder = computed(() => Array.isArray(props.node.children))
function add(folder: boolean) {
  const uid = ++treeUid.n
  const n: Node = folder ? { name: '新目录' + uid, children: [] } : { name: 'file' + uid + '.js' }
  props.node.children!.push(n)
  open.value = true
}
</script>

<template>
  <li style="list-style: none">
    <div class="row" style="gap: 4px 6px; min-width: 0">
      <button v-if="isFolder" type="button" class="b" style="padding: 0 6px" @click="open = !open" :aria-expanded="open">{{ open ? '▾' : '▸' }}</button>
      <span v-else style="display: inline-block; width: 26px"></span>
      <span style="overflow-wrap: anywhere">{{ node.name }}</span>
      <span class="pill" style="white-space: nowrap">depth {{ depth }}</span>
      <template v-if="isFolder">
        <button type="button" class="b" style="padding: 0 6px; white-space: nowrap" @click="add(false)" aria-label="添加文件">+文件</button>
        <button type="button" class="b" style="padding: 0 6px; white-space: nowrap" @click="add(true)" aria-label="添加目录">+目录</button>
      </template>
    </div>
    <ul v-if="isFolder && open && node.children!.length" style="margin: 4px 0; padding-left: 16px; border-left: 1px dashed var(--line)">
      <TreeNode v-for="c in node.children" :key="c.name" :node="c" />
    </ul>
  </li>
</template>
