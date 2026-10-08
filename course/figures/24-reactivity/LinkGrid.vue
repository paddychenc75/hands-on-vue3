<template>
  <svg viewBox="0 0 520 262" style="max-width:560px" role="img" aria-label="三个 Link 排成表格。每一行是一个订阅者的依赖链表，每一列是一个 Dep 的订阅者链表。">
    <defs>
      <marker id="reactivity-lg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    </defs>
    <!-- 列头：Dep -->
    <rect x="170" y="14" width="120" height="40" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="230" y="40" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">Dep a</text>
    <rect x="380" y="14" width="120" height="40" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="440" y="40" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">Dep b</text>
    <!-- 行头：订阅者 -->
    <rect x="8" y="86" width="104" height="48" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="60" y="116" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">订阅者 E1</text>
    <rect x="8" y="176" width="104" height="48" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="60" y="206" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">订阅者 E2</text>
    <!-- 三个 Link -->
    <rect x="170" y="86" width="120" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="230" y="107" font-size="16" text-anchor="middle" fill="var(--ink)">Link(E1, a)</text>
    <text x="230" y="125" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0</text>
    <rect x="380" y="86" width="120" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="440" y="107" font-size="16" text-anchor="middle" fill="var(--ink)">Link(E1, b)</text>
    <text x="440" y="125" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0</text>
    <rect x="170" y="176" width="120" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="230" y="197" font-size="16" text-anchor="middle" fill="var(--ink)">Link(E2, a)</text>
    <text x="230" y="215" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0</text>
    <!-- 订阅者 deps 指向第一个 Link -->
    <line x1="112" y1="110" x2="168" y2="110" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-lg)"/>
    <line x1="112" y1="200" x2="168" y2="200" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-lg)"/>
    <!-- 横向：订阅者的依赖链表（nextDep / prevDep） -->
    <line x1="292" y1="110" x2="378" y2="110" stroke="var(--accent)" stroke-width="1.5" marker-start="url(#reactivity-lg)" marker-end="url(#reactivity-lg)"/>
    <text x="335" y="102" font-size="15.5" text-anchor="middle" fill="var(--ink)">nextDep</text>
    <!-- 纵向：Dep 的订阅者链表（nextSub / prevSub） -->
    <line x1="230" y1="136" x2="230" y2="174" stroke="var(--accent)" stroke-width="1.5" marker-start="url(#reactivity-lg)" marker-end="url(#reactivity-lg)"/>
    <text x="240" y="160" font-size="15.5" fill="var(--ink)">nextSub</text>
    <!-- 列头到链表的说明 -->
    <text x="440" y="206" font-size="15.5" text-anchor="middle" fill="var(--muted)">E2 没有读 b</text>
    <text x="260" y="250" font-size="15.5" text-anchor="middle" fill="var(--muted)">E1 读了 a、b。E2 只读了 a。</text>
  </svg>
</template>
