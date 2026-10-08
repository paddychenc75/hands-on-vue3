<template>
  <svg viewBox="0 0 440 330" style="max-width:520px" role="img" aria-label="watch 的流水线。侦听源变成 getter，getter 放进 ReactiveEffect。数据变化时调用 scheduler。scheduler 按 flush 把 job 放进更新队列、后置队列，或者直接运行。job 比较新旧值，先清理，再调用回调。">
    <defs><marker id="watchimpl-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <!-- 第一行：reactivity -->
    <rect x="8" y="14" width="96" height="40" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="56" y="39" font-size="15.5" text-anchor="middle" fill="var(--ink)">侦听源</text>
    <line x1="104" y1="34" x2="124" y2="34" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#watchimpl-arr)"/>
    <rect x="126" y="14" width="96" height="40" rx="6" fill="var(--sunken)" stroke="var(--line)"/>
    <text x="174" y="39" font-size="15.5" text-anchor="middle" fill="var(--ink)">getter</text>
    <line x1="222" y1="34" x2="242" y2="34" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#watchimpl-arr)"/>
    <rect x="244" y="14" width="188" height="40" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="338" y="39" font-size="15.5" text-anchor="middle" fill="var(--ink)">ReactiveEffect(getter)</text>
    <text x="338" y="72" font-size="14.5" text-anchor="middle" fill="var(--muted)">依赖变化时调用 scheduler</text>
    <line x1="338" y1="54" x2="338" y2="94" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#watchimpl-arr)"/>
    <!-- doWatch 虚线框 -->
    <rect x="8" y="98" width="424" height="118" rx="8" fill="none" stroke="var(--accent)" stroke-dasharray="5 4"/>
    <text x="18" y="116" font-size="14.5" fill="var(--muted)">runtime-core 的 doWatch 提供 scheduler</text>
    <rect x="16" y="130" width="124" height="74" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="78" y="152" font-size="15.5" text-anchor="middle" fill="var(--ink)">pre（默认）</text>
    <text x="78" y="172" font-size="14.5" text-anchor="middle" fill="var(--muted)">queueJob(job)</text>
    <text x="78" y="190" font-size="14.5" text-anchor="middle" fill="var(--muted)">带 PRE 标记</text>
    <rect x="158" y="130" width="124" height="74" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="220" y="152" font-size="15.5" text-anchor="middle" fill="var(--ink)">post</text>
    <text x="220" y="172" font-size="12.5" text-anchor="middle" fill="var(--muted)">queuePostRenderEffect</text>
    <text x="220" y="190" font-size="14.5" text-anchor="middle" fill="var(--muted)">(job)</text>
    <rect x="300" y="130" width="124" height="74" rx="6" fill="var(--surface)" stroke="var(--line)"/>
    <text x="362" y="152" font-size="15.5" text-anchor="middle" fill="var(--ink)">sync</text>
    <text x="362" y="172" font-size="14.5" text-anchor="middle" fill="var(--muted)">没有 scheduler</text>
    <text x="362" y="190" font-size="14.5" text-anchor="middle" fill="var(--muted)">直接运行 job</text>
    <!-- 汇入 job -->
    <line x1="78" y1="204" x2="78" y2="236" stroke="var(--muted)" stroke-width="1.5"/>
    <line x1="220" y1="204" x2="220" y2="236" stroke="var(--muted)" stroke-width="1.5"/>
    <line x1="362" y1="204" x2="362" y2="236" stroke="var(--muted)" stroke-width="1.5"/>
    <line x1="78" y1="236" x2="362" y2="236" stroke="var(--muted)" stroke-width="1.5"/>
    <line x1="220" y1="236" x2="220" y2="256" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#watchimpl-arr)"/>
    <rect x="8" y="258" width="424" height="58" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="220" y="280" font-size="15.5" text-anchor="middle" fill="var(--ink)">job：dirty 检查 → 重新运行 getter → 比较新旧值</text>
    <text x="220" y="300" font-size="15.5" text-anchor="middle" fill="var(--ink)">→ 清理上一次 → 调用回调(新值, 旧值, onCleanup)</text>
  </svg>
</template>
