<template>
  <svg viewBox="0 0 400 400" style="max-width:480px" role="img" aria-label="编译时：模板经过 parse、transform、generate 变成渲染函数。运行时：渲染函数返回 VNode 树，patch 更新 DOM。">
    <defs><marker id="compiler-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <text x="16" y="24" font-size="16" font-weight="700" fill="var(--ink)">编译时</text>
    <text x="16" y="42" font-size="15.5" fill="var(--muted)">Vite 构建时</text>
    <rect x="120" y="12" width="200" height="34" rx="17" fill="var(--surface)" stroke="var(--line)"/>
    <text x="220" y="34" font-size="16" text-anchor="middle" fill="var(--ink)">模板字符串</text>
    <line x1="220" y1="46" x2="220" y2="72" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#compiler-arr)"/>
    <text x="228" y="64" font-size="15.5" fill="var(--muted)">parse</text>
    <rect x="120" y="74" width="200" height="34" rx="17" fill="var(--surface)" stroke="var(--line)"/>
    <text x="220" y="96" font-size="16" text-anchor="middle" fill="var(--ink)">模板 AST</text>
    <line x1="220" y1="108" x2="220" y2="134" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#compiler-arr)"/>
    <text x="228" y="126" font-size="15.5" fill="var(--muted)">transform</text>
    <rect x="120" y="136" width="200" height="34" rx="17" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="220" y="158" font-size="16" text-anchor="middle" fill="var(--ink)">AST + PatchFlags</text>
    <line x1="220" y1="170" x2="220" y2="196" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#compiler-arr)"/>
    <text x="228" y="188" font-size="15.5" fill="var(--muted)">generate</text>
    <rect x="120" y="198" width="200" height="34" rx="17" fill="var(--surface)" stroke="var(--line)"/>
    <text x="220" y="220" font-size="16" text-anchor="middle" fill="var(--ink)">渲染函数代码</text>
    <line x1="8" y1="256" x2="392" y2="256" stroke="var(--muted)" stroke-dasharray="6 4"/>
    <text x="16" y="286" font-size="16" font-weight="700" fill="var(--ink)">运行时</text>
    <text x="16" y="304" font-size="15.5" fill="var(--muted)">浏览器中</text>
    <line x1="220" y1="232" x2="220" y2="278" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#compiler-arr)"/>
    <text x="228" y="272" font-size="15.5" fill="var(--muted)">调用</text>
    <rect x="120" y="280" width="200" height="34" rx="17" fill="var(--surface)" stroke="var(--line)"/>
    <text x="220" y="302" font-size="16" text-anchor="middle" fill="var(--ink)">VNode 树（带标记）</text>
    <line x1="220" y1="314" x2="220" y2="340" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#compiler-arr)"/>
    <text x="228" y="332" font-size="15.5" fill="var(--muted)">patch：只看标记</text>
    <rect x="120" y="342" width="200" height="34" rx="17" fill="var(--surface)" stroke="var(--line)"/>
    <text x="220" y="364" font-size="16" text-anchor="middle" fill="var(--ink)">DOM</text>
  </svg>
</template>
