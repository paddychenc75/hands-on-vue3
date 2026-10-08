<template>
  <svg viewBox="0 0 400 240" style="max-width:480px" role="img" aria-label="Tabs 用 provide 提供上下文。每个 Tab 用 inject 读取 active，并调用 register 和 select。所有修改都经过 Tabs。">
    <defs><marker id="patterns-tab" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    <marker id="patterns-tab2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="12" y="24" width="150" height="192" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="87" y="50" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">Tabs</text>
    <text x="87" y="72" font-size="15.5" text-anchor="middle" fill="var(--muted)">provide(TabsKey)</text>
    <text x="22" y="104" font-size="15.5" fill="var(--ink)">tabs：[资料, 安全]</text>
    <text x="22" y="128" font-size="15.5" fill="var(--ink)">active（只读）</text>
    <text x="22" y="152" font-size="15.5" fill="var(--ink)">register()</text>
    <text x="22" y="176" font-size="15.5" fill="var(--ink)">select()</text>
    <rect x="268" y="24" width="124" height="60" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="330" y="49" font-size="16" text-anchor="middle" fill="var(--ink)">Tab 资料</text>
    <text x="330" y="70" font-size="15.5" text-anchor="middle" fill="var(--muted)">inject(TabsKey)</text>
    <rect x="268" y="156" width="124" height="60" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="330" y="181" font-size="16" text-anchor="middle" fill="var(--ink)">Tab 安全</text>
    <text x="330" y="202" font-size="15.5" text-anchor="middle" fill="var(--muted)">inject(TabsKey)</text>
    <line x1="162" y1="44" x2="266" y2="44" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-tab)"/>
    <text x="215" y="38" font-size="15.5" text-anchor="middle" fill="var(--muted)">读取 active</text>
    <line x1="266" y1="68" x2="164" y2="68" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#patterns-tab2)"/>
    <text x="215" y="86" font-size="15.5" text-anchor="middle" fill="var(--accent)">调用 select</text>
    <line x1="162" y1="176" x2="266" y2="176" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-tab)"/>
    <text x="215" y="170" font-size="15.5" text-anchor="middle" fill="var(--muted)">读取 active</text>
    <line x1="266" y1="200" x2="164" y2="200" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#patterns-tab2)"/>
    <text x="215" y="218" font-size="15.5" text-anchor="middle" fill="var(--accent)">调用 select</text>
  </svg>
</template>
