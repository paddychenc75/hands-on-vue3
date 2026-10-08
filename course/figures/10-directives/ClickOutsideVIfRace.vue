<template>
  <svg viewBox="0 0 360 270" style="max-width:480px" role="img" aria-label="指令放在 v-if 的菜单上时，菜单先挂载。同一个点击事件随后到达 document，所以菜单立即关闭。">
    <defs><marker id="directives-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker>
    <marker id="directives-arr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
    <g fill="var(--sunken)" stroke="var(--muted)"><rect x="8" y="4" width="84" height="26" rx="5"/><rect x="138" y="4" width="84" height="26" rx="5"/><rect x="268" y="4" width="84" height="26" rx="5"/></g>
    <g font-size="14.5" text-anchor="middle" fill="var(--ink)"><text x="50" y="22">按钮</text><text x="180" y="22">Vue</text><text x="310" y="22">document</text></g>
    <g stroke="var(--muted)" stroke-dasharray="3 3"><line x1="50" y1="30" x2="50" y2="262"/><line x1="180" y1="30" x2="180" y2="262"/><line x1="310" y1="30" x2="310" y2="262"/></g>
    <line x1="50" y1="62" x2="177" y2="62" stroke="var(--ink)" stroke-width="1.5" marker-end="url(#directives-arr2)"/>
    <text x="115" y="56" font-size="14" text-anchor="middle" fill="var(--ink)">1 open = true</text>
    <rect x="104" y="80" width="152" height="30" rx="5" fill="var(--surface)" stroke="var(--muted)"/>
    <text x="180" y="100" font-size="14" text-anchor="middle" fill="var(--ink)">2 微任务：挂载菜单</text>
    <line x1="180" y1="140" x2="307" y2="140" stroke="var(--ink)" stroke-width="1.5" marker-end="url(#directives-arr2)"/>
    <text x="245" y="134" font-size="14" text-anchor="middle" fill="var(--ink)">3 指令添加监听</text>
    <line x1="50" y1="186" x2="307" y2="186" stroke="var(--warn)" stroke-width="2" marker-end="url(#directives-arr3)"/>
    <text x="115" y="180" font-size="14" text-anchor="middle" fill="var(--ink)">4 同一个 click 冒泡</text>
    <rect x="246" y="204" width="110" height="44" rx="5" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.5"/>
    <text x="301" y="222" font-size="14" text-anchor="middle" fill="var(--ink)">5 新监听收到它</text>
    <text x="301" y="240" font-size="14" font-weight="700" text-anchor="middle" fill="var(--ink)">菜单立即关闭</text>
  </svg>
</template>
