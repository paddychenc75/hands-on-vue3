<template>
  <svg viewBox="0 0 400 200" style="max-width:480px" role="img" aria-label="在头部插入 X：用 index 作为 key 时，输入框的值 aaa 留在第 0 行；用 id 作为 key 时，值跟着 A 移动。">
    <text x="76" y="22" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">插入前</text>
    <text x="204" y="22" font-size="16" text-anchor="middle" font-weight="700" fill="var(--warn)">key = index</text>
    <text x="332" y="22" font-size="16" text-anchor="middle" font-weight="700" fill="var(--accent)">key = id</text>
    <g font-size="16" fill="var(--ink)">
      <rect x="16" y="36" width="120" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
      <text x="28" y="59">A</text><rect x="62" y="44" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/><text x="68" y="59" font-size="15.5">aaa</text>
      <rect x="16" y="80" width="120" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
      <text x="28" y="103">B</text><rect x="62" y="88" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/>
  
      <rect x="144" y="36" width="120" height="36" rx="6" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.5"/>
      <text x="156" y="59">X</text><rect x="190" y="44" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/><text x="196" y="59" font-size="15.5">aaa</text>
      <rect x="144" y="80" width="120" height="36" rx="6" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.5"/>
      <text x="156" y="103">A</text><rect x="190" y="88" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/>
      <rect x="144" y="124" width="120" height="36" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-dasharray="4 3"/>
      <text x="156" y="147">B</text><rect x="190" y="132" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/>
  
      <rect x="272" y="36" width="120" height="36" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-dasharray="4 3"/>
      <text x="284" y="59">X</text><rect x="318" y="44" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/>
      <rect x="272" y="80" width="120" height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <text x="284" y="103">A</text><rect x="318" y="88" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/><text x="324" y="103" font-size="15.5">aaa</text>
      <rect x="272" y="124" width="120" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
      <text x="284" y="147">B</text><rect x="318" y="132" width="66" height="20" rx="3" fill="var(--sunken)" stroke="var(--line)"/>
    </g>
    <text x="204" y="184" font-size="15.5" text-anchor="middle" fill="var(--warn)">aaa 留在第 0 行</text>
    <text x="332" y="184" font-size="15.5" text-anchor="middle" fill="var(--accent)">aaa 跟着 A</text>
  </svg>
</template>
