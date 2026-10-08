/* 纯文本工具：不碰 DOM。移植自 hands-on-react。 */
export const esc = (s: unknown): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 选项文字：纯文本，转义后把 &lt;Tag&gt; 形式的标签名包成 code */
export const fmtOpt = (o: unknown): string =>
  esc(String(o).replace(/&lt;/g, '<').replace(/&gt;/g, '>')).replace(/&lt;(\/?[A-Za-z][^&]*?)&gt;/g, '<code>&lt;$1&gt;</code>')
