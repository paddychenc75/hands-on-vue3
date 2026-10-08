<template>
  <svg viewBox="0 0 400 300" style="max-width:480px" role="img" aria-label="读取时 track 把副作用函数存入 dep；写入时 trigger 从 dep 取出它，并重新运行它。">
    <defs>
      <marker id="reactivity-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
      <marker id="reactivity-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
    </defs>
    <rect x="16" y="16" width="140" height="44" rx="8" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="86" y="43" font-size="16" text-anchor="middle" fill="var(--ink)">副作用函数运行</text>
    <rect x="236" y="16" width="156" height="44" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="314" y="43" font-size="16" text-anchor="middle" fill="var(--ink)">state.price = 20</text>
    <rect x="16" y="120" width="140" height="44" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="86" y="147" font-size="16" text-anchor="middle" fill="var(--ink)">get 拦截 → track</text>
    <rect x="236" y="120" width="156" height="44" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="314" y="147" font-size="16" text-anchor="middle" fill="var(--ink)">set 拦截 → trigger</text>
    <rect x="60" y="230" width="280" height="54" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="200" y="252" font-size="16" text-anchor="middle" fill="var(--ink)">dep：price 的订阅者</text>
    <text x="200" y="273" font-size="15.5" text-anchor="middle" fill="var(--muted)">Set { 副作用函数 }</text>
    <line x1="86" y1="60" x2="86" y2="118" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-arr)"/>
    <text x="80" y="94" font-size="15.5" text-anchor="end" fill="var(--muted)">① 读取</text>
    <line x1="86" y1="164" x2="86" y2="228" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-arr)"/>
    <text x="80" y="201" font-size="15.5" text-anchor="end" fill="var(--muted)">② 存入</text>
    <line x1="314" y1="60" x2="314" y2="118" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-arr)"/>
    <text x="322" y="94" font-size="15.5" fill="var(--muted)">③ 写入</text>
    <line x1="314" y1="230" x2="314" y2="166" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-arr)"/>
    <text x="322" y="201" font-size="15.5" fill="var(--muted)">④ 取出</text>
    <path d="M236 142 H222 V38 H158" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#reactivity-arr2)"/>
    <text x="216" y="94" font-size="15.5" text-anchor="end" fill="var(--accent)">⑤ 重新运行</text>
  </svg>
</template>
