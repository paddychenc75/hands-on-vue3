<template>
  <svg viewBox="0 0 400 270" style="max-width:480px" role="img" aria-label="容器组件连接路由、store 和 API；展示组件只接收 props，并发送事件。">
    <defs><marker id="patterns-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    <marker id="patterns-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="16" y="12" width="112" height="36" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="72" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">路由</text>
    <rect x="144" y="12" width="112" height="36" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="200" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">Pinia store</text>
    <rect x="272" y="12" width="112" height="36" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="328" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">API</text>
    <line x1="72" y1="48" x2="140" y2="96" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-arr)"/>
    <line x1="200" y1="48" x2="200" y2="96" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-arr)" marker-start="url(#patterns-arr)"/>
    <line x1="328" y1="48" x2="260" y2="96" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-arr)"/>
    <rect x="100" y="98" width="200" height="50" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="200" y="119" font-size="16" text-anchor="middle" fill="var(--ink)">UserPage · 容器组件</text>
    <text x="200" y="138" font-size="15.5" text-anchor="middle" fill="var(--muted)">获取数据，调用 store</text>
    <line x1="160" y1="148" x2="160" y2="206" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-arr)"/>
    <text x="152" y="182" font-size="15.5" text-anchor="end" fill="var(--muted)">props：user</text>
    <line x1="240" y1="208" x2="240" y2="150" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#patterns-arr2)"/>
    <text x="248" y="182" font-size="15.5" fill="var(--accent)">事件：follow</text>
    <rect x="100" y="208" width="200" height="50" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="200" y="229" font-size="16" text-anchor="middle" fill="var(--ink)">UserCard · 展示组件</text>
    <text x="200" y="248" font-size="15.5" text-anchor="middle" fill="var(--muted)">只依赖 props</text>
  </svg>
</template>
