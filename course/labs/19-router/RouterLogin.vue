<script setup lang="ts">
defineProps<{ redirect?: string }>()
defineEmits<{ login: [] }>()
</script>

<template>
  <div><b>登录页</b><p class="cap">导航守卫把你重定向到这个页面。{{ redirect ? '登录后，Router 跳转到 ' + redirect + '。' : '' }}</p><button class="b pri" @click="$emit('login')">一键登录</button></div>
</template>
