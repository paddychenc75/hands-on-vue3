<script setup lang="ts">
// 示意图外壳。标题有两种写法：
//   <Figure caption="纯文字标题"> 〈svg 组件〉 </Figure>
//   <Figure> 〈svg 组件〉 <template #caption>标题里可以有 <code>行内代码</code></template> </Figure>
defineProps<{ caption?: string }>()
</script>

<template>
  <figure class="fig">
    <slot />
    <figcaption v-if="caption || $slots.caption"><slot name="caption">{{ caption }}</slot></figcaption>
  </figure>
</template>
