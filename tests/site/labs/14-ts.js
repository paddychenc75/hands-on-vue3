// 第 14 章的实验台测试数据。格式见 tests/site/labs/02-template.js
module.exports = [
  {
    id: 'demo-macro', name: '五个标签页都能切换，左右两侧代码随之变化', pick: 0,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      const tabs = await body.locator('.tabs button').allTextContents()
      ok(tabs.length === 5, '有 5 个标签页（' + tabs.join('、') + '）')
      const expect = [/defineProps<\{/, /size = 'md'/, /defineEmits<\{/, /defineModel<string>/, /defineExpose\(\{ focus \}\)/]
      const out = [/required: true/, /__props\.size/, /emits: \['change', 'update'\]/, /_useModel/, /__expose/]
      for (let i = 0; i < 5; i++) {
        await body.locator('.tabs button').nth(i).click()
        const pres = await body.locator('pre.code').allTextContents()
        ok(pres.length === 2 && expect[i].test(pres[0]) && out[i].test(pres[1]), '标签页「' + tabs[i] + '」左右代码正确')
      }
    }
  }
]
