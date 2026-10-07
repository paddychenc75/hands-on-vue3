<script lang="ts">
// 选项式 API 写的计数器（故意用 export default 写法，和组合式并排对照）
import { defineComponent } from 'vue'

export default defineComponent({
  props: { start: { type: Number, default: 0 } },
  emits: ['change', 'mounted'],
  data() {
    return { count: this.start }
  },
  computed: {
    double(): number {
      return this.count * 2
    }
  },
  watch: {
    count(v: number) {
      this.$emit('change', '选项式', v)
    }
  },
  methods: {
    inc() {
      this.count++
    }
  },
  mounted() {
    this.$emit('mounted', '选项式：mounted() 运行。this.$refs.btn 是 <' + (this.$refs.btn as HTMLElement).tagName.toLowerCase() + '>')
  }
})
</script>

<template>
  <div class="box"><span class="cap">选项式 API</span><p style="margin: 0">count = <b>{{ count }}</b>，double = {{ double }}</p><button class="b" ref="btn" @click="inc">+1</button></div>
</template>
