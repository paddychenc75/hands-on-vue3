<template>
  <svg viewBox="0 0 440 430" style="max-width:520px" role="img" aria-label="挂载组件的流程：render 调用 patch，patch 按类型分发到 mountComponent，mountComponent 做三步，最后的 setupRenderEffect 运行渲染并 patch 子树，mounted 钩子放进后置队列。">
    <defs><marker id="runtime-m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
    <rect x="20" y="10" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="170" y="34" font-size="16" text-anchor="middle" fill="var(--ink)">render(vnode, container)</text>
    <rect x="20" y="66" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="170" y="90" font-size="16" text-anchor="middle" fill="var(--ink)">patch(null, vnode)：按类型分发</text>
    <rect x="20" y="122" width="300" height="38" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="170" y="146" font-size="15" text-anchor="middle" fill="var(--ink)">processComponent → mountComponent</text>
    <rect x="40" y="184" width="260" height="34" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="170" y="206" font-size="15.5" text-anchor="middle" fill="var(--ink)">① createComponentInstance</text>
    <rect x="40" y="230" width="260" height="34" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="170" y="252" font-size="15.5" text-anchor="middle" fill="var(--ink)">② setupComponent：props、setup()</text>
    <rect x="40" y="276" width="260" height="34" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="170" y="298" font-size="15.5" text-anchor="middle" fill="var(--ink)">③ setupRenderEffect</text>
    <rect x="20" y="330" width="300" height="38" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="170" y="354" font-size="16" text-anchor="middle" fill="var(--ink)">render() → patch(null, subTree)</text>
    <rect x="20" y="384" width="300" height="38" rx="8" fill="var(--surface)" stroke="var(--line)"/>
    <text x="170" y="408" font-size="16" text-anchor="middle" fill="var(--ink)">mounted 放进后置队列</text>
    <line x1="170" y1="48" x2="170" y2="64" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <line x1="170" y1="104" x2="170" y2="120" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <line x1="170" y1="160" x2="170" y2="182" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <line x1="170" y1="218" x2="170" y2="228" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <line x1="170" y1="264" x2="170" y2="274" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <line x1="170" y1="310" x2="170" y2="328" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <line x1="170" y1="368" x2="170" y2="382" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <path d="M320 349 H352 V85 H322" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#runtime-m)"/>
    <text x="360" y="198" font-size="15" fill="var(--accent)">子树里有</text>
    <text x="360" y="216" font-size="15" fill="var(--accent)">子组件时，</text>
    <text x="360" y="234" font-size="15" fill="var(--accent)">回到 patch</text>
    <text x="360" y="252" font-size="15" fill="var(--accent)">再挂载一遍</text>
  </svg>
</template>
