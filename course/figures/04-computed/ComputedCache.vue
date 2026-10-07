<template>
  <svg viewBox="0 0 400 194" style="max-width:480px" role="img" aria-label="方法在每次渲染时都运行。computed 只在依赖改变后重新运行，其他时候返回缓存。">
      <defs>
        <marker id="computed-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
      </defs>
      <g text-anchor="middle" fill="var(--ink)">
        <text x="170" y="20" font-size="15.5" font-weight="700">渲染 1</text>
        <text x="260" y="20" font-size="15.5" font-weight="700">渲染 2</text>
        <text x="350" y="20" font-size="15.5" font-weight="700">渲染 3</text>
        <g font-size="15.5" fill="var(--muted)">
          <text x="170" y="40">首次</text>
          <text x="260" y="40">其他数据变</text>
          <text x="350" y="40">依赖变</text>
        </g>
      </g>
      <g font-size="15.5" fill="var(--ink)">
        <text x="6" y="79">方法 calc()</text>
        <text x="6" y="133">computed</text>
      </g>
      <g fill="var(--sunken)" stroke="var(--muted)">
        <rect x="130" y="54" width="80" height="40" rx="5"/>
        <rect x="220" y="54" width="80" height="40" rx="5"/>
        <rect x="310" y="54" width="80" height="40" rx="5"/>
        <rect x="130" y="108" width="80" height="40" rx="5"/>
        <rect x="310" y="108" width="80" height="40" rx="5"/>
      </g>
      <rect x="220" y="108" width="80" height="40" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="170" y="79">运行</text>
        <text x="260" y="79">运行</text>
        <text x="350" y="79">运行</text>
        <text x="170" y="133">运行</text>
        <text x="260" y="133" fill="var(--accent)" font-weight="700">读缓存</text>
        <text x="350" y="133">运行</text>
      </g>
      <line x1="130" y1="174" x2="392" y2="174" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#computed-arr)"/>
      <text x="120" y="179" text-anchor="end" font-size="15.5" fill="var(--muted)">时间</text>
    </svg>
</template>
