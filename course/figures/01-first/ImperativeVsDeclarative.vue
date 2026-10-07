<!-- 命令式和声明式的对比图。颜色用 CSS 变量，浅色和深色都有定义。 -->
<template>
  <svg viewBox="0 0 360 336" style="max-width:480px" role="img" aria-label="命令式代码自己修改每个节点。声明式代码只修改数据，Vue 按模板更新 DOM。">
    <defs>
      <marker id="first-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
      <marker id="first-arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
    </defs>
    <g text-anchor="middle" fill="var(--ink)">
      <text x="90" y="20" font-size="15.5" font-weight="700">命令式</text>
      <text x="90" y="40" font-size="14" fill="var(--muted)">你写每一步</text>
      <text x="270" y="20" font-size="15.5" font-weight="700">声明式</text>
      <text x="270" y="40" font-size="14" fill="var(--muted)">你只改数据</text>
    </g>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="15" y="54" width="150" height="32" rx="6"/>
      <rect x="15" y="106" width="150" height="32" rx="6"/>
      <rect x="15" y="158" width="150" height="32" rx="6"/>
      <rect x="15" y="210" width="150" height="32" rx="6"/>
      <rect x="15" y="262" width="150" height="32" rx="6"/>
      <rect x="195" y="54" width="150" height="32" rx="6"/>
      <rect x="195" y="262" width="150" height="32" rx="6"/>
    </g>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#first-arr)">
      <line x1="90" y1="86" x2="90" y2="104"/>
      <line x1="90" y1="138" x2="90" y2="156"/>
      <line x1="90" y1="190" x2="90" y2="208"/>
      <line x1="90" y1="242" x2="90" y2="260"/>
    </g>
    <rect x="195" y="106" width="150" height="136" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <rect x="210" y="138" width="120" height="30" rx="5" fill="var(--surface)" stroke="var(--muted)"/>
    <rect x="210" y="196" width="120" height="30" rx="5" fill="var(--surface)" stroke="var(--muted)"/>
    <g stroke="var(--accent)" stroke-width="1.5" marker-end="url(#first-arra)">
      <line x1="270" y1="86" x2="270" y2="104"/>
      <line x1="270" y1="168" x2="270" y2="194"/>
      <line x1="270" y1="242" x2="270" y2="260"/>
    </g>
    <g text-anchor="middle" font-size="14" fill="var(--ink)">
      <text x="90" y="75">count++</text>
      <text x="90" y="127">querySelector</text>
      <text x="90" y="179">改 textContent</text>
      <text x="90" y="231">改 style.color</text>
      <text x="90" y="283">页面更新</text>
      <text x="270" y="75">count.value++</text>
      <text x="270" y="128" fill="var(--accent)" font-weight="700">Vue 自动完成</text>
      <text x="270" y="158">按模板计算</text>
      <text x="270" y="216">修改 DOM</text>
      <text x="270" y="283">页面更新</text>
      <text x="90" y="320" fill="var(--muted)">漏写一步，页面出错</text>
      <text x="270" y="320" fill="var(--muted)">模板就是规则</text>
    </g>
  </svg>
</template>
