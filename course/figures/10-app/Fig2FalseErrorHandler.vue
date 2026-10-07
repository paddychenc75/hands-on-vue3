<template>
  <svg viewBox="0 0 360 246" style="max-width:480px" role="img" aria-label="错误从出错组件的父组件开始向上传递。任何钩子返回 false，传递停止；都没有返回 false 时，才调用 errorHandler。">
    <defs><marker id="app-arr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker>
    <marker id="app-arr4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="10" y="8" width="160" height="34" rx="6"/><rect x="10" y="72" width="160" height="34" rx="6"/><rect x="10" y="136" width="160" height="34" rx="6"/>
    </g>
    <rect x="10" y="200" width="160" height="34" rx="6" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.5"/>
    <g font-size="14.5" text-anchor="middle" fill="var(--ink)"><text x="90" y="30">App</text><text x="90" y="94">ErrorBoundary</text><text x="90" y="158">Layout</text><text x="90" y="222" font-weight="700">UserChart 抛出错误</text></g>
    <g stroke="var(--warn)" stroke-width="2" marker-end="url(#app-arr3)"><line x1="90" y1="200" x2="90" y2="173"/><line x1="90" y1="136" x2="90" y2="109"/></g>
    <g stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#app-arr4)"><line x1="90" y1="72" x2="90" y2="45"/><line x1="170" y1="25" x2="194" y2="25"/></g>
    <rect x="196" y="6" width="156" height="40" rx="6" fill="var(--sunken)" stroke="var(--muted)"/>
    <text x="274" y="22" font-size="14" text-anchor="middle" fill="var(--muted)">app.config.</text>
    <text x="274" y="39" font-size="14.5" text-anchor="middle" fill="var(--ink)">errorHandler</text>
    <text x="196" y="62" font-size="14" fill="var(--muted)">都没有返回 false 时调用</text>
    <text x="182" y="88" font-size="14" font-weight="700" fill="var(--warn)">返回 false：</text>
    <text x="182" y="104" font-size="14" font-weight="700" fill="var(--warn)">传递停止</text>
    <text x="182" y="158" font-size="14" fill="var(--ink)">钩子运行，继续向上</text>
    <text x="182" y="222" font-size="14" fill="var(--ink)">自己的钩子不运行</text>
  </svg>
</template>
