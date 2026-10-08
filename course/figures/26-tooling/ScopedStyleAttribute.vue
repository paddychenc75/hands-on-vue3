<template>
  <svg viewBox="0 0 400 270" style="max-width:480px" role="img" aria-label="编译器给选择器加上属性。父组件的属性只加到自己的元素和子组件的根元素上。"><defs><marker id="tool2-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="tool2-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="10" width="160" height="50" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="90" y="30" font-size="15.5" text-anchor="middle" fill="var(--muted)">源代码</text>
    <text x="90" y="51" font-size="16" text-anchor="middle" fill="var(--ink)">.card p</text>
    <path d="M172 35 H216" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#tool2-c)"/>
    <rect x="220" y="10" width="170" height="50" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="305" y="30" font-size="15.5" text-anchor="middle" fill="var(--muted)">编译后</text>
    <text x="305" y="51" font-size="16" text-anchor="middle" fill="var(--ink)">.card p[data-v-p]</text>
    <rect x="10" y="84" width="380" height="36" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="20" y="107" font-size="16" text-anchor="start" fill="var(--ink)">div.card  <tspan fill="var(--muted)">data-v-p</tspan></text>
    <text x="380" y="107" font-size="15.5" text-anchor="end" fill="var(--muted)">父组件</text>
    <rect x="34" y="130" width="356" height="36" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="44" y="153" font-size="16" text-anchor="start" fill="var(--ink)">p  <tspan fill="var(--muted)">data-v-p</tspan></text>
    <text x="380" y="153" font-size="15.5" text-anchor="end" fill="var(--accent)" font-weight="700">样式生效</text>
    <rect x="34" y="176" width="356" height="36" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="44" y="199" font-size="16" text-anchor="start" fill="var(--ink)">子组件根元素  <tspan fill="var(--muted)">data-v-p data-v-c</tspan></text>
    <rect x="58" y="222" width="332" height="36" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="68" y="245" font-size="16" text-anchor="start" fill="var(--ink)">p（子组件内部）  <tspan fill="var(--muted)">data-v-c</tspan></text>
    <text x="380" y="245" font-size="15.5" text-anchor="end" fill="var(--warn)" font-weight="700">不生效</text>
    <path d="M22 120 V194 H34" fill="none" stroke="var(--muted)" stroke-width="1.5"/>
    <path d="M22 148 H34" fill="none" stroke="var(--muted)" stroke-width="1.5"/>
    <path d="M46 212 V240 H58" fill="none" stroke="var(--muted)" stroke-width="1.5"/>
  </svg>
</template>
