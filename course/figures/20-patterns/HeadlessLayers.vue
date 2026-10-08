<template>
  <svg viewBox="0 0 440 262" style="max-width:520px" role="img" aria-label="三层结构。第 3 层 StyledSelect 加标记和样式。第 2 层 ListboxRoot 是无渲染组件，用作用域插槽交出状态和绑定对象。第 1 层 useListbox 管状态、键盘和绑定对象。上层只依赖下一层。使用者可以从任意一层接入。">
    <defs><marker id="patterns-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <rect x="10" y="12" width="270" height="62" rx="8" fill="var(--surface)" stroke="var(--line)" stroke-width="1.5"/>
    <text x="145" y="36" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">第 3 层 StyledSelect</text>
    <text x="145" y="58" font-size="15" text-anchor="middle" fill="var(--muted)">标记 + 样式 + #option 插槽</text>
    <rect x="10" y="100" width="270" height="62" rx="8" fill="var(--surface)" stroke="var(--line)" stroke-width="1.5"/>
    <text x="145" y="124" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">第 2 层 ListboxRoot</text>
    <text x="145" y="146" font-size="15" text-anchor="middle" fill="var(--muted)">无渲染，作用域插槽交出状态</text>
    <rect x="10" y="188" width="270" height="62" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="145" y="212" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">第 1 层 useListbox</text>
    <text x="145" y="234" font-size="15" text-anchor="middle" fill="var(--muted)">状态、键盘、ARIA、绑定对象</text>
    <line x1="145" y1="74" x2="145" y2="98" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-hl)"/>
    <line x1="145" y1="162" x2="145" y2="186" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#patterns-hl)"/>
    <text x="156" y="91" font-size="14" fill="var(--muted)">用</text>
    <text x="156" y="179" font-size="14" fill="var(--muted)">用</text>
    <text x="300" y="40" font-size="15" fill="var(--ink)">只换选项内容</text>
    <text x="300" y="58" font-size="14" fill="var(--muted)">自由度：小</text>
    <text x="300" y="128" font-size="15" fill="var(--ink)">自己写标记</text>
    <text x="300" y="146" font-size="14" fill="var(--muted)">必须在模板里</text>
    <text x="300" y="216" font-size="15" fill="var(--ink)">标记随意</text>
    <text x="300" y="234" font-size="14" fill="var(--muted)">自由度：最大</text>
  </svg>
</template>
