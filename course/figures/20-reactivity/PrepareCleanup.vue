<template>
  <svg viewBox="0 0 640 346" style="max-width:680px" role="img" aria-label="分支切换前后订阅者的依赖链表：首次运行后是 flag 和 a，重新运行时旧 Link 先标记为 -1，读到 flag 和 b 之后，a 的 Link 被摘除。">
    <defs>
      <marker id="reactivity-pc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    </defs>
    <text x="8" y="22" font-size="16" fill="var(--ink)" font-weight="700">① 首次运行后（flag 为 true）</text>
    <rect x="8" y="36" width="76" height="50" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="46" y="67" font-size="16" text-anchor="middle" fill="var(--ink)">effect</text>
    <rect x="112" y="36" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="187" y="57" font-size="16" text-anchor="middle" fill="var(--ink)">Link → flag</text>
    <text x="187" y="76" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0</text>
    <line x1="84" y1="61" x2="110" y2="61" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>
    <rect x="300" y="36" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="375" y="57" font-size="16" text-anchor="middle" fill="var(--ink)">Link → a</text>
    <text x="375" y="76" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0</text>
    <line x1="262" y1="61" x2="298" y2="61" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>

    <text x="8" y="130" font-size="16" fill="var(--ink)" font-weight="700">② flag 变为 false，重新运行，读完 flag 和 b</text>
    <rect x="8" y="144" width="76" height="50" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="46" y="175" font-size="16" text-anchor="middle" fill="var(--ink)">effect</text>
    <rect x="112" y="144" width="150" height="50" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="187" y="165" font-size="16" text-anchor="middle" fill="var(--ink)">Link → flag</text>
    <text x="187" y="184" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 1（恢复）</text>
    <line x1="84" y1="169" x2="110" y2="169" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>
    <rect x="300" y="144" width="150" height="50" rx="8" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="375" y="165" font-size="16" text-anchor="middle" fill="var(--ink)">Link → a</text>
    <text x="375" y="184" font-size="15.5" text-anchor="middle" fill="var(--muted)">version -1</text>
    <line x1="262" y1="169" x2="298" y2="169" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>
    <rect x="488" y="144" width="150" height="50" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="563" y="165" font-size="16" text-anchor="middle" fill="var(--ink)">Link → b</text>
    <text x="563" y="184" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0（新建）</text>
    <line x1="450" y1="169" x2="486" y2="169" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>

    <text x="8" y="238" font-size="16" fill="var(--ink)" font-weight="700">③ cleanupDeps 摘掉版本仍是 -1 的 Link</text>
    <rect x="8" y="252" width="76" height="50" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="46" y="283" font-size="16" text-anchor="middle" fill="var(--ink)">effect</text>
    <rect x="112" y="252" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="187" y="273" font-size="16" text-anchor="middle" fill="var(--ink)">Link → flag</text>
    <text x="187" y="292" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 1</text>
    <line x1="84" y1="277" x2="110" y2="277" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>
    <rect x="300" y="252" width="150" height="50" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="375" y="273" font-size="16" text-anchor="middle" fill="var(--ink)">Link → b</text>
    <text x="375" y="292" font-size="15.5" text-anchor="middle" fill="var(--muted)">version 0</text>
    <line x1="262" y1="277" x2="298" y2="277" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-pc)"/>
    <text x="488" y="282" font-size="15.5" fill="var(--muted)">a 的 Link 已摘除</text>
    <text x="320" y="334" font-size="15.5" text-anchor="middle" fill="var(--muted)">a.subs 不再包含这个 effect，改 a 不会通知它。</text>
  </svg>
</template>
