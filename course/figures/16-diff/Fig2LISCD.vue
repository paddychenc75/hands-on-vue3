<template>
  <svg viewBox="0 0 360 222" style="max-width:440px" role="img" aria-label="中间部分：每个新节点记下旧下标 + 1，得到 [5, 3, 4, 0]。0 表示没有旧节点。最长递增子序列（LIS）是 3、4，所以 c 和 d 不动。Vue 只移动 e，并挂载 h。">
    <defs><marker id="diff2-arrw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
    <g font-size="15" text-anchor="end" fill="var(--muted)">
      <text x="96" y="31">旧中间</text><text x="96" y="105">新中间</text><text x="96" y="152">旧下标 + 1</text><text x="96" y="182">操作</text>
    </g>
    <g font-size="15" text-anchor="middle" fill="var(--ink)">
      <rect x="104" y="10" width="52" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="130" y="31.5">c</text>
      <rect x="166" y="10" width="52" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="192" y="31.5">d</text>
      <rect x="228" y="10" width="52" height="32" rx="5" fill="var(--surface)" stroke="var(--muted)"/><text x="254" y="31.5">e</text>
      <rect x="104" y="84" width="52" height="32" rx="5" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="2"/><text x="130" y="105.5">e</text>
      <rect x="166" y="84" width="52" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="192" y="105.5">c</text>
      <rect x="228" y="84" width="52" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="254" y="105.5">d</text>
      <rect x="290" y="84" width="52" height="32" rx="5" fill="var(--info-soft)" stroke="var(--info)" stroke-dasharray="4 3"/><text x="316" y="105.5">h</text>
    </g>
    <g stroke="var(--accent)" stroke-width="1.5"><line x1="130" y1="42" x2="192" y2="84"/><line x1="192" y1="42" x2="254" y2="84"/></g>
    <line x1="254" y1="42" x2="134" y2="82" stroke="var(--warn)" stroke-width="2" marker-end="url(#diff2-arrw)"/>
    <g font-size="15" text-anchor="middle">
      <text x="130" y="152" fill="var(--ink)">5</text><text x="192" y="152" font-weight="700" fill="var(--accent)">3</text><text x="254" y="152" font-weight="700" fill="var(--accent)">4</text><text x="316" y="152" fill="var(--ink)">0</text>
      <text x="130" y="182" fill="var(--warn)">移动</text><text x="192" y="182" fill="var(--accent)">不动</text><text x="254" y="182" fill="var(--accent)">不动</text><text x="316" y="182" fill="var(--info)">挂载</text>
    </g>
    <path d="M170 190 V196 H276 V190" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="223" y="215" font-size="15" text-anchor="middle" fill="var(--accent)">LIS：3, 4</text>
  </svg>
</template>
