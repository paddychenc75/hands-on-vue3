<template>
  <svg viewBox="0 0 360 178" style="max-width:440px" role="img" aria-label="头尾同步：第 1 步从头比较，a、b 的 key 相同，Vue 直接 patch。第 2 步从尾比较，g、f 也直接 patch。剩下中间部分：旧 c d e，新 e c d h。">
    <text x="4" y="31" font-size="15" font-weight="700" fill="var(--ink)">旧</text>
    <text x="4" y="99" font-size="15" font-weight="700" fill="var(--ink)">新</text>
    <g font-size="15" text-anchor="middle" fill="var(--ink)">
      <rect x="34" y="10" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="52" y="31.5">a</text>
      <rect x="74" y="10" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="92" y="31.5">b</text>
      <rect x="114" y="10" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="132" y="31.5">c</text>
      <rect x="154" y="10" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="172" y="31.5">d</text>
      <rect x="194" y="10" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="212" y="31.5">e</text>
      <rect x="234" y="10" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="252" y="31.5">f</text>
      <rect x="274" y="10" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="292" y="31.5">g</text>
      <rect x="34" y="78" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="52" y="99.5">a</text>
      <rect x="74" y="78" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="92" y="99.5">b</text>
      <rect x="114" y="78" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="132" y="99.5">e</text>
      <rect x="154" y="78" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="172" y="99.5">c</text>
      <rect x="194" y="78" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="212" y="99.5">d</text>
      <rect x="234" y="78" width="36" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="252" y="99.5">h</text>
      <rect x="274" y="78" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="292" y="99.5">f</text>
      <rect x="314" y="78" width="36" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="332" y="99.5">g</text>
    </g>
    <g stroke="var(--accent)" stroke-width="1.5">
      <line x1="52" y1="42" x2="52" y2="78"/><line x1="92" y1="42" x2="92" y2="78"/>
      <line x1="252" y1="42" x2="292" y2="78"/><line x1="292" y1="42" x2="332" y2="78"/>
    </g>
    <text x="34" y="136" font-size="15" fill="var(--accent)">① 头部同步：a b</text>
    <text x="350" y="136" font-size="15" text-anchor="end" fill="var(--accent)">② 尾部同步：g f</text>
    <text x="180" y="166" font-size="15" text-anchor="middle" fill="var(--muted)">剩下中间：旧 c d e → 新 e c d h</text>
  </svg>
</template>
