// 第 20 章实验台共用：provide/inject 的键和日志函数
import type { InjectionKey, Ref } from 'vue'

export interface TabsContext {
  active: Readonly<Ref<string>>
  register(tab: { name: string; title: string }): () => void
  select(name: string): void
}
export const TabsKey: InjectionKey<TabsContext> = Symbol('Tabs')
export const DepthKey: InjectionKey<number> = Symbol('depth')
// 日志函数由外壳 PatTabs 在创建时设置
export const tabsLog: { L: (cls: string, msg: string) => void } = { L: () => {} }
// 新建节点的序号，所有 TreeNode 共用
export const treeUid = { n: 100 }
