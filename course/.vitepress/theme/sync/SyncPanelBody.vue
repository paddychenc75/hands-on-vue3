<script setup lang="ts">
// 同步面板的内容（展开面板时才加载的异步 chunk；放在 components/ 之外，不会被全局注册打进主包）。
// 界面只调用同步引擎的函数（engine/syncEngine.ts，同样是按需加载的 chunk），不在这里重写同步规则。
// 令牌：输入框是 type="password"，开启成功后立即清空；页面上只显示令牌末四位（来自 useSyncStatus）。
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { parseEnvelope, summarize } from '../../../engine/logic/syncFormat'
import { ago, TOKEN_URL } from '../../../engine/logic/syncView'
import { loadSyncEngine } from '../../../engine/syncState'
import { STATE_LABEL, TOKEN_CODES, useSyncStatus } from '../composables/sync'

const enc = encodeURIComponent
/** 细粒度令牌（备选）：官方文档的权限表里有账号权限 Gists（只有写入一档）；地址参数 gists=write 预填它，别的权限一个都不给 */
const FINE_URL = `https://github.com/settings/personal-access-tokens/new?name=${enc('动手学 Vue 3 学习进度同步')}&description=${enc('只用于把动手学 Vue 3 的学习进度存进我自己的一个私密 Gist')}&gists=write&expires_in=90`

type Msg = { kind: 'ok' | 'err'; text: string } | null
type Engine = Awaited<ReturnType<typeof loadSyncEngine>>
const errText = (e: unknown): string => (e && typeof (e as Error).message === 'string' ? (e as Error).message : '出了意外的错误。')
const fmtTime = (t: number) => new Date(t).toLocaleString('zh-CN', { hour12: false })

const v = useSyncStatus()
const token = ref('')
const gistId = ref('')
const busy = ref(false)
const msg = ref<Msg>(null)
const confirmOff = ref(false)
const delRemote = ref(false)
const file = ref<{ name: string; text: string; chapters: number; done: number; cards: number; at: number; newer: boolean } | null>(null)
const confirmReplace = ref(false)
const backups = ref<{ at: number; reason: string }[]>([])
const live = ref<HTMLElement | null>(null)
const tokenInput = ref<HTMLInputElement | null>(null)
const s = computed(() => v.status)
const code = computed(() => s.value.code)
const needToken = computed(() => !!code.value && TOKEN_CODES.includes(code.value))

const reload = () => window.location.reload()
const eng = <T,>(f: (m: Engine) => Promise<T> | T) => loadSyncEngine().then(f)
const refreshBackups = () => eng(m => m.listBackups()).then(b => { backups.value = b })
onMounted(() => { if (v.enabled) refreshBackups() })
// 开启之后、每次同步成功（at 变了）之后重读备份列表
watch(() => [v.enabled, s.value.at], () => { if (v.enabled) refreshBackups() })

async function run(f: () => Promise<unknown>) {
  busy.value = true
  msg.value = null
  try {
    const r = await f()
    if (r && typeof r === 'object' && 'kind' in r) msg.value = r as Msg
  } catch (e) {
    msg.value = { kind: 'err', text: errText(e) }
  } finally {
    busy.value = false
  }
}

const enable = () =>
  run(async () => {
    const m = await loadSyncEngine()
    const r = await m.enable(token.value, gistId.value)
    token.value = ''
    gistId.value = ''
    setTimeout(() => live.value?.focus(), 50)
    return {
      kind: 'ok',
      text: r.created
        ? '已开启。已把本机进度上传到你账号下新建的私密 Gist。'
        : r.fromCloud
          ? `已开启。从云端合并了 ${r.fromCloud} 章的进度${r.uploaded ? '，并把合并结果写回了云端' : ''}。`
          : r.uploaded
            ? '已开启。已把本机进度上传到云端。'
            : '已开启。云端和本机的进度一致。'
    }
  })

const replaceToken = () =>
  run(async () => {
    await eng(m => m.disconnect(false))
    const m = await loadSyncEngine()
    await m.enable(token.value, v.gist)
    token.value = ''
    return { kind: 'ok', text: '已换成新令牌并重新同步。' }
  })

