<template>
  <svg viewBox="0 0 400 214" style="max-width:480px" role="img" aria-label="直接解构只复制当时的值，之后不再同步。storeToRefs 返回连接到 store 的 ref。"><defs><marker id="pinia2-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="pinia2-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="34" width="118" height="160" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="69" y="22" font-size="15.5" text-anchor="middle" fill="var(--muted)">add() 之后</text>
    <text x="69" y="100" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">store</text>
    <text x="69" y="126" font-size="16" text-anchor="middle" fill="var(--ink)">left = 1</text>
    <rect x="232" y="34" width="158" height="64" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="311" y="58" font-size="16" text-anchor="middle" fill="var(--ink)">{ left } = store</text>
    <text x="311" y="84" font-size="16" text-anchor="middle" fill="var(--warn)" font-weight="700">left：0</text>
    <rect x="232" y="130" width="158" height="64" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="311" y="154" font-size="16" text-anchor="middle" fill="var(--ink)">storeToRefs(store)</text>
    <text x="311" y="180" font-size="16" text-anchor="middle" fill="var(--accent)" font-weight="700">left.value：1</text>
    <path d="M130 66 H228" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#pinia2-a)"/>
    <text x="180" y="58" font-size="15.5" text-anchor="middle" fill="var(--muted)">复制一次</text>
    <text x="180" y="86" font-size="15.5" text-anchor="middle" fill="var(--warn)">不再同步</text>
    <path d="M130 162 H228" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#pinia2-c)" marker-start="url(#pinia2-c)"/>
    <text x="180" y="154" font-size="15.5" text-anchor="middle" fill="var(--accent)">连接</text>
    <text x="180" y="182" font-size="15.5" text-anchor="middle" fill="var(--accent)">保持同步</text>
  </svg>
</template>
