<template>
  <svg viewBox="0 0 400 330" style="max-width:480px" role="img" aria-label="数据从假后端经 api 层进入 store，组件只读 store。操作反方向走：组件调用 store 的 action，action 调用 api 层，请求发往假后端。失败在 api 层变成 ApiError，store 把它存成状态，界面显示。"><defs><marker id="project-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="project-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <rect x="10" y="10" width="290" height="56" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="155" y="34" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">组件</text>
    <text x="155" y="56" font-size="15" text-anchor="middle" fill="var(--muted)">BoardView · TaskCard · TaskDetailView</text>
    <rect x="10" y="108" width="290" height="68" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="155" y="132" font-size="16" text-anchor="middle" fill="var(--ink)" font-weight="700">Pinia store</text>
    <text x="155" y="154" font-size="15" text-anchor="middle" fill="var(--ink)">byId · ids · loadState · notice</text>
    <text x="155" y="171" font-size="15" text-anchor="middle" fill="var(--muted)">load · add · move · remove</text>
    <rect x="10" y="218" width="290" height="44" rx="7" fill="var(--sunken)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="155" y="245" font-size="16" text-anchor="middle" fill="var(--ink)">api 层：fetch，失败变成 ApiError</text>
    <rect x="10" y="288" width="290" height="36" rx="7" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"/>
    <text x="155" y="311" font-size="16" text-anchor="middle" fill="var(--ink)">假后端 /api（内存数据）</text>
    <path d="M110 68 V104" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project-a)"/>
    <text x="40" y="92" font-size="14" text-anchor="start" fill="var(--muted)">调用 action</text>
    <path d="M200 106 V70" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#project-c)"/>
    <text x="208" y="92" font-size="14" text-anchor="start" fill="var(--accent)">读状态</text>
    <path d="M110 178 V214" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project-a)"/>
    <path d="M200 216 V180" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#project-c)"/>
    <path d="M110 264 V284" fill="none" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#project-a)"/>
    <path d="M200 286 V266" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#project-c)"/>
    <text x="316" y="152" font-size="14" text-anchor="start" fill="var(--accent)">失败也是</text>
    <text x="316" y="170" font-size="14" text-anchor="start" fill="var(--accent)">状态</text>
  </svg>
</template>
