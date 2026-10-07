<template>
  <svg viewBox="0 0 400 318" style="max-width:480px" role="img" aria-label="开发时，Vite 不打包，只编译浏览器请求的文件。构建时，Vite 把全部代码打包到 dist/。"><defs><marker id="tool1-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="tool1-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="4" y="6" width="392" height="168" rx="10" fill="none" stroke="var(--line)" stroke-width="1.2"/>
    <text x="16" y="30" font-size="16" text-anchor="start" fill="var(--ink)" font-weight="700">npm run dev：按需编译</text>
    <rect x="16" y="44" width="104" height="118" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="68" y="108" font-size="16" text-anchor="middle" fill="var(--ink)">浏览器</text>
    <rect x="280" y="44" width="104" height="118" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="332" y="98" font-size="16" text-anchor="middle" fill="var(--ink)">Vite 服务器</text>
    <text x="332" y="120" font-size="15.5" text-anchor="middle" fill="var(--muted)">编译一个文件</text>
    <path d="M122 74 H276" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#tool1-a)"/>
    <text x="200" y="66" font-size="15.5" text-anchor="middle" fill="var(--ink)">请求 App.vue</text>
    <path d="M278 112 H124" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#tool1-a)"/>
    <text x="200" y="104" font-size="15.5" text-anchor="middle" fill="var(--ink)">返回 JS 模块</text>
    <path d="M278 150 H124" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#tool1-c)"/>
    <text x="200" y="142" font-size="15.5" text-anchor="middle" fill="var(--accent)">文件改变：热更新</text>
    <rect x="4" y="188" width="392" height="124" rx="10" fill="none" stroke="var(--line)" stroke-width="1.2"/>
    <text x="16" y="212" font-size="16" text-anchor="start" fill="var(--ink)" font-weight="700">npm run build：打包</text>
    <rect x="16" y="228" width="112" height="68" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="72" y="256" font-size="16" text-anchor="middle" fill="var(--ink)">src/</text>
    <text x="72" y="280" font-size="15.5" text-anchor="middle" fill="var(--muted)">全部源文件</text>
    <path d="M129 262 H142" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#tool1-a)"/>
    <rect x="144" y="228" width="112" height="68" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="200" y="256" font-size="16" text-anchor="middle" fill="var(--ink)">打包、压缩</text>
    <text x="200" y="280" font-size="15.5" text-anchor="middle" fill="var(--muted)">Rolldown</text>
    <path d="M257 262 H270" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#tool1-a)"/>
    <rect x="272" y="228" width="112" height="68" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="328" y="256" font-size="16" text-anchor="middle" fill="var(--ink)">dist/</text>
    <text x="328" y="280" font-size="15.5" text-anchor="middle" fill="var(--muted)">app.3f9a.js</text>
  </svg>
</template>
