<script setup lang="ts">
// 自测题的一个选项。序号由父级 Sc 按出现顺序分配。
import { computed, inject } from 'vue'
import { ScKey } from '../composables/keys'

const sc = inject(ScKey)
if (!sc) throw new Error('<Opt> 必须放在 <Sc> 里面')
const idx = sc.registerOpt()
const isRight = computed(() => sc.answered.value && idx === sc.correct)
const isWrong = computed(() => sc.answered.value && idx === sc.picked.value && idx !== sc.correct)
const isPicked = computed(() => !sc.answered.value && sc.guessed.value && idx === sc.picked.value)
</script>

<template>
  <button
    type="button"
    class="sc-o"
    :class="{ right: isRight, wrong: isWrong, picked: isPicked }"
    :aria-pressed="sc.answered.value || sc.guessed.value ? (idx === sc.picked.value ? 'true' : 'false') : undefined"
    :aria-disabled="sc.answered.value ? 'true' : undefined"
    @click="sc.pick(idx)"
  ><slot /></button>
</template>
