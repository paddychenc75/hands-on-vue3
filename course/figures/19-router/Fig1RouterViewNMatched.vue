<template>
  <svg viewBox="0 0 400 282" style="max-width:480px" role="img" aria-label="每个 RouterView 有一个深度。深度为 n 的 RouterView 显示 to.matched[n] 的组件。"><defs><marker id="router2-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="router2-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <text x="10" y="34" font-size="16" text-anchor="start" fill="var(--ink)" font-weight="700">URL：/user/1/posts</text>
    <rect x="206" y="10" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="298" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">App</text>
    <path d="M298 50 V62" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <rect x="206" y="64" width="184" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="298" y="89" font-size="16" text-anchor="middle" fill="var(--ink)">RouterView 深度 0</text>
    <path d="M298 104 V116" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <rect x="206" y="118" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="298" y="143" font-size="16" text-anchor="middle" fill="var(--ink)">UserLayout</text>
    <path d="M298 158 V170" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <rect x="206" y="172" width="184" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="298" y="197" font-size="16" text-anchor="middle" fill="var(--ink)">RouterView 深度 1</text>
    <path d="M298 212 V224" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <rect x="206" y="226" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="298" y="251" font-size="16" text-anchor="middle" fill="var(--ink)">UserPosts</text>
    <rect x="10" y="54" width="160" height="52" rx="7" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="90" y="76" font-size="16" text-anchor="middle" fill="var(--ink)">to.matched[0]</text>
    <text x="90" y="97" font-size="15.5" text-anchor="middle" fill="var(--muted)">UserLayout 记录</text>
    <path d="M172 80 H202" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#router2-c)"/>
    <rect x="10" y="162" width="160" height="52" rx="7" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="90" y="184" font-size="16" text-anchor="middle" fill="var(--ink)">to.matched[1]</text>
    <text x="90" y="205" font-size="15.5" text-anchor="middle" fill="var(--muted)">UserPosts 记录</text>
    <path d="M172 188 H202" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#router2-c)"/>
  </svg>
</template>
