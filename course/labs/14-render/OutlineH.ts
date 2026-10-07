// h() 版本的递归大纲组件（旧 OutlineH）：渲染函数返回嵌套数组，Vue 当作 Fragment 渲染。
import { h } from 'vue'

const OutlineH: any = {
  props: ['nodes', 'level'],
  setup(props: any) {
    return () =>
      props.nodes.map((n: any) => [
        h('h' + Math.min(props.level, 6), { key: 't' + n.id }, n.title),
        n.children.length ? h(OutlineH, { key: 'c' + n.id, nodes: n.children, level: props.level + 1 }) : null
      ])
  }
}
export default OutlineH
