<template>
  <svg viewBox="0 0 400 330" style="max-width:480px" role="img" aria-label="编译器在构建时把 defineProps 和 defineEmits 替换为 props 和 emits 选项。运行时没有这两个函数。"><defs><marker id="ts1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="10" width="380" height="128" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="22" y="32" font-size="15.5" text-anchor="start" fill="var(--muted)">编译前：.vue 文件</text>
    <text x="22" y="58" font-size="16" text-anchor="start" fill="var(--ink)"><tspan fill="var(--accent)" font-weight="700">defineProps</tspan>&lt;{</text>
    <text x="40" y="80" font-size="16" text-anchor="start" fill="var(--ink)">title: string; size?: &#x27;sm&#x27; | &#x27;md&#x27;</text>
    <text x="22" y="102" font-size="16" text-anchor="start" fill="var(--ink)">}&gt;()</text>
    <text x="22" y="124" font-size="16" text-anchor="start" fill="var(--ink)"><tspan fill="var(--accent)" font-weight="700">defineEmits</tspan>&lt;{ close: [] }&gt;()</text>
    <path d="M200 140 V174" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#ts1-c)"/>
    <text x="208" y="162" font-size="15.5" text-anchor="start" fill="var(--accent)">编译器替换（构建时）</text>
    <rect x="10" y="178" width="380" height="144" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="22" y="200" font-size="15.5" text-anchor="start" fill="var(--muted)">编译后：组件选项</text>
    <text x="22" y="224" font-size="16" text-anchor="start" fill="var(--ink)"><tspan fill="var(--accent)" font-weight="700">props</tspan>: {</text>
    <text x="40" y="246" font-size="16" text-anchor="start" fill="var(--ink)">title: { type: String, required: true },</text>
    <text x="40" y="268" font-size="16" text-anchor="start" fill="var(--ink)">size: { type: String, required: false }</text>
    <text x="22" y="290" font-size="16" text-anchor="start" fill="var(--ink)">},</text>
    <text x="22" y="312" font-size="16" text-anchor="start" fill="var(--ink)"><tspan fill="var(--accent)" font-weight="700">emits</tspan>: ['close']</text>
  </svg>
</template>
