<script setup lang="ts">
// 作用域插槽实验台里的子组件 UserList：把 user 和 index 传给默认插槽，没有内容时用后备内容
defineProps<{ users: { id: number; name: string; age: number }[] }>()
</script>

<template>
  <ul style="margin: 6px 0 0; padding-left: 20px">
    <li v-for="(user, index) in users" :key="user.id"><slot :user="user" :index="index">{{ user.name }}</slot></li>
  </ul>
</template>
