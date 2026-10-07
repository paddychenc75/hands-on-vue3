<template>
  <svg viewBox="0 0 400 246" style="max-width:480px" role="img" aria-label="解构只复制当时的值，之后和 state 断开。toRefs 创建的 ref 读写都转到 state.count，所以保持连接。">
      <defs>
        <marker id="refs-arrb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
      </defs>
      <text x="200" y="16" text-anchor="middle" font-size="15.5" fill="var(--muted)">执行 state.count++ 之后</text>
      <rect x="125" y="26" width="150" height="58" rx="7" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>
      <g text-anchor="middle" fill="var(--ink)" font-size="15.5">
        <text x="200" y="50" font-weight="700">state（代理）</text>
        <text x="200" y="72">count: 1</text>
      </g>
      <line x1="160" y1="86" x2="100" y2="146" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <g stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round">
        <line x1="122" y1="108" x2="138" y2="124"/><line x1="138" y1="108" x2="122" y2="124"/>
      </g>
      <line x1="242" y1="88" x2="298" y2="144" stroke="var(--accent)" stroke-width="2" marker-start="url(#refs-arrb)" marker-end="url(#refs-arrb)"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="100" y="166">let { count } = state</text>
        <text x="300" y="166">toRefs(state)</text>
      </g>
      <rect x="25" y="176" width="150" height="58" rx="6" fill="var(--sunken)" stroke="var(--muted)" stroke-dasharray="5 4"/>
      <rect x="208" y="176" width="184" height="58" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="100" y="200">count: 0</text>
        <text x="100" y="223" font-size="15.5" fill="var(--muted)">普通数字，不更新</text>
        <text x="300" y="200">count.value: 1</text>
        <text x="300" y="223" font-size="15.5">ref，连到 state.count</text>
      </g>
    </svg>
</template>
