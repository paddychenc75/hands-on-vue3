<script setup lang="ts">
// 实验台：指令演练场（旧版 #demo-directives）
// 每个标签页是一个小组件，加一段展示代码。切换标签页时重新创建小组件（:key）。
import { ref } from 'vue'
import DirInterpolation from './DirInterpolation.vue'
import DirBind from './DirBind.vue'
import DirOn from './DirOn.vue'
import DirIfShow from './DirIfShow.vue'
import DirFor from './DirFor.vue'
import DirModel from './DirModel.vue'

const TABS = [
  { name: '{{ }}', comp: DirInterpolation, tip: '插值接受一个表达式。例如属性访问、三元运算和函数调用。', code: '<input v-model="name">\n<p>原样：{{ name }}</p>\n<p>大写：{{ name.toUpperCase() }}</p>\n<p>长度：{{ name.length > 5 ? \'长名字\' : \'短名字\' }}</p>\n<p>格式化：{{ fmt(price) }}</p>' },
  { name: 'v-bind', comp: DirBind, tip: ':style 和 :class 接受对象。值为真时，样式生效。拖动滑块，然后观察按钮。', code: '<button\n  :style="{ color, fontSize: size + \'px\' }"\n  :class="{ big: size > 30 }"\n  :disabled="off">\n  我是按钮\n</button>' },
  { name: 'v-on', comp: DirOn, tip: '@ 是 v-on 的缩写。.once 只运行一次。.enter 只在按回车键时运行。.prevent 防止表单刷新页面。', code: '<button @click="count++">普通 +1</button>\n<button @click.once="count += 10">.once +10</button>\n<input @keyup.enter="say">\n<form @submit.prevent="onSubmit">…</form>' },
  { name: 'v-if / v-show', comp: DirIfShow, tip: '切换开关，然后观察下方的 DOM。v-if 为假时，元素被删除，只留下一个注释。v-show 为假时，元素仍在，样式为 display: none。', code: '<p v-if="ok">我是 v-if</p>\n<p v-show="ok">我是 v-show</p>' },
  { name: 'v-for', comp: DirFor, tip: '每一项需要唯一并且稳定的 key。点击“打乱”。Vue 用 key 找到同一项，只移动 DOM，不重新创建。', code: '<li v-for="(f, i) in fruits" :key="f.id">\n  {{ i }}. {{ f.name }}\n  <button @click="remove(f.id)">×</button>\n</li>' },
  { name: 'v-model', comp: DirModel, tip: 'v-model 按表单类型选择属性和事件。右边显示当前的数据。', code: '<input v-model.trim="form.name">\n<input v-model.number="form.age" type="number">\n<input type="checkbox" v-model="form.agree">\n<input type="checkbox" value="vue" v-model="form.skills">\n<input type="radio" value="男" v-model="form.gender">\n<select v-model="form.city">…</select>' }
]
const i = ref(0)
</script>

<template>
  <div class="tabs">
    <button v-for="(t, k) in TABS" :key="k" type="button" :class="{ on: i === k }" @click="i = k">{{ t.name }}</button>
  </div>
  <div class="cap">{{ TABS[i].tip }}</div>
  <div class="cols">
    <LabCode :code="TABS[i].code" style="margin: 0" />
    <div class="box">
      <span class="cap">运行效果</span>
      <component :is="TABS[i].comp" :key="i" />
    </div>
  </div>
</template>
