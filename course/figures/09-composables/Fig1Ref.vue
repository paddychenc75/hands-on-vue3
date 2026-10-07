<template>
  <svg viewBox="0 0 360 262" style="max-width:480px" role="img" aria-label="两个组件调用同一个组合式函数，各自得到新的 ref。钩子注册到调用它的组件上。">
    <defs><marker id="composables-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <rect x="90" y="8" width="180" height="52" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="180" y="30" font-size="14.5" font-weight="700" text-anchor="middle" fill="var(--ink)">useMouse()</text>
    <text x="180" y="49" font-size="14" text-anchor="middle" fill="var(--ink)">每次调用都创建新的 ref</text>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#composables-arr)"><line x1="150" y1="60" x2="92" y2="116"/><line x1="210" y1="60" x2="268" y2="116"/></g>
    <text x="112" y="92" font-size="14" text-anchor="end" fill="var(--ink)">A 调用</text>
    <text x="248" y="92" font-size="14" fill="var(--ink)">B 调用</text>
    <g fill="var(--surface)" stroke="var(--muted)"><rect x="8" y="120" width="164" height="110" rx="6"/><rect x="188" y="120" width="164" height="110" rx="6"/></g>
    <g fill="var(--sunken)" stroke="var(--line)"><rect x="20" y="150" width="140" height="28" rx="4"/><rect x="20" y="188" width="140" height="28" rx="4"/><rect x="200" y="150" width="140" height="28" rx="4"/><rect x="200" y="188" width="140" height="28" rx="4"/></g>
    <g font-size="14" text-anchor="middle" fill="var(--ink)">
      <text x="90" y="141" font-size="14.5" font-weight="700">组件 A</text><text x="270" y="141" font-size="14.5" font-weight="700">组件 B</text>
      <text x="90" y="169">x、y：A 自己的 ref</text><text x="270" y="169">x、y：B 自己的 ref</text>
      <text x="90" y="207">监听随 A 卸载删除</text><text x="270" y="207">监听随 B 卸载删除</text>
    </g>
    <text x="180" y="252" font-size="14" text-anchor="middle" fill="var(--muted)">A 和 B 的数据互不影响</text>
  </svg>
</template>
