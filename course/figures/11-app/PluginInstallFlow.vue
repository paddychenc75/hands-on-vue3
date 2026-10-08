<template>
  <svg viewBox="0 0 360 336" style="max-width:480px" role="img" aria-label="app.use 调用插件的 install。install 把资源注册到 app 上下文中，mount 之后所有组件都可以读取它们。">
    <defs><marker id="app-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    <marker id="app-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="6" y="8" width="164" height="36" rx="6"/><rect x="6" y="80" width="164" height="36" rx="6"/><rect x="6" y="290" width="164" height="36" rx="6"/>
      <rect x="192" y="290" width="162" height="36" rx="6"/>
    </g>
    <g font-size="14.5" text-anchor="middle" fill="var(--ink)">
      <text x="88" y="31">createApp(App)</text><text x="88" y="103">app.use(插件, 选项)</text><text x="88" y="313">app.mount('#app')</text>
      <text x="273" y="313">组件树</text>
    </g>
    <text x="192" y="31" font-size="14" fill="var(--muted)">创建 app 实例</text>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#app-arr)">
      <line x1="88" y1="44" x2="88" y2="78"/><line x1="88" y1="116" x2="88" y2="288"/><line x1="170" y1="308" x2="190" y2="308"/>
      <line x1="273" y1="290" x2="273" y2="268"/>
    </g>
    <text x="96" y="206" font-size="14" fill="var(--muted)">最后</text>
    <text x="281" y="284" font-size="14" fill="var(--ink)">读取</text>
    <rect x="192" y="80" width="162" height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="273" y="103" font-size="14.5" text-anchor="middle" fill="var(--ink)">install(app, 选项)</text>
    <g stroke="var(--accent)" stroke-width="1.5" marker-end="url(#app-arr2)"><line x1="170" y1="98" x2="190" y2="98"/><line x1="273" y1="116" x2="273" y2="138"/></g>
    <text x="181" y="74" font-size="14" text-anchor="middle" fill="var(--ink)">调用</text>
    <text x="281" y="132" font-size="14" fill="var(--ink)">注册</text>
    <rect x="192" y="140" width="162" height="126" rx="6" fill="var(--sunken)" stroke="var(--muted)"/>
    <text x="202" y="160" font-size="14.5" font-weight="700" fill="var(--ink)">app 上下文</text>
    <g fill="var(--surface)" stroke="var(--line)"><rect x="202" y="168" width="142" height="20" rx="3"/><rect x="202" y="192" width="142" height="20" rx="3"/><rect x="202" y="216" width="142" height="20" rx="3"/><rect x="202" y="240" width="142" height="20" rx="3"/></g>
    <g font-size="14" fill="var(--ink)"><text x="210" y="182">全局组件</text><text x="210" y="206">全局指令</text><text x="210" y="230">provide 的数据</text><text x="210" y="254">globalProperties</text></g>
  </svg>
</template>
