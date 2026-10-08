<template>
  <svg viewBox="0 0 560 372" style="max-width:600px" role="img" aria-label="诊断四问：数据变了吗，副作用函数运行了吗，读到的是新值吗，运行次数合理吗。第一个回答否的位置，就是病因所在的类别。"><defs><marker id="pitfalls-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="pitfalls-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
    <rect x="10" y="10" width="270" height="58" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="145" y="35" font-size="15" text-anchor="middle" fill="var(--ink)" font-weight="700">1 数据真的变了吗？</text>
    <text x="145" y="54" font-size="12.5" text-anchor="middle" fill="var(--muted)">读原始对象或在 DevTools 里看</text>
    <path d="M280 39 H328" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#pitfalls-w)"/>
    <text x="304" y="32" font-size="13" text-anchor="middle" fill="var(--warn)">否</text>
    <rect x="330" y="10" width="220" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="440" y="35" font-size="15" text-anchor="middle" fill="var(--accent)" font-weight="700">数据没变</text>
    <text x="440" y="54" font-size="12.5" text-anchor="middle" fill="var(--muted)">写入没发生，或写到了副本</text>
    <path d="M145 68 V88" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pitfalls-a)"/>
    <text x="157" y="83" font-size="13" fill="var(--muted)">是</text>
    <rect x="10" y="90" width="270" height="58" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="145" y="115" font-size="15" text-anchor="middle" fill="var(--ink)" font-weight="700">2 副作用函数重新运行了吗？</text>
    <text x="145" y="134" font-size="12.5" text-anchor="middle" fill="var(--muted)">onTrigger / onRenderTriggered</text>
    <path d="M280 119 H328" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#pitfalls-w)"/>
    <text x="304" y="112" font-size="13" text-anchor="middle" fill="var(--warn)">否</text>
    <rect x="330" y="90" width="220" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="440" y="115" font-size="15" text-anchor="middle" fill="var(--accent)" font-weight="700">变了没触发</text>
    <text x="440" y="134" font-size="12.5" text-anchor="middle" fill="var(--muted)">没收集到依赖，或写到了代理之外</text>
    <path d="M145 148 V168" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pitfalls-a)"/>
    <text x="157" y="163" font-size="13" fill="var(--muted)">是</text>
    <rect x="10" y="170" width="270" height="58" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="145" y="195" font-size="15" text-anchor="middle" fill="var(--ink)" font-weight="700">3 运行时读到的是新值吗？</text>
    <text x="145" y="214" font-size="12.5" text-anchor="middle" fill="var(--muted)">在回调里打印，对比数据当前值</text>
    <path d="M280 199 H328" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#pitfalls-w)"/>
    <text x="304" y="192" font-size="13" text-anchor="middle" fill="var(--warn)">否</text>
    <rect x="330" y="170" width="220" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="440" y="195" font-size="15" text-anchor="middle" fill="var(--accent)" font-weight="700">读到旧值</text>
    <text x="440" y="214" font-size="12.5" text-anchor="middle" fill="var(--muted)">值是快照，或新旧引用相同</text>
    <path d="M145 228 V248" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pitfalls-a)"/>
    <text x="157" y="243" font-size="13" fill="var(--muted)">是</text>
    <rect x="10" y="250" width="270" height="58" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="145" y="275" font-size="15" text-anchor="middle" fill="var(--ink)" font-weight="700">4 运行次数合理吗？</text>
    <text x="145" y="294" font-size="12.5" text-anchor="middle" fill="var(--muted)">在回调里计数，对比操作次数</text>
    <path d="M280 279 H328" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#pitfalls-w)"/>
    <text x="304" y="272" font-size="13" text-anchor="middle" fill="var(--warn)">否</text>
    <rect x="330" y="250" width="220" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="440" y="275" font-size="15" text-anchor="middle" fill="var(--accent)" font-weight="700">触发太多</text>
    <text x="440" y="294" font-size="12.5" text-anchor="middle" fill="var(--muted)">循环、侦听范围太大、没停掉</text>
    <path d="M145 308 V328" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pitfalls-a)"/>
    <text x="157" y="323" font-size="13" fill="var(--muted)">是</text>
    <text x="145" y="350" font-size="14" text-anchor="middle" fill="var(--ink)">响应式没有问题，去查性能（第 35 章）</text>
  </svg>
</template>
