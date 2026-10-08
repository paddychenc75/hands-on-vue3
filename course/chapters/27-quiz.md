---
layout: page
head:
  - - meta
    - http-equiv: refresh
      content: "0; url=../check/1.html"
---

<script setup>
import { onMounted } from 'vue'
import { useRouter, withBase } from 'vitepress'

// 旧地址 /chapters/27-quiz（综合测验）已经没有了：每个阶段末尾改成了阶段测验。跳转到第一个阶段测验，避免死链
const router = useRouter()
onMounted(() => router.go(withBase('/check/1')))
</script>

# 综合测验已改成阶段测验

综合测验已经拆成 6 个阶段测验，每个阶段末尾一次。正在跳转到[入门阶段测验](/check/1)。
