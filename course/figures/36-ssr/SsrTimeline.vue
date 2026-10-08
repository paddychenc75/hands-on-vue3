<template>
  <svg viewBox="0 0 400 336" style="max-width:480px" role="img" aria-label="SSR 先发送 HTML，用户马上看到内容。水合完成后，按钮等元素才能交互。"><defs><marker id="ssr1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <text x="24" y="16" font-size="15.5" text-anchor="middle" fill="var(--muted)">时间</text>
    <path d="M24 24 V324" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#ssr1-a)"/>
    <rect x="40" y="26" width="350" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="46" y="33" width="58" height="26" rx="5" fill="var(--sunken)" stroke="none" stroke-width="0"/>
    <text x="75" y="51" font-size="15.5" text-anchor="middle" fill="var(--ink)">服务器</text>
    <text x="114" y="51" font-size="16" text-anchor="start" fill="var(--ink)">运行组件：renderToString</text>
    <rect x="40" y="76" width="350" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="46" y="83" width="58" height="26" rx="5" fill="var(--sunken)" stroke="none" stroke-width="0"/>
    <text x="75" y="101" font-size="15.5" text-anchor="middle" fill="var(--ink)">服务器</text>
    <text x="114" y="101" font-size="16" text-anchor="start" fill="var(--ink)">发送 HTML 和状态数据</text>
    <rect x="40" y="126" width="350" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="46" y="133" width="58" height="26" rx="5" fill="var(--info-soft)" stroke="none" stroke-width="0"/>
    <text x="75" y="151" font-size="15.5" text-anchor="middle" fill="var(--ink)">浏览器</text>
    <text x="114" y="151" font-size="16" text-anchor="start" fill="var(--ink)">显示 HTML</text>
    <rect x="276" y="133" width="106" height="26" rx="13" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.2"/>
    <text x="329" y="151" font-size="15.5" text-anchor="middle" fill="var(--warn)" font-weight="700">可见，不能点</text>
    <rect x="40" y="176" width="350" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="46" y="183" width="58" height="26" rx="5" fill="var(--info-soft)" stroke="none" stroke-width="0"/>
    <text x="75" y="201" font-size="15.5" text-anchor="middle" fill="var(--ink)">浏览器</text>
    <text x="114" y="201" font-size="16" text-anchor="start" fill="var(--ink)">下载并运行 JS</text>
    <rect x="40" y="226" width="350" height="40" rx="7" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>
    <rect x="46" y="233" width="58" height="26" rx="5" fill="var(--info-soft)" stroke="none" stroke-width="0"/>
    <text x="75" y="251" font-size="15.5" text-anchor="middle" fill="var(--ink)">浏览器</text>
    <text x="114" y="251" font-size="16" text-anchor="start" fill="var(--ink)" font-weight="700">水合：复用 DOM，加事件</text>
    <rect x="40" y="276" width="350" height="40" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <rect x="46" y="283" width="58" height="26" rx="5" fill="var(--info-soft)" stroke="none" stroke-width="0"/>
    <text x="75" y="301" font-size="15.5" text-anchor="middle" fill="var(--ink)">浏览器</text>
    <text x="114" y="301" font-size="16" text-anchor="start" fill="var(--ink)">水合完成</text>
    <rect x="276" y="283" width="106" height="26" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2"/>
    <text x="329" y="301" font-size="15.5" text-anchor="middle" fill="var(--accent)" font-weight="700">可以交互</text>
  </svg>
</template>
