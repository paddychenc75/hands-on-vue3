<script setup lang="ts">
// 自测题的一个选项。序号由父级 Sc 按出现顺序分配。
// 章内自测答错时只标出选错的那一项（红），不标正确项；重试时，上次选错的那一项隐藏。
import { computed, inject } from 'vue'
import { ScKey } from '../composables/keys'

const sc = inject(ScKey)
if (!sc) throw new Error('<Opt> 必须放在 <Sc> 里面')
const idx = sc.registerOpt()
const isRight = computed(() => sc.answered.value && idx === sc.correct)
const isWrong = computed(() => (sc.answered.value || sc.wrong.value) && idx === sc.picked.value && idx !== sc.correct)
const isPicked = computed(() => !sc.answered.value && sc.guessed.value && idx === sc.picked.value)
const isHidden = computed(() => !sc.answered.value && idx === sc.hidden.value)
</script>

<template>
  <button
    v-show="!isHidden"
    type="button"
    class="sc-o"
    :class="{ right: isRight, wrong: isWrong, picked: isPicked }"
    :aria-pressed="sc.locked.value || sc.guessed.value ? (idx === sc.picked.value ? 'true' : 'false') : undefined"
    :aria-disabled="sc.locked.value ? 'true' : undefined"
    @click="sc.pick(idx)"
  ><span class="ol" aria-hidden="true">{{ 'ABCDEFGH'[idx] }}</span><span class="ot"><slot /></span></button>
</template>
