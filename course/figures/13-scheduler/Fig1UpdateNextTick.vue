<template>
  <svg viewBox="0 0 400 340" style="max-width:480px" role="img" aria-label="三次修改只把更新任务加入队列一次。同步代码结束后，微任务统一更新 DOM，然后 nextTick 之后的代码运行。">
    <defs><marker id="scheduler-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
    <marker id="scheduler-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <text x="82" y="24" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">同步代码</text>
    <text x="228" y="24" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">更新队列</text>
    <text x="346" y="24" font-size="16" text-anchor="middle" font-weight="700" fill="var(--ink)">DOM</text>
    <rect x="12" y="40" width="140" height="32" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="82" y="61" font-size="16" text-anchor="middle" fill="var(--ink)">count = 1</text>
    <rect x="12" y="80" width="140" height="32" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="82" y="101" font-size="16" text-anchor="middle" fill="var(--ink)">count = 2</text>
    <rect x="12" y="120" width="140" height="32" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="82" y="141" font-size="16" text-anchor="middle" fill="var(--ink)">count = 3</text>
    <rect x="12" y="160" width="140" height="32" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="82" y="181" font-size="16" text-anchor="middle" fill="var(--ink)">await nextTick()</text>
    <rect x="168" y="40" width="120" height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="228" y="61" font-size="16" text-anchor="middle" fill="var(--ink)">加入 update</text>
    <rect x="168" y="80" width="120" height="32" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>
    <text x="228" y="101" font-size="15.5" text-anchor="middle" fill="var(--muted)">已在队列，跳过</text>
    <rect x="168" y="120" width="120" height="32" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>
    <text x="228" y="141" font-size="15.5" text-anchor="middle" fill="var(--muted)">已在队列，跳过</text>
    <line x1="152" y1="56" x2="166" y2="56" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-arr)"/>
    <line x1="152" y1="96" x2="166" y2="96" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-arr)"/>
    <line x1="152" y1="136" x2="166" y2="136" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-arr)"/>
    <rect x="304" y="40" width="84" height="32" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="346" y="61" font-size="16" text-anchor="middle" fill="var(--muted)">显示 0</text>
    <line x1="346" y1="72" x2="346" y2="226" stroke="var(--line)" stroke-dasharray="2 4"/>
    <line x1="8" y1="212" x2="392" y2="212" stroke="var(--muted)" stroke-dasharray="6 4"/>
    <rect x="120" y="201" width="160" height="22" fill="var(--surface)"/>
    <text x="200" y="217" font-size="15.5" text-anchor="middle" fill="var(--muted)">同步代码结束 · 微任务</text>
    <rect x="168" y="232" width="120" height="44" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="228" y="251" font-size="15.5" text-anchor="middle" fill="var(--ink)">flushJobs</text>
    <text x="228" y="268" font-size="15.5" text-anchor="middle" fill="var(--ink)">运行 update</text>
    <line x1="288" y1="254" x2="302" y2="254" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#scheduler-arr2)"/>
    <rect x="304" y="232" width="84" height="44" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="346" y="259" font-size="16" text-anchor="middle" fill="var(--ink)">显示 3</text>
    <path d="M30 192 V294" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#scheduler-arr)"/>
    <text x="38" y="250" font-size="15.5" fill="var(--muted)">等待</text>
    <rect x="12" y="296" width="140" height="32" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="82" y="317" font-size="15.5" text-anchor="middle" fill="var(--ink)">后面的代码运行</text>
    <rect x="304" y="296" width="84" height="32" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="346" y="317" font-size="15.5" text-anchor="middle" fill="var(--ink)">读到 3</text>
    <line x1="152" y1="312" x2="302" y2="312" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#scheduler-arr)"/>
    <text x="228" y="305" font-size="15.5" text-anchor="middle" fill="var(--muted)">读取 DOM</text>
  </svg>
</template>
