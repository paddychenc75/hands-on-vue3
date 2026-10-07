<template>
  <svg viewBox="0 0 360 334" style="max-width:480px" role="img" aria-label="指令钩子跟随元素的生命周期。在 mounted 中添加监听，在 unmounted 中删除监听；组件每次更新都调用 beforeUpdate 和 updated。">
    <defs><marker id="directives-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#directives-arr)">
      <line x1="105" y1="34" x2="105" y2="42"/><line x1="105" y1="68" x2="105" y2="98"/><line x1="105" y1="124" x2="105" y2="160"/>
      <line x1="105" y1="186" x2="105" y2="194"/><line x1="105" y1="220" x2="105" y2="242"/><line x1="105" y1="268" x2="105" y2="298"/>
    </g>
    <path d="M40 208H26V174H38" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#directives-arr)"/>
    <g stroke="var(--muted)" stroke-dasharray="4 3"><line x1="40" y1="84" x2="352" y2="84"/><line x1="40" y1="146" x2="352" y2="146"/><line x1="40" y1="284" x2="352" y2="284"/></g>
    <g font-size="14" fill="var(--ink)" text-anchor="end"><text x="352" y="79">元素插入页面</text><text x="352" y="141">数据改变，组件重新渲染</text><text x="352" y="279">元素从页面移除</text></g>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="40" y="10" width="130" height="24" rx="5"/><rect x="40" y="44" width="130" height="24" rx="5"/>
      <rect x="40" y="162" width="130" height="24" rx="5"/><rect x="40" y="196" width="130" height="24" rx="5"/>
      <rect x="40" y="244" width="130" height="24" rx="5"/>
    </g>
    <g fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"><rect x="40" y="100" width="130" height="24" rx="5"/><rect x="40" y="300" width="130" height="24" rx="5"/></g>
    <g font-size="14.5" text-anchor="middle" fill="var(--ink)">
      <text x="105" y="27">created</text><text x="105" y="61">beforeMount</text><text x="105" y="117" font-weight="700">mounted</text>
      <text x="105" y="179">beforeUpdate</text><text x="105" y="213">updated</text><text x="105" y="261">beforeUnmount</text><text x="105" y="317" font-weight="700">unmounted</text>
    </g>
    <g font-size="14" fill="var(--muted)">
      <text x="180" y="27">属性和监听应用之前</text><text x="180" y="61">很少使用</text>
      <text x="180" y="179">读取更新前的 DOM</text><text x="180" y="213">按新值更新 DOM</text><text x="180" y="261">很少使用</text>
    </g>
    <g font-size="14" font-weight="700" fill="var(--accent)"><text x="180" y="117">聚焦、添加监听</text><text x="180" y="317">删除监听</text></g>
  </svg>
</template>
