<template>
  <svg viewBox="0 0 400 256" style="max-width:480px" role="img" aria-label="ref 把值放在 value 属性中，reactive 用 Proxy 包住原始对象。读取时 Vue 记录依赖，修改时 Vue 通知依赖它的副作用函数。">
      <defs>
        <marker id="refs-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
        <marker id="refs-arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
      </defs>
      <g text-anchor="middle" fill="var(--ink)">
        <text x="100" y="18" font-size="15.5" font-weight="700">ref(0)</text>
        <text x="300" y="18" font-size="15.5" font-weight="700">reactive({ count: 0 })</text>
        <text x="100" y="38" font-size="15.5" fill="var(--muted)">读写 count.value</text>
        <text x="300" y="38" font-size="15.5" fill="var(--muted)">读写 state.count</text>
      </g>
      <rect x="25" y="48" width="150" height="86" rx="8" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
      <rect x="215" y="48" width="170" height="86" rx="8" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="6 3"/>
      <rect x="50" y="82" width="100" height="40" rx="5" fill="var(--sunken)" stroke="var(--muted)"/>
      <rect x="235" y="80" width="130" height="46" rx="5" fill="var(--sunken)" stroke="var(--muted)"/>
      <g text-anchor="middle" fill="var(--ink)" font-size="15.5">
        <text x="100" y="70" font-weight="700">ref 对象</text>
        <text x="300" y="70" font-weight="700">Proxy 代理</text>
        <text x="100" y="107" font-size="15.5">value: 0</text>
        <text x="300" y="99" font-size="15.5">{ count: 0 }</text>
        <text x="300" y="118" fill="var(--muted)">原始对象</text>
      </g>
      <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#refs-arr)">
        <line x1="72" y1="198" x2="72" y2="138"/>
        <line x1="272" y1="198" x2="272" y2="138"/>
      </g>
      <g stroke="var(--accent)" stroke-width="1.5" marker-end="url(#refs-arra)">
        <line x1="128" y1="136" x2="128" y2="196"/>
        <line x1="328" y1="136" x2="328" y2="196"/>
      </g>
      <g font-size="15.5">
        <g text-anchor="end" fill="var(--muted)">
          <text x="65" y="164">读取</text><text x="65" y="182">track</text>
          <text x="265" y="164">读取</text><text x="265" y="182">track</text>
        </g>
        <g text-anchor="start" fill="var(--accent)">
          <text x="135" y="164">修改</text><text x="135" y="182">trigger</text>
          <text x="335" y="164">修改</text><text x="335" y="182">trigger</text>
        </g>
      </g>
      <rect x="25" y="200" width="360" height="42" rx="6" fill="var(--surface)" stroke="var(--muted)"/>
      <text x="205" y="226" text-anchor="middle" font-size="15.5" fill="var(--ink)">副作用函数：渲染、computed、watch</text>
    </svg>
</template>
