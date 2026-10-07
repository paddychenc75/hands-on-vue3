<!-- 指令数据流向图：各指令把数据送到 DOM，@ 把事件送回代码，v-model 双向。 颜色用 CSS 变量，浅色和深色都有定义。 -->
<template>
  <svg viewBox="0 0 400 356" style="max-width:480px" role="img" aria-label="大部分指令把数据送到 DOM。@ 把 DOM 事件送回代码。v-model 两个方向都做。">
      <defs>
        <marker id="template-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
        <marker id="template-arra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
      </defs>
      <g text-anchor="middle" font-size="15.5" font-weight="700" fill="var(--ink)">
        <text x="96" y="20">模板写法</text>
        <text x="304" y="20">DOM 结果</text>
      </g>
      <g fill="var(--sunken)" stroke="var(--muted)">
        <rect x="8" y="34" width="176" height="36" rx="5"/>
        <rect x="8" y="80" width="176" height="36" rx="5"/>
        <rect x="8" y="126" width="176" height="36" rx="5"/>
        <rect x="8" y="172" width="176" height="36" rx="5"/>
        <rect x="8" y="218" width="176" height="36" rx="5"/>
        <rect x="8" y="264" width="176" height="36" rx="5"/>
      </g>
      <g fill="var(--surface)" stroke="var(--muted)">
        <rect x="216" y="34" width="176" height="36" rx="5"/>
        <rect x="216" y="80" width="176" height="36" rx="5"/>
        <rect x="216" y="126" width="176" height="36" rx="5"/>
        <rect x="216" y="172" width="176" height="36" rx="5"/>
        <rect x="216" y="218" width="176" height="36" rx="5"/>
        <rect x="216" y="264" width="176" height="36" rx="5"/>
      </g>
      <rect x="8" y="310" width="176" height="36" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <rect x="216" y="310" width="176" height="36" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <g stroke="var(--muted)" stroke-width="1.5" marker-end="url(#template-arr)">
        <line x1="188" y1="52" x2="212" y2="52"/>
        <line x1="188" y1="98" x2="212" y2="98"/>
        <line x1="212" y1="144" x2="188" y2="144"/>
        <line x1="188" y1="190" x2="212" y2="190"/>
        <line x1="188" y1="236" x2="212" y2="236"/>
        <line x1="188" y1="282" x2="212" y2="282"/>
      </g>
      <line x1="188" y1="328" x2="212" y2="328" stroke="var(--accent)" stroke-width="1.5" marker-start="url(#template-arra)" marker-end="url(#template-arra)"/>
      <g text-anchor="middle" font-size="15.5" fill="var(--ink)">
        <text x="96" y="57" v-pre>{{ name }}</text>
        <text x="96" y="103">:src="url"</text>
        <text x="96" y="149">@click="add"</text>
        <text x="96" y="195">v-if="ok"</text>
        <text x="96" y="241">v-show="ok"</text>
        <text x="96" y="287">v-for="t in list"</text>
        <text x="96" y="333">v-model="kw"</text>
        <text x="304" y="57">显示为文字</text>
        <text x="304" y="103">设置 src 属性</text>
        <text x="304" y="149">点击后调用 add</text>
        <text x="304" y="195">创建或删除元素</text>
        <text x="304" y="241">修改 display</text>
        <text x="304" y="287">每一项一个元素</text>
        <text x="304" y="333">输入框和 kw 同步</text>
      </g>
    </svg>
</template>
