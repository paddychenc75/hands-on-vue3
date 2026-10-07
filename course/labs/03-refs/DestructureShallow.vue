<script setup lang="ts">
// 实验台：解构和浅层响应（旧版 #demo-refs）
import { reactive, ref, shallowRef, toRefs, triggerRef } from 'vue'

const state = reactive({ count: 0 })
// 故意解构：count 只是 0 的副本
// eslint-disable-next-line prefer-const
let { count } = state
const { count: countRef } = toRefs(state)
const deep = ref({ n: 0 })
const shallow = shallowRef({ n: 0 })

const bumpShallow = () => { shallow.value.n++ }
const forceShallow = () => triggerRef(shallow)
const replaceShallow = () => { shallow.value = { n: shallow.value.n + 1 } }
</script>

<template>
  <div class="row"><button class="b pri" @click="state.count++">state.count++</button></div>
  <dl class="kv">
    <dt>state.count</dt><dd>{{ state.count }} <span class="pill g">响应</span></dd>
    <dt>解构出的 count</dt><dd>{{ count }} <span class="pill">停在 0</span></dd>
    <dt>toRefs 得到的 count</dt><dd>{{ countRef }} <span class="pill g">响应</span></dd>
  </dl>
  <div class="cols">
    <div class="box">
      <span class="cap">ref({ n }) 深层响应</span>
      <div class="row"><button class="b" @click="deep.n++">deep.value.n++</button><b>{{ deep.n }}</b></div>
    </div>
    <div class="box">
      <span class="cap">shallowRef({ n }) 浅层响应</span>
      <div class="row"><button class="b" @click="bumpShallow">shallow.value.n++</button><b>{{ shallow.n }}</b></div>
      <div class="row" style="margin-top: 6px">
        <button class="b" @click="forceShallow">triggerRef</button>
        <button class="b" @click="replaceShallow">整体替换 .value</button>
      </div>
      <div class="cap" style="margin-top: 6px">点击 n++ 几次。数字不改变。然后点击 triggerRef。数字更新。</div>
    </div>
  </div>
</template>
