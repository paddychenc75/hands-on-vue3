<template>
  <svg viewBox="0 0 470 214" style="max-width:540px" role="img" aria-label="组件 A 的异步 setup 等 100 毫秒，组件 B 等 300 毫秒。renderToString 在 300 毫秒时一次发出整页。流式渲染在 0、100、300 毫秒各发出一块。">
    <text x="130" y="16" font-size="14" text-anchor="middle" fill="var(--muted)">0</text>
    <text x="230" y="16" font-size="14" text-anchor="middle" fill="var(--muted)">100</text>
    <text x="430" y="16" font-size="14" text-anchor="end" fill="var(--muted)">300 毫秒</text>
    <path d="M130 22 V28 M230 22 V28 M430 22 V28" fill="none" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="4" y="46" font-size="15.5" fill="var(--ink)">A 的 setup</text>
    <rect x="130" y="32" width="100" height="18" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2"/>
    <text x="4" y="74" font-size="15.5" fill="var(--ink)">B 的 setup</text>
    <rect x="130" y="60" width="300" height="18" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2"/>
    <text x="4" y="112" font-size="15.5" fill="var(--ink)" font-weight="700">renderToString</text>
    <path d="M130 108 H430" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <circle cx="430" cy="108" r="7" fill="var(--warn)"/>
    <text x="424" y="134" font-size="15.5" text-anchor="end" fill="var(--ink)">整页一次发出</text>
    <text x="4" y="170" font-size="15.5" fill="var(--ink)" font-weight="700">流式渲染</text>
    <path d="M130 166 H430" fill="none" stroke="var(--muted)" stroke-width="1.5"/>
    <circle cx="130" cy="166" r="7" fill="var(--accent)"/>
    <circle cx="230" cy="166" r="7" fill="var(--accent)"/>
    <circle cx="430" cy="166" r="7" fill="var(--accent)"/>
    <text x="130" y="194" font-size="14.5" text-anchor="middle" fill="var(--ink)">&lt;h1&gt;</text>
    <text x="230" y="194" font-size="14.5" text-anchor="middle" fill="var(--ink)">A 和 &lt;p&gt;</text>
    <text x="430" y="194" font-size="14.5" text-anchor="end" fill="var(--ink)">B 和 &lt;footer&gt;</text>
  </svg>
</template>
