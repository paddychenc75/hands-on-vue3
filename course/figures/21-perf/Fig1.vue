<template>
  <svg viewBox="0 0 400 318" style="max-width:480px" role="img" aria-label="内层容器有全部行的高度。DOM 中只有可见区域和缓冲区中的行。滚动时，这些行换成新的内容。"><defs><marker id="perf1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="perf1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="110" y="12" width="80" height="270" rx="4" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="5 4"/>
    <rect x="114" y="98" width="72" height="8" rx="2" fill="var(--accent-soft)" stroke="none" stroke-width="0"/>
    <rect x="114" y="108" width="72" height="8" rx="2" fill="var(--accent-soft)" stroke="none" stroke-width="0"/>
    <rect x="114" y="118" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="128" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="138" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="148" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="158" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="168" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="178" width="72" height="8" rx="2" fill="var(--accent)" stroke="none" stroke-width="0"/>
    <rect x="114" y="188" width="72" height="8" rx="2" fill="var(--accent-soft)" stroke="none" stroke-width="0"/>
    <rect x="114" y="198" width="72" height="8" rx="2" fill="var(--accent-soft)" stroke="none" stroke-width="0"/>
    <rect x="104" y="116" width="92" height="72" rx="4" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="M90 14 V112" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#perf1-a)" marker-start="url(#perf1-a)"/>
    <text x="84" y="60" font-size="15.5" text-anchor="end" fill="var(--ink)">scrollTop</text>
    <text x="84" y="156" font-size="16" text-anchor="end" fill="var(--accent)" font-weight="700">可见区域</text>
    <text x="84" y="176" font-size="15.5" text-anchor="end" fill="var(--accent)">280px</text>
    <text x="206" y="50" font-size="16" text-anchor="start" fill="var(--muted)">空白，不渲染</text>
    <path d="M204 152 H196" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="208" y="144" font-size="16" text-anchor="start" fill="var(--accent)" font-weight="700">真实的 DOM 行</text>
    <text x="208" y="166" font-size="15.5" text-anchor="start" fill="var(--ink)">可见行 + 上下缓冲行</text>
    <text x="206" y="248" font-size="16" text-anchor="start" fill="var(--muted)">空白，不渲染</text>
    <text x="150" y="306" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">内层高度 = 行数 × 行高</text>
  </svg>
</template>
