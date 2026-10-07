<template>
  <svg viewBox="0 0 400 262" style="max-width:480px" role="img" aria-label="用 props 时，中间组件必须逐层转交数据。用 provide 和 inject 时，后代组件直接取到祖先提供的数据。">
      <defs>
        <marker id="comm-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
        <marker id="comm-arra2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
      </defs>
      <g text-anchor="middle" font-size="15.5" font-weight="700" fill="var(--ink)">
        <text x="95" y="20">props 逐层传</text>
        <text x="264" y="20">provide / inject</text>
      </g>
      <g fill="var(--surface)" stroke="var(--muted)">
        <rect x="25" y="36" width="140" height="32" rx="5"/>
        <rect x="25" y="216" width="140" height="32" rx="5"/>
        <rect x="196" y="96" width="136" height="32" rx="5"/>
        <rect x="196" y="156" width="136" height="32" rx="5"/>
      </g>
      <g fill="var(--sunken)" stroke="var(--muted)" stroke-dasharray="5 3">
        <rect x="25" y="96" width="140" height="32" rx="5"/>
        <rect x="25" y="156" width="140" height="32" rx="5"/>
      </g>
      <g fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5">
        <rect x="196" y="36" width="136" height="32" rx="5"/>
        <rect x="196" y="216" width="136" height="32" rx="5"/>
      </g>
      <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#comm-arr2)">
        <line x1="95" y1="70" x2="95" y2="94"/>
        <line x1="95" y1="130" x2="95" y2="154"/>
        <line x1="95" y1="190" x2="95" y2="214"/>
      </g>
      <g stroke="var(--muted)" stroke-width="1.2">
        <line x1="264" y1="68" x2="264" y2="96"/>
        <line x1="264" y1="128" x2="264" y2="156"/>
        <line x1="264" y1="188" x2="264" y2="216"/>
      </g>
      <path d="M334 52 C394 52 394 232 334 232" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#comm-arra2)"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="95" y="57">App</text>
        <text x="95" y="117">Layout 只转交</text>
        <text x="95" y="177">Sidebar 只转交</text>
        <text x="95" y="237">Button 使用</text>
        <text x="264" y="57">App：provide</text>
        <text x="264" y="117" fill="var(--muted)">Layout</text>
        <text x="264" y="177" fill="var(--muted)">Sidebar</text>
        <text x="264" y="237">Button：inject</text>
      </g>
      <g font-size="15.5" fill="var(--muted)">
        <text x="103" y="87">:theme</text>
        <text x="103" y="147">:theme</text>
        <text x="103" y="207">:theme</text>
      </g>
      <text x="372" y="147" text-anchor="middle" font-size="15.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="5" paint-order="stroke">theme</text>
    </svg>
</template>
