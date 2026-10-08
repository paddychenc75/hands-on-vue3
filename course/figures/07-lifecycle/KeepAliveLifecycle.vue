<template>
  <svg viewBox="0 0 400 266" style="max-width:480px" role="img" aria-label="组件挂载后可以多次更新。在 KeepAlive 中，离开的组件进入缓存，不卸载。">
      <defs>
        <marker id="lifecycle-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
        <marker id="lifecycle-arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
      </defs>
      <g fill="var(--surface)" stroke="var(--muted)">
        <rect x="125" y="10" width="90" height="36" rx="6"/>
        <rect x="125" y="220" width="90" height="36" rx="6"/>
      </g>
      <rect x="125" y="120" width="90" height="40" rx="6" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.8"/>
      <rect x="304" y="120" width="90" height="40" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <g stroke="var(--muted)" stroke-width="1.5" fill="none" marker-end="url(#lifecycle-arr2)">
        <line x1="170" y1="48" x2="170" y2="117"/>
        <line x1="170" y1="162" x2="170" y2="217"/>
        <path d="M125 130 C95 116 95 164 125 152"/>
      </g>
      <g stroke="var(--accent)" stroke-width="1.5" marker-end="url(#lifecycle-arra)">
        <line x1="217" y1="130" x2="301" y2="130"/>
        <line x1="302" y1="150" x2="219" y2="150"/>
      </g>
      <g text-anchor="middle" fill="var(--ink)">
        <text x="170" y="33" font-size="15.5">setup</text>
        <text x="170" y="145" font-size="16" font-weight="700">已挂载</text>
        <text x="349" y="145" font-size="16" font-weight="700">缓存中</text>
        <text x="170" y="243" font-size="15.5">已卸载</text>
        <text x="349" y="184" font-size="15.5" fill="var(--muted)">KeepAlive</text>
        <text x="258" y="112" font-size="15.5" fill="var(--accent)">onDeactivated</text>
        <text x="258" y="176" font-size="15.5" fill="var(--accent)">onActivated</text>
      </g>
      <g font-size="15.5">
        <text x="180" y="80" fill="var(--ink)">onMounted</text>
        <text x="180" y="204" fill="var(--ink)">onUnmounted</text>
        <text x="4" y="136" fill="var(--ink)">数据改变</text>
        <text x="4" y="156" fill="var(--muted)">onUpdated</text>
      </g>
    </svg>
</template>
