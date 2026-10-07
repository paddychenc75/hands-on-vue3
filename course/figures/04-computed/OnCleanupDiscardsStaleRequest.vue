<template>
  <svg viewBox="0 0 400 200" style="max-width:480px" role="img" aria-label="请求 2 先返回并显示。请求 1 后返回，但 onCleanup 已经把它的 cancelled 设为 true，所以结果被丢弃。">
      <defs>
        <marker id="computed-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
      </defs>
      <g stroke="var(--muted)" stroke-dasharray="3 3">
        <line x1="80" y1="30" x2="80" y2="166"/>
        <line x1="150" y1="30" x2="150" y2="166"/>
      </g>
      <g text-anchor="middle" font-size="15.5" fill="var(--muted)">
        <text x="80" y="20">输入 a</text>
        <text x="150" y="20">输入 ab</text>
      </g>
      <g font-size="15.5" fill="var(--ink)">
        <text x="4" y="75">请求 1</text>
        <text x="4" y="131">请求 2</text>
      </g>
      <rect x="80" y="58" width="240" height="24" rx="4" fill="var(--sunken)" stroke="var(--muted)"/>
      <rect x="150" y="114" width="100" height="24" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="235" y="75">search('a')</text>
        <text x="200" y="131">search('ab')</text>
      </g>
      <circle cx="150" cy="70" r="5" fill="var(--accent)"/>
      <text x="156" y="102" font-size="15.5" fill="var(--accent)">onCleanup：cancelled = true</text>
      <g stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round">
        <line x1="314" y1="64" x2="326" y2="76"/><line x1="326" y1="64" x2="314" y2="76"/>
      </g>
      <text x="332" y="75" font-size="15.5" fill="var(--muted)">丢弃</text>
      <text x="250" y="158" text-anchor="middle" font-size="15.5" fill="var(--accent)" font-weight="700">显示 ab 的结果</text>
      <line x1="60" y1="184" x2="392" y2="184" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#computed-arr2)"/>
      <text x="52" y="189" text-anchor="end" font-size="15.5" fill="var(--muted)">时间</text>
    </svg>
</template>
