<script setup lang="ts">
// 实验台：Transition、TransitionGroup 和 Teleport（旧版 #demo-builtins）
// 三个标签页各是一个小组件，外壳用通用的 <TabbedLab>。
import TransitionTab from './TransitionTab.vue'
import TransitionGroupTab from './TransitionGroupTab.vue'
import TeleportTab from './TeleportTab.vue'

const TABS = [
  {
    name: 'Transition', comp: TransitionTab,
    tip: '点击按钮，然后阅读日志。日志显示每个钩子运行时元素上的类名。',
    code: '<Transition name="bi-fade"\n  @before-enter="beforeEnter" @enter="enter"\n  @after-enter="afterEnter" @leave="leave" …>\n  <p v-if="show">我是 v-if 段落</p>\n</Transition>\n\n<Transition name="bi-fade" mode="out-in">\n  <div :key="which">我是 {{ which }}</div>\n</Transition>\n\n.bi-fade-enter-active, .bi-fade-leave-active {\n  transition: opacity .6s, transform .6s;\n}\n.bi-fade-enter-from, .bi-fade-leave-to {\n  opacity: 0; transform: translateY(-10px);\n}'
  },
  {
    name: 'TransitionGroup', comp: TransitionGroupTab,
    tip: '点击“打乱”。每个元素从旧位置移动到新位置。',
    code: '<TransitionGroup name="bi-list" tag="ul">\n  <li v-for="n in items" :key="n">{{ n }}</li>\n</TransitionGroup>\n\n.bi-list-move,\n.bi-list-enter-active,\n.bi-list-leave-active { transition: all .6s; }\n.bi-list-enter-from,\n.bi-list-leave-to { opacity: 0; transform: translateY(20px); }\n.bi-list-leave-active { position: absolute; }'
  },
  {
    name: 'Teleport', comp: TeleportTab,
    tip: '打开弹窗。弹窗渲染到 body 中，不受框的样式限制。',
    code: '<div class="trap">  <!-- overflow: hidden; transform -->\n  <Teleport to="body" :disabled="disabled">\n    <div v-if="open" class="mask">\n      <div class="modal">\n        <button @click="open = false">关闭</button>\n      </div>\n    </div>\n  </Teleport>\n</div>'
  }
]
</script>

<template>
  <TabbedLab :tabs="TABS" />
</template>

<style>
/* 实验台私有样式。旧版是挂载时往 head 里插一段 style，这里作为全局样式（类名都带 bi- 前缀）。
   Teleport 到 body 的遮罩在 .vp-doc 之外，所以不能用 scoped。 */
.bi-fade-enter-active, .bi-fade-leave-active { transition: opacity .6s ease, transform .6s ease; }
.bi-fade-enter-from, .bi-fade-leave-to { opacity: 0; transform: translateY(-10px); }
.bi-list { position: relative; list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
.bi-list li { min-width: 36px; text-align: center; padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--sunken); font-family: var(--f-mono); }
.bi-list-move, .bi-list-enter-active, .bi-list-leave-active { transition: transform .6s ease, opacity .6s ease; }
.bi-list-enter-from, .bi-list-leave-to { opacity: 0; transform: translateY(20px); }
.bi-list-leave-active { position: absolute; }
.bi-trap { position: relative; height: 120px; overflow: hidden; transform: translateZ(0); border: 1px dashed var(--line); border-radius: 8px; padding: 8px; }
.bi-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.bi-modal { background: var(--surface); color: var(--ink); border-radius: 10px; padding: 16px; max-width: 320px; width: 100%; box-shadow: 0 8px 30px rgba(0, 0, 0, .3); }
</style>
