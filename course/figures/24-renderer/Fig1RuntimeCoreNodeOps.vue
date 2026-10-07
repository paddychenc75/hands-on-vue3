<template>
  <svg viewBox="0 0 400 300" style="max-width:480px" role="img" aria-label="runtime-core 只通过 nodeOps 和 patchProp 操作节点。换一组函数，就换了渲染目标。"><defs><marker id="renderer1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="renderer1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="40" y="10" width="320" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">你的组件：模板、setup、响应式</text>
    <path d="M200 50 V70" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#renderer1-a)"/>
    <rect x="40" y="72" width="320" height="66" rx="7" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="96" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">runtime-core</text>
    <text x="200" y="120" font-size="15.5" text-anchor="middle" fill="var(--ink)">组件、虚拟节点、diff。不知道 DOM</text>
    <path d="M200 138 V158" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#renderer1-c)"/>
    <rect x="40" y="160" width="320" height="38" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="200" y="184" font-size="16" text-anchor="middle" fill="var(--accent)" font-weight="700">接口：nodeOps + patchProp</text>
    <path d="M110 198 V222" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#renderer1-a)"/>
    <path d="M290 198 V222" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#renderer1-a)"/>
    <rect x="4" y="224" width="192" height="66" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="100" y="248" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">runtime-dom</text>
    <text x="100" y="272" font-size="15.5" text-anchor="middle" fill="var(--ink)">调用 DOM API</text>
    <rect x="204" y="224" width="192" height="66" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="300" y="248" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">自定义渲染器</text>
    <text x="300" y="272" font-size="15.5" text-anchor="middle" fill="var(--ink)">修改对象树，画到 Canvas</text>
  </svg>
</template>
