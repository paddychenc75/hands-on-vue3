<template>
  <svg viewBox="0 0 400 300" style="max-width:480px" role="img" aria-label="数据和方法在 useTasks 中。App 用 props 把任务传给 TaskItem。TaskItem 用事件通知 App 修改数据。"><defs><marker id="project1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="project1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="10" width="236" height="96" rx="7" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="22" y="34" font-size="16" text-anchor="start" fill="var(--ink)" font-weight="700">useTasks()</text>
    <text x="22" y="58" font-size="15.5" text-anchor="start" fill="var(--ink)">tasks（ref）</text>
    <text x="22" y="78" font-size="15.5" text-anchor="start" fill="var(--ink)">shown、left（computed）</text>
    <text x="22" y="98" font-size="15.5" text-anchor="start" fill="var(--ink)">add、toggle、remove</text>
    <rect x="282" y="10" width="108" height="44" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="336" y="37" font-size="15.5" text-anchor="middle" fill="var(--ink)">localStorage</text>
    <path d="M248 32 H278" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project1-a)"/>
    <text x="336" y="76" font-size="15.5" text-anchor="middle" fill="var(--muted)">watch：保存</text>
    <path d="M128 108 V130" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project1-a)"/>
    <text x="136" y="124" font-size="15.5" text-anchor="start" fill="var(--muted)">返回数据和方法</text>
    <rect x="10" y="132" width="380" height="54" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="155" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">App（看板）</text>
    <text x="200" y="177" font-size="15.5" text-anchor="middle" fill="var(--muted)">输入框、筛选按钮、v-for</text>
    <rect x="10" y="242" width="110" height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="65" y="270" font-size="16" text-anchor="middle" fill="var(--ink)">TaskItem</text>
    <rect x="145" y="242" width="110" height="46" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="270" font-size="16" text-anchor="middle" fill="var(--ink)">TaskItem</text>
    <path d="M200 188 V238" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project1-a)"/>
    <rect x="280" y="242" width="110" height="46" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="335" y="270" font-size="16" text-anchor="middle" fill="var(--ink)">…</text>
    <path d="M335 188 V238" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project1-a)"/>
    <path d="M34 188 V238" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project1-a)"/>
    <text x="40" y="218" font-size="15.5" text-anchor="start" fill="var(--muted)">props</text>
    <path d="M90 240 V190" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#project1-c)"/>
    <text x="96" y="218" font-size="15.5" text-anchor="start" fill="var(--accent)">emit 事件</text>
  </svg>
</template>
