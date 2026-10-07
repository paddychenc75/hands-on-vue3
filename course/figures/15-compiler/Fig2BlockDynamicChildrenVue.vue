<template>
  <svg viewBox="0 0 400 320" style="max-width:480px" role="img" aria-label="Block 把所有动态后代平铺到 dynamicChildren 数组。更新时只比较 p 和 li，跳过静态节点和层级。">
    <defs><marker id="compiler-blk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="130" y="12" width="140" height="36" rx="6" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>
    <text x="200" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">div（Block）</text>
    <line x1="200" y1="48" x2="68" y2="90" stroke="var(--line)" stroke-width="1.5"/>
    <line x1="200" y1="48" x2="200" y2="90" stroke="var(--line)" stroke-width="1.5"/>
    <line x1="200" y1="48" x2="332" y2="90" stroke="var(--line)" stroke-width="1.5"/>
    <rect x="16" y="90" width="104" height="36" rx="6" fill="var(--sunken)" stroke="var(--line)" stroke-dasharray="4 3"/>
    <text x="68" y="113" font-size="16" text-anchor="middle" fill="var(--muted)">h1 静态</text>
    <rect x="140" y="90" width="120" height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="200" y="113" font-size="16" text-anchor="middle" fill="var(--ink)">p · TEXT 1</text>
    <rect x="280" y="90" width="104" height="36" rx="6" fill="var(--sunken)" stroke="var(--line)" stroke-dasharray="4 3"/>
    <text x="332" y="113" font-size="16" text-anchor="middle" fill="var(--muted)">ul 静态</text>
    <line x1="332" y1="126" x2="238" y2="166" stroke="var(--line)" stroke-width="1.5"/>
    <line x1="332" y1="126" x2="340" y2="166" stroke="var(--line)" stroke-width="1.5"/>
    <rect x="196" y="166" width="84" height="36" rx="6" fill="var(--sunken)" stroke="var(--line)" stroke-dasharray="4 3"/>
    <text x="238" y="189" font-size="16" text-anchor="middle" fill="var(--muted)">li 静态</text>
    <rect x="288" y="166" width="104" height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="340" y="189" font-size="15.5" text-anchor="middle" fill="var(--ink)">li · CLASS 2</text>
    <rect x="40" y="258" width="320" height="44" rx="8" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="200" y="286" font-size="16" text-anchor="middle" fill="var(--ink)">dynamicChildren：[ p, li ]</text>
    <path d="M192 126 L172 256" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#compiler-blk)"/>
    <path d="M340 202 L262 256" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#compiler-blk)"/>
    <text x="16" y="160" font-size="15.5" fill="var(--muted)">openBlock() 收集</text>
    <text x="16" y="179" font-size="15.5" fill="var(--muted)">带 PatchFlag 的节点</text>
  </svg>
</template>