const exportFile = () =>
  run(async () => {
    const m = await loadSyncEngine()
    const blob = new Blob([JSON.stringify(m.exportEnvelope(), null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = m.exportFileName(Date.now())
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    return { kind: 'ok', text: '已导出。文件里是你的学习进度，不含令牌。' }
  })

async function pickFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  file.value = null
  confirmReplace.value = false
  msg.value = null
  if (!f) return
  const text = await f.text()
  const p = parseEnvelope(text)
  if (!p.ok) {
    msg.value = { kind: 'err', text: (p as { reason: string }).reason === 'json' ? '这个文件不是有效的 JSON。' : '这不是“动手学 Vue 3”导出的进度文件。' }
    return
  }
  file.value = { name: f.name, text, ...summarize(p.env.progress), at: p.env.updatedAt, newer: p.newer }
}
const doImport = (mode: 'merge' | 'replace') =>
  run(async () => {
    const m = await loadSyncEngine()
    const r = m.importEnvelope(file.value!.text, mode)
    file.value = null
    confirmReplace.value = false
    refreshBackups()
    return {
      kind: 'ok',
      text: (mode === 'merge' ? `已与本机进度合并，${r.changed ? r.changed + ' 章有变化' : '没有新增内容'}。` : '已用文件替换本机进度。') + ' 导入前的本机进度已备份。已经打开的章页刷新后才会显示。'
    }
  })

const disconnect = () =>
  run(async () => {
    const r = await eng(m => m.disconnect(delRemote.value))
    const wasDel = delRemote.value
    confirmOff.value = false
    delRemote.value = false
    nextTick(() => tokenInput.value?.focus())
    return {
      kind: 'ok',
      text: '已断开同步，令牌已从这台设备删除。' + (wasDel ? (r.remoteDeleted ? '云端的 Gist 已删除。' : '云端的 Gist 没能删除，可以到 GitHub 上手动删。') : '云端的 Gist 保留着。')
    }
  })

const restore = (i: number) =>
  run(async () => {
    await eng(m => m.restoreBackup(i))
    refreshBackups()
    return { kind: 'ok', text: '已恢复这份备份。已经打开的章页刷新后才会显示。' }
  })
</script>

<template>
  <div class="sync-body">
    <p>
      开启后，你的学习进度会存进<b>你自己 GitHub 账号下的一个私密 Gist</b>，在手机、电脑等多台设备之间自动合并，谁学的内容都不会丢。
      <b>不开启就什么都不会发送。</b>本站没有服务器，也不会看到你的数据。
    </p>

    <template v-if="!v.enabled">
      <ol class="sync-steps">
        <li>
          点这个链接：<a :href="TOKEN_URL" target="_blank" rel="noopener noreferrer">创建令牌</a>。它会在新标签页打开 GitHub 的创建页面。名称和权限已经填好，权限只勾了 gist。
        </li>
        <li>在 GitHub 页面最下面点“Generate token”。复制以 <code>ghp_</code> 开头的那串字符。它只显示一次。</li>
        <li>回到本站，把令牌粘贴进下面的输入框，点“开启同步”。站点会先检查令牌能不能用，再做第一次同步，并告诉你结果。</li>
      </ol>
      <ul class="sync-notes">
        <li><b>只勾 gist 权限，别的都不要勾。</b>即使令牌泄露，对方也只能动你的 Gist，碰不到你的代码仓库。</li>
        <li><b>过期时间：</b>GitHub 默认 30 天。过期后同步会停，本站会提示你重新创建令牌。你可以选更长，或者选不过期。</li>
        <li>
          <b>在另一台设备上：</b>打开本站，重复第 3 步。令牌用同一个，或者再建一个都行，但要用同一个 GitHub 账号。
          开启时，站点会在你的账号里找已有的同步文件 <code>hands-on-vue3-progress.json</code>。找到就接着用同一份，不会再建一个。
          个别令牌列不出私密 Gist，找不到时，展开下面的“手动填 Gist”，填第一台设备上显示的 Gist 链接或编号。
        </li>
      </ul>
      <p class="sync-fine">
        备选：<a :href="FINE_URL" target="_blank" rel="noopener noreferrer">细粒度令牌</a>。GitHub 官方文档的权限表里有账号权限 Gists，只有“写入”一档。
        本站没法用真实令牌验证它读私密 Gist 的行为，所以优先推荐经典令牌。用它时，另一台设备大概率要手动填 Gist。
      </p>
      <form class="sync-form" @submit.prevent="enable">
        <label for="sync-token">GitHub 令牌</label>
        <input id="sync-token" ref="tokenInput" v-model="token" class="sync-input" type="password" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="粘贴令牌（ghp_… 或 github_pat_…）" />
        <details class="sync-adv">
          <summary>找不到云端已有的进度？手动填 Gist</summary>
          <label for="sync-gist">Gist 链接或编号（可选）</label>
          <input id="sync-gist" v-model="gistId" class="sync-input" type="text" autocomplete="off" />
          <small>到第一台设备的同步状态区复制 Gist 链接，填在这里。</small>
        </details>
        <button type="submit" class="sync-b pri" :disabled="busy || !token.trim()">{{ busy ? '正在开启…' : '开启同步' }}</button>
      </form>
      <p class="sync-safe">
        <b>关于令牌：</b>令牌只存在这台设备的浏览器里，只会发给 GitHub（api.github.com），不会发给本站或任何别的地方。
        但任何能在这个网站上运行脚本的东西都能读到它，所以<b>只给它 gist 权限</b>。在公用电脑上用完，请点“断开同步”。
      </p>
    </template>

    <div v-else class="sync-on">
      <div ref="live" class="sync-status" tabindex="-1" role="status" aria-live="polite">
        <b>{{ STATE_LABEL[s.state] }}</b>
        <span>账号 {{ v.login }} · 令牌 {{ v.tail }} · 上次同步：{{ ago(s.at, v.now) }}</span>
        <span v-if="s.msg" class="sync-msg" :class="{ bad: s.state === 'error' }">{{ s.msg }}</span>
        <span v-if="s.dirty && s.state !== 'syncing'">有改动还没推送到云端。</span>
      </div>
      <p v-if="s.remoteChanged" class="sync-notice">
        进度已从另一台设备更新。已经打开的页面要刷新才会显示。
        <button type="button" class="sync-b small" @click="reload">刷新页面</button>
      </p>
      <p>
        云端位置：<a :href="`https://gist.github.com/${v.login}/${v.gist}`" target="_blank" rel="noopener noreferrer">你的私密 Gist</a>
        （编号 <code>{{ v.gist }}</code>，第二台设备找不到时可填它）
      </p>
      <div class="sync-actions">
        <button type="button" class="sync-b" :disabled="busy || s.state === 'syncing'" @click="run(() => eng(m => m.syncNow()))">立即同步</button>
        <button v-if="code === 'gone'" type="button" class="sync-b warn" :disabled="busy" @click="run(() => eng(m => m.recreateGist()))">重新创建云端 Gist</button>
        <button v-if="code === 'corrupt'" type="button" class="sync-b warn" :disabled="busy" @click="run(() => eng(m => m.rebuildRemote()))">用本机进度重建云端文件</button>
        <button v-if="code === 'newer'" type="button" class="sync-b warn" @click="reload">刷新页面</button>
      </div>
      <form v-if="needToken" class="sync-form" @submit.prevent="replaceToken">
        <label for="sync-token2">换一个新令牌</label>
        <small><a :href="TOKEN_URL" target="_blank" rel="noopener noreferrer">重新创建令牌</a>（名称和 gist 权限已预填）。在 GitHub 页面最下面点“Generate token”，复制后粘贴到这里。</small>
        <input id="sync-token2" v-model="token" class="sync-input" type="password" autocomplete="off" spellcheck="false" />
        <button type="submit" class="sync-b pri" :disabled="busy || !token.trim()">保存新令牌</button>
      </form>

      <div v-if="backups.length" class="sync-backups">
        <b>恢复同步前的本机进度</b>
        <p class="dim">每次用云端内容覆盖本机之前，都会先留一份备份（最近 2 份）。恢复后，下次同步仍会把云端和别的设备上的进度合并回来；想彻底回到那时的进度，请先断开同步。</p>
        <ul>
          <li v-for="(b, i) in backups" :key="b.at">
            {{ fmtTime(b.at) }} · {{ b.reason }}
            <button type="button" class="sync-b small" :disabled="busy" @click="restore(i)">恢复</button>
          </li>
        </ul>
      </div>

      <button v-if="!confirmOff" type="button" class="sync-b small" @click="confirmOff = true">断开同步</button>
      <section v-else class="sync-confirm" aria-label="确认断开同步">
        <p>断开后，会删除这台设备上保存的令牌。本机的学习进度保留。</p>
        <label class="sync-check"><input v-model="delRemote" type="checkbox" /> 同时删除云端的 Gist（默认保留）</label>
        <div class="sync-actions">
          <button type="button" class="sync-b warn" :disabled="busy" @click="disconnect">确认断开</button>
          <button type="button" class="sync-b small" @click="confirmOff = false">取消</button>
        </div>
      </section>
    </div>

    <div class="sync-file">
      <h4>导出 / 导入文件（不需要账号）</h4>
      <p class="dim">也可以不用 GitHub，用文件在设备之间搬运进度。导出的文件不含令牌。</p>
      <div class="sync-actions">
        <button type="button" class="sync-b" :disabled="busy" @click="exportFile">导出进度文件</button>
        <label class="sync-b" for="sync-import">选择要导入的文件</label>
        <input id="sync-import" class="sync-file-input" type="file" accept=".json,application/json" @change="pickFile" />
      </div>
      <section v-if="file" class="sync-import" aria-label="导入文件">
        <p>
          <b>{{ file.name }}</b>：{{ file.chapters }} 章有记录，其中 {{ file.done }} 章已完成，{{ file.cards }} 道题在复习中<template v-if="file.at">，导出于 {{ fmtTime(file.at) }}</template>。
        </p>
        <p v-if="file.newer" class="sync-msg bad">这个文件来自更新版本的站点，请先刷新本页再导入。</p>
        <div v-else class="sync-actions">
          <button type="button" class="sync-b pri" :disabled="busy" @click="doImport('merge')">与本机进度合并</button>
          <button v-if="!confirmReplace" type="button" class="sync-b small" @click="confirmReplace = true">用文件替换本机进度…</button>
          <template v-else>
            <span class="sync-msg bad">会先备份本机进度，然后用文件的内容替换。</span>
            <button type="button" class="sync-b warn" :disabled="busy" @click="doImport('replace')">确认替换</button>
            <button type="button" class="sync-b small" @click="confirmReplace = false">取消</button>
          </template>
        </div>
        <p v-if="v.enabled" class="dim">同步已开启：替换之后，下次同步仍会把云端的进度合并回来。</p>
      </section>
    </div>
    <div class="sync-result" role="status" aria-live="polite">
      <p v-if="msg" class="sync-msg" :class="msg.kind === 'err' ? 'bad' : 'good'">{{ msg.text }}</p>
    </div>
  </div>
</template>
