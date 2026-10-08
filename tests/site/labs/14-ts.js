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
  },
  {
    id: 'demo-props-compile', name: '六个标签页都能编译；条件类型报错；编辑代码后右边随之变化', pick: 1,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      const tabs = await body.locator('.tabs button').allTextContents()
      ok(tabs.length === 6, '有 6 个标签页（' + tabs.join('、') + '）')
      const out = () => body.locator('pre.code').textContent()
      await p.waitForFunction(() => !document.querySelector('pre.code')?.textContent.includes('正在加载'), null, { timeout: 15000 })
      let t = await out()
      ok(/id: \{ type: \[String, Number\], required: true \}/.test(t) && /emits: \["move", "remove"\]/.test(t), '类型声明页：id 是 [String, Number]，emits 有 move 和 remove')
      await body.locator('.tabs button').nth(2).click()
      t = await out()
      ok(/default: 'sm'/.test(t) && /default: \(\) =>/.test(t), '解构默认值页：default 和函数形式的数组默认值')
      await body.locator('.tabs button').nth(4).click()
      t = await out()
      ok(/Unresolvable type: TSConditionalType/.test(t), '整体条件类型页：编译失败，报 Unresolvable type')
      await body.locator('.tabs button').nth(5).click()
      t = await out()
      ok(/a: \{ type: null/.test(t), '单个 prop 条件类型页：type 是 null')
      await body.locator('.tabs button').nth(0).click()
      const ta = body.locator('textarea')
      const v = await ta.inputValue()
      await ta.fill(v.replace("size?: 'sm' | 'lg'", 'size?: number'))
      t = await out()
      ok(/size: \{ type: Number, required: false \}/.test(t), '把 size 改成 number 后，右边变成 Number')
    }
  }
]
