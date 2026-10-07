<script setup lang="ts">
// useFetch 和请求取消（旧 demo-fetch）：watchEffect + onWatcherCleanup 取消过期请求。
import { ref, shallowRef, watchEffect, toValue, onWatcherCleanup, onMounted, type MaybeRefOrGetter } from 'vue'
import { dLogBuf } from '../_shared'

const USERS = ['', 'Evan', 'Anthony', 'Eduardo', 'Kevin', 'Daniel']
const { L, attach } = dLogBuf()
const logRef = ref<HTMLElement | null>(null)

function fakeFetch(url: string, { signal }: { signal: AbortSignal }) {
  const ms = 300 + Math.floor(Math.random() * 900)
  L('tr', 'GET ' + url + '（' + ms + 'ms）')
  return new Promise<{ id: number; name: string }>((resolve, reject) => {
    const t = setTimeout(() => {
      L('rn', '完成 ' + url)
      const id = +url.split('/').pop()!
      resolve({ id, name: USERS[id] })
    }, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      L('x', '取消 ' + url)
      const e = new Error('aborted')
      e.name = 'AbortError'
      reject(e)
    })
  })
}

function useFetch(url: MaybeRefOrGetter<string>) {
  const data = shallowRef<{ id: number; name: string } | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  watchEffect(async () => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())
    const u = toValue(url)
    loading.value = true
    error.value = null
    try {
      data.value = await fakeFetch(u, { signal: controller.signal })
      loading.value = false
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        error.value = e
        loading.value = false
      }
    }
  })
  return { data, loading, error }
}

const id = ref(1)
onMounted(() => attach(logRef.value))
const { data, loading } = useFetch(() => '/api/user/' + id.value)
</script>

<template>
  <div class="row">
    <span class="cap">用户 id：</span>
    <button v-for="i in 5" :key="i" class="b" :class="{ on: id === i }" @click="id = i">{{ i }}</button>
  </div>
  <dl class="kv">
    <dt>url</dt><dd>/api/user/{{ id }}</dd>
    <dt>loading</dt><dd>{{ loading }}</dd>
    <dt>data</dt><dd>{{ data ? JSON.stringify(data) : '—' }}</dd>
  </dl>
  <div class="log" ref="logRef"></div>
  <div class="cap">快速点击不同的 id。旧请求被取消，data 总是和当前 id 一致。</div>
</template>
