<script setup lang="ts">
// 实验台：第 13 章的成品任务看板。真实的 Vue 单文件组件，功能和六步练习做出来的一样。
import { provide, ref } from 'vue'
import BoardColumn from './BoardColumn.vue'
import TaskCard from './TaskCard.vue'
import TaskForm from './TaskForm.vue'
import { COLUMNS, useTasks, type BoardActions, type Task } from './useTasks'

const { byStatus, left, add, move, update, remove, reset } = useTasks()
const editing = ref<Task | 'new' | null>(null)   // null：弹窗关闭；'new'：新建；任务对象：编辑它

function onSave(data: { title: string; due: string }) {
  if (editing.value === 'new') add(data.title, data.due)
  else if (editing.value) update(editing.value.id, data)
  editing.value = null
}
const actions: BoardActions = { move, update, remove, edit: task => { editing.value = task } }
provide('board', actions)
</script>

<template>
  <div class="board-lab">
    <div class="row">
      <button class="b pri new" @click="editing = 'new'">新建任务</button>
      <button class="b reset" @click="reset">恢复示例数据</button>
      <span class="left">还剩 {{ left }} 项</span>
    </div>
    <div class="cols3">
      <BoardColumn v-for="col in COLUMNS" :key="col.status" :title="col.label" :count="byStatus[col.status].length" :class="'col-' + col.status">
        <TransitionGroup tag="ul" name="card" class="cards">
          <TaskCard v-for="t in byStatus[col.status]" :key="t.id" :task="t" />
        </TransitionGroup>
      </BoardColumn>
    </div>
    <div class="cap">点标题编辑，改日期看卡片在列内重新排序，删除和新建有过渡。任务保存在 localStorage。</div>
    <Teleport to="body">
      <div v-if="editing" class="modal-mask" @click.self="editing = null">
        <div class="modal-box" role="dialog" aria-modal="true">
          <h3>{{ editing === 'new' ? '新建任务' : '编辑任务' }}</h3>
          <TaskForm :task="editing === 'new' ? null : editing" @save="onSave" @cancel="editing = null" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 8px 0; }
.cards { list-style: none; padding: 0; margin: 0; }
.left { color: var(--muted); font-size: 13px; }
@media (max-width: 640px) { .cols3 { grid-template-columns: 1fr; } }
.card-enter-active, .card-leave-active { transition: all .25s ease; }
.card-enter-from, .card-leave-to { opacity: 0; transform: translateX(12px); }
.card-move { transition: transform .25s ease; }
.modal-mask { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; background: rgba(0, 0, 0, .45); }
.modal-box { background: var(--vp-c-bg, #fff); color: var(--vp-c-text-1, #222); padding: 16px; border-radius: 8px; min-width: min(320px, 90vw); }
.modal-box h3 { margin: 0 0 8px; }
</style>
