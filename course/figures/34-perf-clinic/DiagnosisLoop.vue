<template>
  <svg viewBox="0 0 480 244" style="max-width:560px" role="img" aria-label="诊断流程的六步：复现、测量、定位、假设、验证、回归。验证没有达到预期时，回到假设。"><defs><marker id="clinic-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="clinic-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
    <rect x="10" y="20" width="130" height="62" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="75" y="45" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">1 复现</text>
    <text x="75" y="67" font-size="13" text-anchor="middle" fill="var(--muted)">固定的操作步骤</text>
    <rect x="175" y="20" width="130" height="62" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="240" y="45" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">2 测量</text>
    <text x="240" y="67" font-size="13" text-anchor="middle" fill="var(--muted)">记下基线数字</text>
    <rect x="340" y="20" width="130" height="62" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="405" y="45" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">3 定位</text>
    <text x="405" y="67" font-size="13" text-anchor="middle" fill="var(--muted)">哪个组件、哪份数据</text>
    <path d="M140 51 H173" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#clinic-a)"/>
    <path d="M305 51 H338" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#clinic-a)"/>
    <path d="M405 82 V108 H75 V130" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#clinic-a)"/>
    <rect x="10" y="132" width="130" height="62" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="75" y="157" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">4 假设</text>
    <text x="75" y="179" font-size="13" text-anchor="middle" fill="var(--muted)">写成可证伪的预测</text>
    <rect x="175" y="132" width="130" height="62" rx="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="240" y="157" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">5 验证</text>
    <text x="240" y="179" font-size="13" text-anchor="middle" fill="var(--muted)">只改一处，再测量</text>
    <rect x="340" y="132" width="130" height="62" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="405" y="157" font-size="16" text-anchor="middle" fill="var(--accent)" font-weight="700">6 回归</text>
    <text x="405" y="179" font-size="13" text-anchor="middle" fill="var(--muted)">数字写进预算和测试</text>
    <path d="M140 163 H173" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#clinic-a)"/>
    <path d="M305 163 H338" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#clinic-a)"/>
    <path d="M240 194 V214 H75 V196" fill="none" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#clinic-w)"/>
    <text x="240" y="234" font-size="13" text-anchor="middle" fill="var(--warn)">数字没按预测变化：撤销，换下一个假设</text>
  </svg>
</template>
