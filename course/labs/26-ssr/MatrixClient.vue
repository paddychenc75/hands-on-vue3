<script setup lang="ts">
// 实验台：水合对照表——客户端组件。模板里 :title、:data-x 和 ul 上的 :data-n 是 v-bind 绑定，会进编译器生成的 dynamicProps。
// ul 上故意带一个绑定属性：完全静态的 ul 会被编译器缓存，生产版水合时整个跳过它的子节点（见 26.7），实验台要演示的是普通元素。
import { ref } from 'vue'

const t = ref('client')
</script>

<template>
  <div class="card" lang="en" :title="t" :data-x="t" :style="{ color: 'blue' }"><h3>{{ t }}</h3><ul :data-n="t"><li>1</li><li>2</li></ul></div>
</template>
