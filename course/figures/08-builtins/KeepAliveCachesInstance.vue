<template>
  <svg viewBox="0 0 360 290" style="max-width:480px" role="img" aria-label="没有 KeepAlive 时，切回 A 会创建新实例。有 KeepAlive 时，A 进入缓存，切回时恢复原来的实例。">
    <defs><marker id="builtins-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    <marker id="builtins-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <text x="8" y="16" font-size="14.5" font-weight="700" fill="var(--ink)">没有 KeepAlive</text>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="8" y="26" width="104" height="44" rx="6"/><rect x="128" y="26" width="104" height="44" rx="6"/><rect x="248" y="26" width="104" height="44" rx="6"/>
    </g>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#builtins-arr)"><line x1="112" y1="48" x2="126" y2="48"/><line x1="232" y1="48" x2="246" y2="48"/></g>
    <g font-size="14" text-anchor="middle" fill="var(--ink)">
      <text x="60" y="44" fill="var(--muted)">显示 A</text><text x="60" y="61">A 挂载</text>
      <text x="180" y="44" fill="var(--muted)">切到 B</text><text x="180" y="61" font-weight="700">A 卸载</text>
      <text x="300" y="44" fill="var(--muted)">切回 A</text><text x="300" y="61">新的 A 挂载</text>
      <text x="300" y="88" font-weight="700">输入的文字丢失</text>
    </g>
    <line x1="8" y1="104" x2="352" y2="104" stroke="var(--line)"/>
    <text x="8" y="126" font-size="14.5" font-weight="700" fill="var(--ink)">有 KeepAlive</text>
    <g fill="var(--surface)" stroke="var(--muted)">
      <rect x="8" y="136" width="104" height="44" rx="6"/><rect x="128" y="136" width="104" height="44" rx="6"/><rect x="248" y="136" width="104" height="44" rx="6"/>
    </g>
    <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#builtins-arr)"><line x1="112" y1="158" x2="126" y2="158"/><line x1="232" y1="158" x2="246" y2="158"/></g>
    <g font-size="14" text-anchor="middle" fill="var(--ink)">
      <text x="60" y="154" fill="var(--muted)">显示 A</text><text x="60" y="171">A 挂载</text>
      <text x="180" y="154" fill="var(--muted)">切到 B</text><text x="180" y="171">A 失活</text>
      <text x="300" y="154" fill="var(--muted)">切回 A</text><text x="300" y="171">A 激活</text>
    </g>
    <rect x="88" y="230" width="184" height="50" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="180" y="251" font-size="14.5" font-weight="700" text-anchor="middle" fill="var(--ink)">缓存 Map</text>
    <text x="180" y="270" font-size="14" text-anchor="middle" fill="var(--ink)">A 的实例和 DOM</text>
    <g stroke="var(--accent)" stroke-width="1.5" fill="none" marker-end="url(#builtins-arr2)">
      <line x1="180" y1="180" x2="180" y2="227"/>
      <path d="M272 255H300V183"/>
    </g>
    <text x="174" y="210" font-size="14" text-anchor="end" fill="var(--ink)">移入</text>
    <text x="306" y="206" font-size="14" fill="var(--ink)">取出</text>
    <text x="306" y="222" font-size="14" font-weight="700" fill="var(--ink)">状态保留</text>
  </svg>
</template>
