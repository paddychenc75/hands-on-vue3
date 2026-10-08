<template>
  <svg viewBox="0 0 360 200" style="max-width:480px" role="img" aria-label="每次输入都取消上一次的计时。用户停止输入 400ms 后，才发出一次请求。">
    <g font-size="14" text-anchor="end" fill="var(--ink)"><text x="112" y="22">b</text><text x="112" y="46">bu</text><text x="112" y="70">bui</text><text x="112" y="94">buil</text><text x="112" y="118">build</text></g>
    <g fill="var(--sunken)" stroke="var(--muted)">
      <rect x="120" y="10" width="27" height="16" rx="2"/><rect x="147" y="34" width="27" height="16" rx="2"/><rect x="174" y="58" width="27" height="16" rx="2"/><rect x="201" y="82" width="27" height="16" rx="2"/>
    </g>
    <g stroke="var(--muted)" stroke-width="1.5">
      <path d="M150 14l8 8M158 14l-8 8"/><path d="M177 38l8 8M185 38l-8 8"/><path d="M204 62l8 8M212 62l-8 8"/><path d="M231 86l8 8M239 86l-8 8"/>
    </g>
    <rect x="228" y="106" width="72" height="16" rx="2" fill="var(--info-soft)" stroke="var(--muted)"/>
    <text x="264" y="118" font-size="14" text-anchor="middle" fill="var(--ink)">400ms</text>
    <rect x="300" y="106" width="46" height="16" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="323" y="118" font-size="14" font-weight="700" text-anchor="middle" fill="var(--ink)">请求</text>
    <line x1="120" y1="134" x2="346" y2="134" stroke="var(--muted)"/>
    <g stroke="var(--muted)"><line x1="120" y1="130" x2="120" y2="138"/><line x1="210" y1="130" x2="210" y2="138"/><line x1="300" y1="130" x2="300" y2="138"/></g>
    <g font-size="14" text-anchor="middle" fill="var(--muted)"><text x="120" y="152">0</text><text x="210" y="152">500</text><text x="300" y="152">1000 ms</text></g>
    <rect x="10" y="164" width="16" height="12" rx="2" fill="var(--sunken)" stroke="var(--muted)"/>
    <text x="32" y="175" font-size="14" fill="var(--ink)">计时被下一次输入取消（clearTimeout）</text>
    <rect x="10" y="184" width="16" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)"/>
    <text x="32" y="195" font-size="14" fill="var(--ink)">停止输入 400ms 后，才发出请求</text>
  </svg>
</template>
