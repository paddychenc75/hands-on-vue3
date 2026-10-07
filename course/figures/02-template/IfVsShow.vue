<!-- v-if 和 v-show 在条件为假时的区别。 颜色用 CSS 变量，浅色和深色都有定义。 -->
<template>
  <svg viewBox="0 0 400 240" style="max-width:480px" role="img" aria-label="条件变为假时，v-if 删除元素，只留一个注释占位。v-show 保留元素，只设置 display: none。">
      <defs>
        <marker id="template-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
      </defs>
      <g text-anchor="middle" font-size="16" font-weight="700" fill="var(--ink)">
        <text x="165" y="22">v-if</text>
        <text x="320" y="22">v-show</text>
      </g>
      <g font-size="15.5" fill="var(--muted)">
        <text x="6" y="67">ok 为真</text>
        <text x="6" y="177">ok 为假</text>
      </g>
      <g fill="var(--surface)" stroke="var(--muted)">
        <rect x="95" y="44" width="140" height="36" rx="5"/>
        <rect x="250" y="44" width="140" height="36" rx="5"/>
      </g>
      <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#template-arr2)">
        <line x1="165" y1="82" x2="165" y2="148"/>
        <line x1="320" y1="82" x2="320" y2="148"/>
      </g>
      <rect x="95" y="150" width="140" height="50" rx="5" fill="none" stroke="var(--muted)" stroke-dasharray="5 4"/>
      <rect x="250" y="150" width="140" height="50" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="165" y="67">&lt;p&gt;A&lt;/p&gt;</text>
        <text x="320" y="67">&lt;p&gt;B&lt;/p&gt;</text>
        <text x="165" y="170">&lt;!----&gt;</text>
        <text x="165" y="191" font-size="15.5" fill="var(--muted)">p 已删除</text>
        <text x="320" y="170">&lt;p&gt;B&lt;/p&gt;</text>
        <text x="320" y="191" font-size="15.5">display: none</text>
        <text x="165" y="226" font-size="15.5" fill="var(--muted)">再显示：重新创建</text>
        <text x="320" y="226" font-size="15.5" fill="var(--muted)">再显示：只改样式</text>
      </g>
    </svg>
</template>
