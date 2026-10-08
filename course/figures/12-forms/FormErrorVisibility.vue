<template>
  <svg viewBox="0 0 360 274" style="max-width:480px" role="img" aria-label="错误从表单数据计算出来。只有字段有错误，并且用户离开过它或已经提交时，才显示错误。">
    <defs><marker id="forms-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="8" y="8" width="142" height="36" rx="6"/><rect x="8" y="80" width="154" height="36" rx="6"/><rect x="8" y="228" width="154" height="36" rx="6"/>
    </g>
    <g fill="var(--sunken)" stroke="var(--muted)">
      <rect x="214" y="8" width="140" height="36" rx="6"/><rect x="214" y="124" width="140" height="36" rx="6"/><rect x="214" y="184" width="140" height="36" rx="6"/>
    </g>
    <rect x="8" y="150" width="154" height="44" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <g font-size="14.5" text-anchor="middle" fill="var(--ink)">
      <text x="79" y="31">form（reactive）</text><text x="85" y="103">errors（computed）</text>
      <text x="85" y="168" font-weight="700">show(字段)</text><text x="85" y="251">字段下显示错误</text>
    </g>
    <text x="85" y="186" font-size="14" text-anchor="middle" fill="var(--ink)">两个条件同时满足</text>
    <g font-size="14" text-anchor="middle" fill="var(--ink)"><text x="284" y="31">用户输入</text><text x="284" y="147">touched：失去焦点</text><text x="284" y="207">submitted：已提交</text></g>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#forms-arr)">
      <line x1="214" y1="26" x2="153" y2="26"/><line x1="85" y1="44" x2="85" y2="77"/><line x1="85" y1="116" x2="85" y2="147"/>
      <line x1="214" y1="142" x2="165" y2="164"/><line x1="214" y1="202" x2="165" y2="182"/><line x1="85" y1="194" x2="85" y2="225"/>
    </g>
    <text x="183" y="17" font-size="14" text-anchor="middle" fill="var(--ink)">v-model</text>
    <text x="93" y="65" font-size="14" fill="var(--muted)">自动重新计算</text>
    <text x="93" y="136" font-size="14" fill="var(--muted)">有错误吗</text>
    <text x="93" y="214" font-size="14" fill="var(--muted)">true</text>
  </svg>
</template>
