<script setup lang="ts">
// 指令演练场：v-model 标签页
import { reactive } from 'vue'

const form = reactive({ name: '', age: 18, agree: false, skills: ['vue'], gender: '女', city: '杭州' })
</script>

<template>
  <div class="cols">
    <div style="display: flex; flex-direction: column; gap: 6px">
      <label class="ctl">姓名 <input class="t" v-model.trim="form.name" style="width: 120px" /></label>
      <label class="ctl">年龄 <input class="t" type="number" v-model.number="form.age" /></label>
      <label class="ctl"><input type="checkbox" v-model="form.agree" /> 同意协议</label>
      <div class="row" style="gap: 8px">
        <label class="ctl"><input type="checkbox" value="vue" v-model="form.skills" />vue</label>
        <label class="ctl"><input type="checkbox" value="ts" v-model="form.skills" />ts</label>
        <label class="ctl"><input type="checkbox" value="node" v-model="form.skills" />node</label>
      </div>
      <div class="row" style="gap: 8px">
        <label class="ctl"><input type="radio" value="男" v-model="form.gender" />男</label>
        <label class="ctl"><input type="radio" value="女" v-model="form.gender" />女</label>
      </div>
      <label class="ctl">城市
        <select class="t" v-model="form.city"><option>北京</option><option>上海</option><option>杭州</option></select>
      </label>
    </div>
    <div class="domview">{{ JSON.stringify(form, null, 2) }}</div>
  </div>
  <div class="cap">说明：使用 .number 后，age 是数字，没有引号。</div>
</template>
