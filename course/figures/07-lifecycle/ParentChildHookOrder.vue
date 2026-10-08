<template>
  <svg viewBox="0 0 380 486" style="max-width:420px" role="img" aria-label="挂载时，父组件先开始，子组件先完成。整棵树的 DOM 插入页面后，onMounted 才运行。卸载的顺序相同。">
      <defs>
        <marker id="lifecycle-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
      </defs>
      <g text-anchor="middle" font-size="15.5" font-weight="700" fill="var(--ink)">
        <text x="110" y="20">父组件</text>
        <text x="280" y="20">子组件</text>
      </g>
      <g stroke="var(--line)" stroke-width="1.5" stroke-dasharray="2 4">
        <line x1="110" y1="30" x2="110" y2="480"/>
        <line x1="280" y1="30" x2="280" y2="480"/>
      </g>
      <line x1="12" y1="56" x2="12" y2="476" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#lifecycle-arr)"/>
      <g text-anchor="middle" font-size="14.5" fill="var(--muted)">
        <text x="195" y="47">挂载</text>
        <text x="195" y="333">卸载</text>
      </g>
      <g fill="var(--surface)" stroke="var(--muted)">
        <rect x="22" y="56" width="172" height="28" rx="5"/>
        <rect x="22" y="92" width="172" height="28" rx="5"/>
        <rect x="196" y="128" width="172" height="28" rx="5"/>
        <rect x="196" y="164" width="172" height="28" rx="5"/>
        <rect x="22" y="342" width="172" height="28" rx="5"/>
        <rect x="196" y="378" width="172" height="28" rx="5"/>
        <rect x="196" y="414" width="172" height="28" rx="5"/>
        <rect x="22" y="450" width="172" height="28" rx="5"/>
      </g>
      <rect x="22" y="200" width="346" height="28" rx="5" fill="var(--sunken)"/>
      <g fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5">
        <rect x="196" y="236" width="172" height="28" rx="5"/>
        <rect x="22" y="272" width="172" height="28" rx="5"/>
      </g>
      <g text-anchor="middle" font-size="14.5" fill="var(--ink)">
        <text x="110" y="75">① setup</text>
        <text x="110" y="111">② onBeforeMount</text>
        <text x="280" y="147">③ setup</text>
        <text x="280" y="183">④ onBeforeMount</text>
        <text x="195" y="219" font-size="14.5" fill="var(--muted)">整棵树的 DOM 插入页面</text>
        <text x="280" y="255" font-weight="700">⑤ onMounted</text>
        <text x="110" y="291" font-weight="700">⑥ onMounted</text>
        <text x="110" y="361">⑦ onBeforeUnmount</text>
        <text x="280" y="397">⑧ onBeforeUnmount</text>
        <text x="280" y="433">⑨ onUnmounted</text>
        <text x="110" y="469">⑩ onUnmounted</text>
      </g>
    </svg>
</template>
