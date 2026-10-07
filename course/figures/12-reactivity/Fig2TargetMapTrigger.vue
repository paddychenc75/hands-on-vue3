<template>
  <svg viewBox="0 0 400 250" style="max-width:480px" role="img" aria-label="targetMap 有三层：对象，属性，读取过这个属性的副作用函数。">
    <defs><marker id="reactivity-tm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <text x="50" y="22" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">WeakMap</text>
    <text x="176" y="22" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">Map</text>
    <text x="326" y="22" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">Set</text>
    <text x="50" y="40" font-size="15.5" text-anchor="middle" fill="var(--muted)">键：对象</text>
    <text x="176" y="40" font-size="15.5" text-anchor="middle" fill="var(--muted)">键：属性名</text>
    <text x="326" y="40" font-size="15.5" text-anchor="middle" fill="var(--muted)">副作用函数</text>
    <rect x="8" y="56" width="84" height="38" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="50" y="80" font-size="16" text-anchor="middle" fill="var(--ink)">state</text>
    <rect x="116" y="52" width="120" height="152" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>
    <line x1="92" y1="75" x2="114" y2="75" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-tm)"/>
    <rect x="124" y="60" width="104" height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="176" y="83" font-size="16" text-anchor="middle" fill="var(--ink)">price</text>
    <rect x="124" y="110" width="104" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="176" y="133" font-size="16" text-anchor="middle" fill="var(--ink)">qty</text>
    <rect x="124" y="160" width="104" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="176" y="183" font-size="16" text-anchor="middle" fill="var(--ink)">discount</text>
    <line x1="228" y1="78" x2="258" y2="78" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#reactivity-tm)"/>
    <line x1="228" y1="128" x2="258" y2="128" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-tm)"/>
    <line x1="228" y1="178" x2="258" y2="178" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#reactivity-tm)"/>
    <rect x="260" y="60" width="132" height="36" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="326" y="83" font-size="16" text-anchor="middle" fill="var(--ink)">总价、优惠提示</text>
    <rect x="260" y="110" width="132" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="326" y="133" font-size="16" text-anchor="middle" fill="var(--ink)">总价</text>
    <rect x="260" y="160" width="132" height="36" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="326" y="183" font-size="16" text-anchor="middle" fill="var(--ink)">优惠提示</text>
    <text x="200" y="236" font-size="15.5" text-anchor="middle" fill="var(--muted)">targetMap.get(state).get('price')</text>
  </svg>
</template>
