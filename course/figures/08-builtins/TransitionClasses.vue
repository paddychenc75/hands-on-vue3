<template>
  <svg viewBox="0 0 360 232" style="max-width:480px" role="img" aria-label="进入和离开各用 3 个类名。active 覆盖整个过程，from 只存在 1 帧，to 一直保留到动画结束。">
    <g stroke="var(--muted)" stroke-dasharray="3 3" stroke-width="1">
      <line x1="150" y1="24" x2="150" y2="204"/><line x1="200" y1="24" x2="200" y2="204"/><line x1="340" y1="24" x2="340" y2="204"/>
    </g>
    <text x="10" y="17" font-size="14.5" font-weight="700" fill="var(--ink)">进入（元素插入）</text>
    <text x="10" y="41" font-size="14" fill="var(--ink)">v-enter-from</text>
    <rect x="150" y="28" width="50" height="18" rx="3" fill="var(--sunken)" stroke="var(--muted)"/>
    <text x="10" y="65" font-size="14" fill="var(--ink)">v-enter-active</text>
    <rect x="150" y="52" width="190" height="18" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="245" y="65" font-size="14" text-anchor="middle" fill="var(--ink)">写 transition 属性</text>
    <text x="10" y="89" font-size="14" fill="var(--ink)">v-enter-to</text>
    <rect x="200" y="76" width="140" height="18" rx="3" fill="var(--info-soft)" stroke="var(--muted)"/>
    <text x="10" y="123" font-size="14.5" font-weight="700" fill="var(--ink)">离开（元素删除）</text>
    <text x="10" y="147" font-size="14" fill="var(--ink)">v-leave-from</text>
    <rect x="150" y="134" width="50" height="18" rx="3" fill="var(--sunken)" stroke="var(--muted)"/>
    <text x="10" y="171" font-size="14" fill="var(--ink)">v-leave-active</text>
    <rect x="150" y="158" width="190" height="18" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="245" y="171" font-size="14" text-anchor="middle" fill="var(--ink)">结束后删除元素</text>
    <text x="10" y="195" font-size="14" fill="var(--ink)">v-leave-to</text>
    <rect x="200" y="182" width="140" height="18" rx="3" fill="var(--info-soft)" stroke="var(--muted)"/>
    <g font-size="14" fill="var(--muted)" text-anchor="middle">
      <text x="150" y="222">开始</text><text x="200" y="222">下一帧</text><text x="340" y="222" text-anchor="end">动画结束</text>
    </g>
  </svg>
</template>
