<script>
// 重构后的组件：行为完全相同，内部状态名、方法、类名和标签都变了
export default {
  data() { return { clicks: 0 } },
  methods: { bump() { this.clicks += 1 } }
}
</script>

<template>
  <section>
    <span class="total">已点 {{ clicks }} 次</span>
    <button type="button" @click="bump">加一</button>
  </section>
</template>
