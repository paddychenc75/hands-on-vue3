<template>
  <svg viewBox="0 0 400 262" style="max-width:480px" role="img" aria-label="Vue 比较子组件的新旧 props。模板中的对象字面量每次都是新对象，所以子组件每次都更新。"><defs><marker id="perf2-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="perf2-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker><marker id="perf2-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
    <rect x="110" y="10" width="180" height="38" rx="7" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="34" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">父组件重新渲染</text>
    <path d="M200 48 V60 H104 V76" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#perf2-a)"/>
    <path d="M200 60 H296 V76" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#perf2-a)"/>
    <rect x="10" y="78" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="102" y="103" font-size="16" text-anchor="middle" fill="var(--ink)">:opt=&quot;{ a: 1 }&quot;</text>
    <path d="M102 118 V138" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#perf2-a)"/>
    <text x="108" y="132" font-size="15.5" text-anchor="start" fill="var(--muted)">比较 props</text>
    <rect x="10" y="140" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="102" y="165" font-size="16" text-anchor="middle" fill="var(--ink)">新对象 !== 旧对象</text>
    <path d="M102 180 V200" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#perf2-w)"/>
    <rect x="10" y="202" width="184" height="44" rx="7" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="2"/>
    <text x="102" y="229" font-size="16" text-anchor="middle" fill="var(--warn)" font-weight="700">子组件更新</text>
    <rect x="206" y="78" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="298" y="103" font-size="16" text-anchor="middle" fill="var(--ink)">:opt=&quot;opt&quot;</text>
    <path d="M298 118 V138" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#perf2-a)"/>
    <text x="304" y="132" font-size="15.5" text-anchor="start" fill="var(--muted)">比较 props</text>
    <rect x="206" y="140" width="184" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="298" y="165" font-size="16" text-anchor="middle" fill="var(--ink)">同一个对象 ===</text>
    <path d="M298 180 V200" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#perf2-c)"/>
    <rect x="206" y="202" width="184" height="44" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="298" y="229" font-size="16" text-anchor="middle" fill="var(--accent)" font-weight="700">跳过子组件</text>
  </svg>
</template>
