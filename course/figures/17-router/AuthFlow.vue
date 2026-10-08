<template>
  <svg viewBox="0 0 400 330" style="max-width:480px" role="img" aria-label="登录鉴权流程：导航先等 restore，再检查登录和角色；未登录去登录页并带上 redirect，登录成功后回到 redirect；角色不符去 403。"><defs><marker id="router2-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="router2-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="10" width="220" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="35" font-size="16" text-anchor="middle" fill="var(--ink)">导航到 /admin（或刷新）</text>
    <rect x="10" y="76" width="220" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="120" y="101" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">await auth.restore()</text>
    <rect x="10" y="142" width="220" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="167" font-size="16" text-anchor="middle" fill="var(--ink)">需要登录，但没登录？</text>
    <rect x="10" y="208" width="220" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="233" font-size="16" text-anchor="middle" fill="var(--ink)">meta.roles 包含当前角色？</text>
    <rect x="10" y="274" width="220" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="299" font-size="16" text-anchor="middle" fill="var(--ink)">放行，显示 /admin</text>
    <path d="M120 50 V74" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <path d="M120 116 V140" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <path d="M120 182 V206" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <text x="128" y="200" font-size="15.5" text-anchor="start" fill="var(--muted)">否</text>
    <path d="M120 248 V272" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#router2-c)"/>
    <text x="128" y="266" font-size="15.5" text-anchor="start" fill="var(--accent)">是</text>
    <rect x="254" y="132" width="140" height="60" rx="7" fill="var(--warn-soft)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="324" y="154" font-size="15.5" text-anchor="middle" fill="var(--ink)">重定向到</text>
    <text x="324" y="176" font-size="15" text-anchor="middle" fill="var(--ink)">/login?redirect=…</text>
    <path d="M232 162 H252" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <text x="242" y="154" font-size="15.5" text-anchor="middle" fill="var(--muted)">是</text>
    <rect x="254" y="214" width="140" height="28" rx="7" fill="var(--warn-soft)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="324" y="233" font-size="15.5" text-anchor="middle" fill="var(--ink)">重定向到 /403</text>
    <path d="M232 228 H252" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router2-a)"/>
    <text x="242" y="222" font-size="15.5" text-anchor="middle" fill="var(--muted)">否</text>
    <path d="M324 132 V30 H232" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#router2-c)"/>
    <text x="330" y="86" font-size="15" text-anchor="start" fill="var(--accent)">登录成功后</text>
    <text x="330" y="106" font-size="15" text-anchor="start" fill="var(--accent)">replace(redirect)</text>
  </svg>
</template>
