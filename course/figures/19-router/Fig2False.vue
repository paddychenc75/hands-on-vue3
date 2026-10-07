<template>
  <svg viewBox="0 0 400 344" style="max-width:480px" role="img" aria-label="一次导航先匹配路由，再运行守卫。守卫返回 false 时取消，返回新地址时重新导航。"><defs><marker id="router1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="router1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="12" width="220" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="37.0" font-size="16" text-anchor="middle" fill="var(--ink)">URL 改变：/task/2</text>
    <rect x="10" y="76" width="220" height="56" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="98" font-size="16" text-anchor="middle" fill="var(--ink)">匹配 routes</text>
    <text x="120" y="120" font-size="15.5" text-anchor="middle" fill="var(--muted)">/task/:id → TaskDetail</text>
    <rect x="10" y="156" width="220" height="40" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="120" y="181.0" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">运行导航守卫</text>
    <rect x="10" y="220" width="220" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="245.0" font-size="16" text-anchor="middle" fill="var(--ink)">更新 currentRoute</text>
    <rect x="10" y="284" width="220" height="48" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="120" y="306" font-size="16" text-anchor="middle" fill="var(--ink)">RouterView</text>
    <text x="120" y="328" font-size="15.5" text-anchor="middle" fill="var(--muted)">显示 TaskDetail</text>
    <path d="M120 52 V74" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router1-a)"/>
    <text x="128" y="68" font-size="15.5" text-anchor="start" fill="var(--muted)">push 或点击链接</text>
    <path d="M120 132 V154" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router1-a)"/>
    <path d="M120 196 V218" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#router1-c)"/>
    <text x="128" y="212" font-size="15.5" text-anchor="start" fill="var(--accent)">全部通过</text>
    <path d="M120 260 V282" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router1-a)"/>
    <rect x="254" y="140" width="136" height="32" rx="7" fill="var(--warn-soft)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="322" y="161" font-size="15.5" text-anchor="middle" fill="var(--ink)">false：取消</text>
    <rect x="254" y="186" width="136" height="32" rx="7" fill="var(--warn-soft)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="322" y="207" font-size="15.5" text-anchor="middle" fill="var(--ink)">新地址：重定向</text>
    <path d="M232 168 L252 158" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router1-a)"/>
    <path d="M232 186 L252 200" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router1-a)"/>
    <path d="M390 202 H396 V32 H234" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#router1-a)"/>
    <text x="316" y="24" font-size="15.5" text-anchor="middle" fill="var(--muted)">从头再走一次</text>
  </svg>
</template>
