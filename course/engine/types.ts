/* 学习机制用到的全部类型：进度存储（localStorage['hands-on-vue3-v1']）的结构，以及复习卡片用的题目数据。
   只放类型，不放逻辑。结构对齐 hands-on-react 的 course/types.ts，按 Vue 课程的实际情况调整：
   一章有多道练习（React 一课一道），所以练习相关的字段按练习 id 存；章内自测按题号存。 */

/* ---------- 进度 ---------- */

/** 间隔复习卡片（Leitner 盒子）。键是 `章id#N`（章内自测）或 `章id#cN`（阶段测验专用题） */
export interface SrsCard {
  /** 当前盒子，0 到 SRS_DAYS.length - 1 */
  box: number
  /** 答题次数 */
  n: number
  /** 下次到期时间（毫秒时间戳） */
  due: number
  /** 最近一次答题时间 */
  last: number
}

/** 某个阶段测验的记录 */
export interface StageRecord {
  /** 答到一半离开时留下的记录，下次进入时按未通过结算 */
  pending?: { n: number; answered: number; right: number; at: number; weak: string[] }
  best?: number
  last?: number
  passed?: boolean
  passedAt?: number
  failedAt?: number
  /** 需要加强的章 id */
  weak?: string[]
}

/** 练习的两段代码：模板（Vue 模板）和脚本（setup 函数体） */
export interface CodePair {
  tpl: string
  js: string
}

/** 借助答案的标记：看过参考答案后通过。'solution' 是看过答案后改写通过，'rewrite' 是看过答案、点了重置后自己重写通过 */
export type ExerciseHelp = 'rewrite' | 'solution' | false

/** 一道练习的进度（按练习 id 存在所属章的 ex 里） */
export interface ExerciseProgress {
  /** 是否通过 */
  passed: boolean
  /** 练习编辑器里保存的草稿 */
  code?: CodePair
  /** 有效失败次数 */
  fails?: number
  /** 第一次有效失败的时间（毫秒时间戳），提示阶梯的分钟数从它算起 */
  firstFail?: number
  /** 上次失败代码的规范化形式（两段分别规范化） */
  lastFail?: CodePair
  /** 是否看过参考答案 */
  sawSol?: boolean
  /** 看过答案后点了重置，表示要自己重写 */
  rewrite?: boolean
  /** 填入半成品或参考答案之前，学习者自己的代码（用来找回）。点"重置"或找回后清掉 */
  stash?: CodePair
  /** 借助答案完成的标记（通过那一刻写入，之后不再改） */
  help?: ExerciseHelp
}

/** 一章的进度 */
export interface ChapterProgress {
  /** 章内自测：题号（从 0 起，本章第几道非先猜的自测）→ 选中的选项下标 */
  sc: Record<number, number>
  /** 章内自测：哪些题已经答过（只有第一次作答计入复习） */
  tried?: Record<number, boolean>
  /** 章内自测：每题首答是否正确 */
  first?: Record<number, boolean>
  /** 练习 id → 这道练习的进度 */
  ex: Record<string, ExerciseProgress>
  /** 本章是否完成（自动或手动标记） */
  done: boolean
  /** 第一次标记完成的时间 */
  doneAt?: number
  /** 自我解释的文字 */
  note?: string
  /** 自我解释：是否已展开对照要点 */
  sx?: boolean
}

/** 实验台"先猜"的记录。pick 是选中的选项序号；checked 为真表示已点"核对我的猜测" */
export interface PredictRecord {
  pick: number
  checked?: boolean
}

/** 上次阅读位置 */
export interface LastPos {
  path: string
  anchor: string
  h: string
  t: number
}

/** 进度存储的整体结构：章 id → 一章的进度，另有四个以 __ 开头的特殊键 */
export interface Progress {
  [chapterId: string]: any
  /** 先猜：实验台 id → 记录。"先猜"题不进复习卡片 */
  __pred?: Record<string, PredictRecord>
  /** 间隔复习卡片：卡片键 → 卡片 */
  __srs?: Record<string, SrsCard>
  /** 阶段测验记录：阶段号（1 到 6，见 course/stages.ts）→ 记录 */
  __stage?: Record<string, StageRecord>
  /** 上次阅读位置 */
  __last?: LastPos
}

/* ---------- 一章的完成标准（构建时从章节 Markdown 抽取） ---------- */

/** 判断一章是否完成所需的静态信息 */
export interface ChapterSpec {
  id: string
  /** 章内自测的正确选项下标，按题号排列。长度就是自测题数 */
  scAnswers: number[]
  /** 本章的练习 id */
  exercises: string[]
}

/* ---------- 复习卡片用的题目数据 ---------- */

/** 章内自测（virtual:course-selfchecks 里的一项）。key 是 `章id:序号`，题干、选项、解析已渲染成 HTML */
export interface SelfCheckData {
  key: string
  chapterId: string
  a: number
  stem: string
  opts: string[]
  explain: string
}

/** 综合测验题库的一行（labs/27-quiz/questions.ts 的 Q）：[题目, 选项（第一个是正确答案）, 解析, 章 id, 代码（可选）]。
    不存阶段号：题的阶段看它所属章的 stage */
export type QuizBankRow = readonly [string, readonly string[], string, string] | readonly [string, readonly string[], string, string, string]

/** 一张复习卡片背后的题目 */
export interface CardItem {
  /** 卡片键：`章id#N`（章内自测）或 `章id#cN`（阶段测验专用题） */
  key: string
  chapterId: string
  kind: 'sc' | 'check'
  /** N：自测题在本章自测块里的序号，或专用题在本章专用题里的序号（都从 0 起） */
  index: number
  stem: string
  options: string[]
  /** 正确选项在 options 里的下标 */
  answer: number
  explain: string
  /** 'html'：已渲染的 HTML（章内自测）；'text'：纯文本（综合测验题库） */
  format: 'html' | 'text'
  /** 题目附带的代码（只有综合测验题库有） */
  code?: string
  /** 阶段 1 到 6（只有综合测验题库有，由所属章的阶段推出；章内自测的阶段看所属章） */
  stage?: number
}
