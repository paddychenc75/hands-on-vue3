<template>
  <svg viewBox="0 0 460 440" style="max-width:540px" role="img" aria-label="组件更新的流程：数据改变触发 scheduler，任务进入更新队列，微任务里运行 job，渲染新子树并 patch，遇到子组件 vnode 时用 shouldUpdateComponent 判断是更新还是跳过。">
    <defs><marker id="runtime-u" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <rect x="80" y="10" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="230" y="34" font-size="16" text-anchor="middle" fill="var(--ink)">数据改变 → trigger</text>
    <rect x="80" y="64" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="230" y="88" font-size="16" text-anchor="middle" fill="var(--ink)">scheduler → queueJob(job)</text>
    <rect x="80" y="118" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="230" y="142" font-size="16" text-anchor="middle" fill="var(--ink)">微任务：flushJobs 运行 job</text>
    <rect x="80" y="172" width="300" height="38" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="230" y="196" font-size="16" text-anchor="middle" fill="var(--ink)">componentUpdateFn（更新分支）</text>
    <rect x="80" y="226" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="230" y="250" font-size="16" text-anchor="middle" fill="var(--ink)">render() → patch(旧子树, 新子树)</text>
    <rect x="80" y="280" width="300" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="230" y="297" font-size="15" text-anchor="middle" fill="var(--ink)">遇到子组件 vnode：updateComponent</text>
    <text x="230" y="314" font-size="15" text-anchor="middle" fill="var(--ink)">shouldUpdateComponent(n1, n2)</text>
    <rect x="6" y="364" width="212" height="62" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="112" y="385" font-size="15" text-anchor="middle" fill="var(--ink)">true：instance.next = n2</text>
    <text x="112" y="403" font-size="15" text-anchor="middle" fill="var(--ink)">instance.update()</text>
    <text x="112" y="420" font-size="14" text-anchor="middle" fill="var(--muted)">子组件同步更新</text>
    <rect x="242" y="364" width="212" height="62" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="348" y="385" font-size="15" text-anchor="middle" fill="var(--ink)">false：n2.el = n1.el</text>
    <text x="348" y="403" font-size="15" text-anchor="middle" fill="var(--ink)">instance.vnode = n2</text>
    <text x="348" y="420" font-size="14" text-anchor="middle" fill="var(--muted)">子组件跳过</text>
    <line x1="230" y1="48" x2="230" y2="62" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <line x1="230" y1="102" x2="230" y2="116" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <line x1="230" y1="156" x2="230" y2="170" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <line x1="230" y1="210" x2="230" y2="224" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <line x1="230" y1="264" x2="230" y2="278" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <path d="M160 320 L112 362" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <path d="M300 320 L348 362" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-u)"/>
    <text x="120" y="346" font-size="14" fill="var(--accent)">变了</text>
    <text x="326" y="346" font-size="14" fill="var(--accent)">没变</text>
  </svg>
</template>
