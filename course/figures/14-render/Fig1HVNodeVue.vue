<template>
  <svg viewBox="0 0 400 418" style="max-width:480px" role="img" aria-label="模板编译为渲染函数。渲染函数调用 h() 返回 VNode 树。Vue 用 VNode 树创建和更新真实 DOM。">
    <defs><marker id="render-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <rect x="16" y="10" width="368" height="74" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="28" y="30" font-size="15.5" fill="var(--muted)">① 模板</text>
    <text x="40" y="52" font-size="16" fill="var(--ink)">&lt;div class="card"&gt;</text>
    <text v-pre x="56" y="72" font-size="16" fill="var(--ink)">&lt;h2&gt;{{ title }}&lt;/h2&gt;&lt;/div&gt;</text>
    <line x1="200" y1="84" x2="200" y2="110" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#render-arr)"/>
    <text x="208" y="102" font-size="15.5" fill="var(--muted)">编译器生成</text>
    <rect x="16" y="112" width="368" height="74" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="28" y="132" font-size="15.5" fill="var(--accent)">② 渲染函数：本章手写这一层</text>
    <text x="40" y="154" font-size="16" fill="var(--ink)">h('div', { class: 'card' },</text>
    <text x="56" y="174" font-size="16" fill="var(--ink)">[h('h2', title)])</text>
    <line x1="200" y1="186" x2="200" y2="212" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#render-arr)"/>
    <text x="208" y="204" font-size="15.5" fill="var(--muted)">调用，返回</text>
    <rect x="16" y="214" width="368" height="92" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="28" y="234" font-size="15.5" fill="var(--muted)">③ VNode 树（普通 JS 对象）</text>
    <rect x="40" y="248" width="120" height="44" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="100" y="267" font-size="15.5" text-anchor="middle" fill="var(--ink)">type: 'div'</text>
    <text x="100" y="284" font-size="15.5" text-anchor="middle" fill="var(--muted)">class: 'card'</text>
    <line x1="160" y1="270" x2="196" y2="270" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#render-arr)"/>
    <text x="178" y="262" font-size="15.5" text-anchor="middle" fill="var(--muted)">子</text>
    <rect x="198" y="248" width="160" height="44" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="278" y="267" font-size="15.5" text-anchor="middle" fill="var(--ink)">type: 'h2'</text>
    <text x="278" y="284" font-size="15.5" text-anchor="middle" fill="var(--muted)">children: 'Hello'</text>
    <line x1="200" y1="306" x2="200" y2="332" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#render-arr)"/>
    <text x="208" y="324" font-size="15.5" fill="var(--muted)">挂载或 patch</text>
    <rect x="16" y="334" width="368" height="76" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="28" y="354" font-size="15.5" fill="var(--muted)">④ 真实 DOM</text>
    <text x="40" y="377" font-size="16" fill="var(--ink)">&lt;div class="card"&gt;</text>
    <text x="56" y="398" font-size="16" fill="var(--ink)">&lt;h2&gt;Hello&lt;/h2&gt;&lt;/div&gt;</text>
  </svg>
</template>
