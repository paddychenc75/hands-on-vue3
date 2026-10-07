<template>
  <svg viewBox="0 0 400 270" style="max-width:480px" role="img" aria-label="一次刷新的顺序：pre 侦听器，组件更新（父组件先），post 回调，最后是 nextTick 回调。">
    <defs><marker id="scheduler-q" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <rect x="16" y="12" width="280" height="44" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="156" y="31" font-size="16.5" text-anchor="middle" fill="var(--ink)">① 前置任务</text>
    <text x="156" y="48" font-size="16" text-anchor="middle" fill="var(--muted)">flush: 'pre' 的侦听器</text>
    <rect x="16" y="76" width="280" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="156" y="95" font-size="16.5" text-anchor="middle" fill="var(--ink)">② 组件更新：修改 DOM</text>
    <text x="156" y="112" font-size="16" text-anchor="middle" fill="var(--muted)">父组件先更新，并同步更新子组件</text>
    <rect x="16" y="140" width="280" height="44" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="156" y="159" font-size="16.5" text-anchor="middle" fill="var(--ink)">③ 后置任务</text>
    <text x="156" y="176" font-size="16" text-anchor="middle" fill="var(--muted)">post 侦听器、onUpdated</text>
    <rect x="16" y="204" width="280" height="44" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="156" y="223" font-size="16.5" text-anchor="middle" fill="var(--ink)">④ nextTick 回调</text>
    <text x="156" y="240" font-size="16" text-anchor="middle" fill="var(--muted)">await nextTick() 之后的代码</text>
    <line x1="156" y1="56" x2="156" y2="74" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-q)"/>
    <line x1="156" y1="120" x2="156" y2="138" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-q)"/>
    <line x1="156" y1="184" x2="156" y2="202" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-q)"/>
    <path d="M310 14 H318 V54 H310" fill="none" stroke="var(--muted)"/>
    <text x="326" y="31" font-size="16" fill="var(--muted)">DOM 是</text>
    <text x="326" y="48" font-size="16" fill="var(--muted)">旧内容</text>
    <path d="M310 142 H318 V246 H310" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="326" y="190" font-size="16" fill="var(--accent)">DOM 是</text>
    <text x="326" y="207" font-size="16" fill="var(--accent)">新内容</text>
  </svg>
</template>
