<template>
  <svg viewBox="0 0 380 274" style="max-width:480px" role="img" aria-label="数据只从父组件流向子组件。子组件用事件通知父组件。父组件修改数据后，新的 props 再流向子组件。">
      <defs>
        <marker id="comm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker>
        <marker id="comm-arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
      </defs>
      <rect x="40" y="12" width="300" height="74" rx="8" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>
      <rect x="40" y="190" width="300" height="74" rx="8" fill="var(--sunken)" stroke="var(--muted)"/>
      <g text-anchor="middle" fill="var(--ink)">
        <text x="190" y="40" font-size="15.5" font-weight="700">父组件 TaskBoard</text>
        <text x="190" y="68" font-size="14.5">③ 拥有并修改 tasks</text>
        <text x="190" y="218" font-size="15.5" font-weight="700">子组件 TaskItem</text>
        <text x="190" y="246" font-size="14.5" fill="var(--muted)">只读 props，不修改</text>
      </g>
      <line x1="110" y1="88" x2="110" y2="186" stroke="var(--ink)" stroke-width="1.8" marker-end="url(#comm-arr)"/>
      <line x1="270" y1="188" x2="270" y2="90" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#comm-arra)"/>
      <g font-size="14.5">
        <text x="118" y="118" fill="var(--ink)" font-weight="700">① props 向下</text>
        <text x="118" y="137" font-size="14.5" fill="var(--muted)">:task="t"</text>
        <text x="262" y="160" text-anchor="end" fill="var(--accent)" font-weight="700">② 事件向上</text>
        <text x="262" y="179" text-anchor="end" font-size="14.5" fill="var(--muted)">emit('remove')</text>
      </g>
    </svg>
</template>
