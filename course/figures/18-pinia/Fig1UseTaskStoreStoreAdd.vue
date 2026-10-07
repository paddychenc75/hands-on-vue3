<template>
  <svg viewBox="0 0 400 250" style="max-width:480px" role="img" aria-label="三个组件调用 useTaskStore()，得到同一个 store。一个组件调用 add()，其他组件自动更新。"><defs><marker id="pinia1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="pinia1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="10" width="380" height="104" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="200" y="34" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">task store（只有一个实例）</text>
    <rect x="17" y="46" width="121" height="56" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="78" y="68" font-size="15.5" text-anchor="middle" fill="var(--muted)">state</text>
    <text x="78" y="91" font-size="16" text-anchor="middle" fill="var(--ink)">tasks</text>
    <rect x="140" y="46" width="120" height="56" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="68" font-size="15.5" text-anchor="middle" fill="var(--muted)">getter</text>
    <text x="200" y="91" font-size="16" text-anchor="middle" fill="var(--ink)">left</text>
    <rect x="262" y="46" width="121" height="56" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="322" y="68" font-size="15.5" text-anchor="middle" fill="var(--muted)">action</text>
    <text x="322" y="91" font-size="16" text-anchor="middle" fill="var(--ink)">add()</text>
    <rect x="10" y="182" width="110" height="58" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="65" y="205" font-size="16" text-anchor="middle" fill="var(--ink)">任务表单</text>
    <text x="65" y="228" font-size="15.5" text-anchor="middle" fill="var(--muted)">useTaskStore</text>
    <rect x="145" y="182" width="110" height="58" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="205" font-size="16" text-anchor="middle" fill="var(--ink)">剩余数量</text>
    <text x="200" y="228" font-size="15.5" text-anchor="middle" fill="var(--muted)">useTaskStore</text>
    <rect x="280" y="182" width="110" height="58" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="335" y="205" font-size="16" text-anchor="middle" fill="var(--ink)">任务列表</text>
    <text x="335" y="228" font-size="15.5" text-anchor="middle" fill="var(--muted)">useTaskStore</text>
    <path d="M65 180 V118" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#pinia1-c)"/>
    <text x="71" y="154" font-size="16" text-anchor="start" fill="var(--accent)">add()</text>
    <path d="M200 116 V178" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pinia1-a)"/>
    <text x="206" y="154" font-size="15.5" text-anchor="start" fill="var(--muted)">left</text>
    <path d="M335 116 V178" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pinia1-a)"/>
    <text x="341" y="154" font-size="15.5" text-anchor="start" fill="var(--muted)">tasks</text>
  </svg>
</template>
