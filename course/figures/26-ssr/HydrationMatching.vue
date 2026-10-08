<template>
  <svg viewBox="0 0 400 292" style="max-width:480px" role="img" aria-label="水合时，Vue 逐个比较虚拟节点和已有的 DOM 节点。匹配时复用节点。不匹配时按类型处理。"><defs><marker id="ssr2-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker><marker id="ssr2-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
    <text x="70" y="22" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">虚拟节点</text>
    <text x="330" y="22" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">已有 DOM</text>
    <text x="70" y="40" font-size="15.5" text-anchor="middle" fill="var(--muted)">浏览器</text>
    <text x="330" y="40" font-size="15.5" text-anchor="middle" fill="var(--muted)">服务器发来</text>
    <rect x="4" y="52" width="132" height="44" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="264" y="52" width="132" height="44" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2"/>
    <text x="70" y="79" font-size="16" text-anchor="middle" fill="var(--ink)">&lt;button&gt;点击</text>
    <text x="330" y="79" font-size="16" text-anchor="middle" fill="var(--ink)">&lt;button&gt;点击</text>
    <path d="M138 74 H262" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#ssr2-c)" marker-start="url(#ssr2-c)"/>
    <text x="200" y="67" font-size="15.5" text-anchor="middle" fill="var(--accent)" font-weight="700">匹配</text>
    <text x="200" y="93" font-size="15.5" text-anchor="middle" fill="var(--ink)">复用，加事件</text>
    <rect x="4" y="110" width="132" height="44" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="264" y="110" width="132" height="44" rx="7" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.2"/>
    <text x="70" y="137" font-size="16" text-anchor="middle" fill="var(--ink)">&lt;p&gt;client</text>
    <text x="330" y="137" font-size="16" text-anchor="middle" fill="var(--ink)">&lt;p&gt;server</text>
    <path d="M138 132 H262" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#ssr2-w)" marker-start="url(#ssr2-w)"/>
    <text x="200" y="125" font-size="15.5" text-anchor="middle" fill="var(--warn)" font-weight="700">文字不同</text>
    <text x="200" y="151" font-size="15.5" text-anchor="middle" fill="var(--ink)">改为 client</text>
    <rect x="4" y="168" width="132" height="44" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="264" y="168" width="132" height="44" rx="7" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.2"/>
    <text x="70" y="195" font-size="16" text-anchor="middle" fill="var(--ink)">&lt;span&gt;</text>
    <text x="330" y="195" font-size="16" text-anchor="middle" fill="var(--ink)">&lt;div&gt;</text>
    <path d="M138 190 H262" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#ssr2-w)" marker-start="url(#ssr2-w)"/>
    <text x="200" y="183" font-size="15.5" text-anchor="middle" fill="var(--warn)" font-weight="700">元素不同</text>
    <text x="200" y="209" font-size="15.5" text-anchor="middle" fill="var(--ink)">删除，再创建</text>
    <rect x="4" y="226" width="132" height="44" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="264" y="226" width="132" height="44" rx="7" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.2"/>
    <text x="70" y="253" font-size="16" text-anchor="middle" fill="var(--ink)">class="b"</text>
    <text x="330" y="253" font-size="16" text-anchor="middle" fill="var(--ink)">class="a"</text>
    <path d="M138 248 H262" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#ssr2-w)" marker-start="url(#ssr2-w)"/>
    <text x="200" y="241" font-size="15.5" text-anchor="middle" fill="var(--warn)" font-weight="700">属性不同</text>
    <text x="200" y="267" font-size="15.5" text-anchor="middle" fill="var(--ink)">不改，只警告</text>
  </svg>
</template>
