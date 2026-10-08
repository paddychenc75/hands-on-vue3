// 练习编辑器里的折叠只读块：把 //#fold 标题 … //#endfold 圈住的代码初始折叠成一行，块内代码只读。
// 编辑器里放的始终是含标记的完整代码（行号就是真实行号），折叠只是显示层面的事。
// 解析和改动裁剪的纯逻辑在 course/engine/logic/folds.ts，这里只负责接到 CodeMirror 上：
//   StateField（块的位置和展开状态，随文档改动映射）、Decoration.replace（折叠成一行 / 标记行换成按钮）、
//   atomicRanges（光标不会进到折叠的块里）、transactionFilter（拦下触及块的改动）、一次性提示。
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { Annotation, ChangeSet, EditorState, StateEffect, StateField } from '@codemirror/state';
import { blockIndexOfLine, clipChange, foldLabel, parseFolds, protectedZones } from '../course/engine/logic/folds.ts';

/** 程序整体替换文档（重置、填入半成品或答案、找回代码）：不受只读限制，并重新解析折叠块 */
export const replaceAll = Annotation.define();
const toggleFold = StateEffect.define();      // { index, open }
const readonlyHint = StateEffect.define();

const HINT = '折叠块里的代码是只读的，你的代码写在它外面。';

function build(doc) {
  return parseFolds(doc).map(b => ({ ...b, open: false }));
}

// ---- 折叠块里的按钮 ----
class FoldWidget extends WidgetType {
  // kind: 'block'（折叠状态，整块换成一行）| 'head'（展开后的开头标记行）| 'end'（展开后的结尾标记行）
  constructor(index, kind, open, title, lines) { super(); this.index = index; this.kind = kind; this.open = open; this.title = title; this.lines = lines; }
  eq(o) { return o.index === this.index && o.kind === this.kind && o.open === this.open && o.title === this.title && o.lines === this.lines; }
  get estimatedHeight() { return this.kind === 'block' ? 28 : -1; }
  toDOM(view) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm-foldBtn cm-foldBtn-' + this.kind;
    btn.dataset.foldIndex = String(this.index);
    btn.dataset.foldKind = this.kind;
    btn.setAttribute('aria-expanded', String(this.open));
    const label = foldLabel({ title: this.title, bodyLines: this.lines });
    btn.setAttribute('aria-label', (this.open ? '收起：' : '展开：') + label + '，只读');
    const caret = document.createElement('span');
    caret.className = 'cm-foldCaret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = this.open ? (this.kind === 'end' ? '▴' : '▾') : '▸';
    const title = document.createElement('span');
    title.className = 'cm-foldTitle';
    title.textContent = this.kind === 'end' ? '收起：' + this.title : this.title;
    btn.append(caret, title);
    if (this.kind !== 'end') {
      const n = document.createElement('span');
      n.className = 'cm-foldCount';
      n.textContent = '（' + this.lines + ' 行）';
      btn.append(n);
    }
    // 鼠标按下时不要抢走编辑器的选区；键盘（Esc 之后 Tab 到按钮，回车或空格）照常触发 click
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => {
      e.preventDefault();
      const byKeyboard = e.detail === 0;
      view.dispatch({ effects: toggleFold.of({ index: this.index, open: !this.open }) });
      // 按钮会被重建：键盘操作时把焦点还给新按钮，否则键盘用户会掉出去
      if (byKeyboard) requestAnimationFrame(() => {
        const sel = '.cm-foldBtn[data-fold-index="' + this.index + '"]' + (this.open ? '[data-fold-kind="block"]' : '[data-fold-kind="head"]');
        view.dom.querySelector(sel)?.focus();
      });
    });
    return btn;
  }
  ignoreEvent() { return true; }
}

function decorate(doc, blocks) {
  const all = [];
  const atomic = [];
  blocks.forEach((b, index) => {
    const first = doc.lineAt(b.from), last = doc.lineAt(b.to);
    if (!b.open) {
      const d = Decoration.replace({ widget: new FoldWidget(index, 'block', false, b.title, b.bodyLines), block: true }).range(b.from, b.to);
      all.push(d); atomic.push(d);
      return;
    }
    for (let n = first.number; n <= last.number; n++) {
      const l = doc.line(n);
      const edge = n === first.number || n === last.number;
      all.push(Decoration.line({ class: edge ? 'cm-foldMark' : 'cm-foldBody' }).range(l.from));
    }
    // 标记行本身换成按钮（不显示成代码，也不能删）
    for (const [l, kind] of [[first, 'head'], [last, 'end']]) {
      const d = Decoration.replace({ widget: new FoldWidget(index, kind, true, b.title, b.bodyLines) }).range(l.from, l.to);
      all.push(d); atomic.push(d);
    }
  });
  return { decos: Decoration.set(all, true), atomic: Decoration.set(atomic, true) };
}

export const foldField = StateField.define({
  create(state) {
    const blocks = build(state.doc.toString());
    return { blocks, ...decorate(state.doc, blocks) };
  },
  update(v, tr) {
    let blocks = v.blocks;
    let changed = false;
    if (tr.annotation(replaceAll)) { blocks = build(tr.newDoc.toString()); changed = true; }
    else if (tr.docChanged && blocks.length) {
      // 块的内部改不了，只有它前面的改动会让它整体移动。开头向后映射、结尾向前映射：块两端允许插入换行，不能把插入的内容吞进块里
      blocks = blocks.map(b => ({ ...b, from: tr.changes.mapPos(b.from, 1), to: tr.changes.mapPos(b.to, -1) }));
      changed = true;
    }
    for (const e of tr.effects) if (e.is(toggleFold)) {
      blocks = blocks.map((b, i) => (i === e.value.index ? { ...b, open: e.value.open } : b));
      changed = true;
    }
    if (!changed) return v;
    return { blocks, ...decorate(tr.newDoc, blocks) };
  },
  provide: f => [
    EditorView.decorations.from(f, v => v.decos),
    EditorView.atomicRanges.of(view => view.state.field(f).atomic),
    // 有展开的块时给编辑器加一个类，样式里放宽限高
    EditorView.editorAttributes.of(view => (view.state.field(f).blocks.some(b => b.open) ? { class: 'cm-foldOpen' } : null))
  ]
});

// ---- 只读：拦下触及折叠块的改动，块外的部分照常生效 ----
const readonlyFilter = EditorState.transactionFilter.of(tr => {
  if (!tr.docChanged || tr.annotation(replaceAll)) return tr;
  const st = tr.startState;
  const blocks = st.field(foldField, false)?.blocks;
  if (!blocks || !blocks.length) return tr;
  const zones = protectedZones(blocks, st.doc.length);
  const kept = [];
  let blocked = false;
  tr.changes.iterChanges((fa, ta, _fb, _tb, ins) => {
    const r = clipChange({ from: fa, to: ta, insert: ins.toString() }, zones);
    if (r.blocked) blocked = true;
    kept.push(...r.parts);
  });
  if (!blocked) return tr;
  const spec = { effects: readonlyHint.of(null) };
  if (kept.length) {
    const changes = ChangeSet.of(kept, st.doc.length);
    spec.changes = changes;
    spec.selection = st.selection.map(changes);
  }
  return spec;
});

// ---- 一次性的提示文字 ----
function showHint(view) {
  let el = view.dom.querySelector(':scope > .cm-foldToast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cm-foldToast';
    el.setAttribute('role', 'status');
    view.dom.appendChild(el);
  }
  el.textContent = HINT;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.classList.remove('show'); }, 2800);
}
const hintListener = EditorView.updateListener.of(u => {
  if (u.transactions.some(tr => tr.effects.some(e => e.is(readonlyHint)))) showHint(u.view);
});

const foldTheme = EditorView.theme({
  '.cm-foldBtn': { display: 'flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box', width: '0', minWidth: '100%', minHeight: '28px', margin: '0', padding: '2px 10px', font: 'inherit', fontSize: '0.92em', color: 'var(--code-ink)', background: 'rgba(127,146,152,.16)', border: 'none', borderLeft: '3px solid var(--accent)', borderRadius: '0 4px 4px 0', textAlign: 'left', cursor: 'pointer' },
  '.cm-foldBtn:hover': { background: 'rgba(127,146,152,.28)' },
  '.cm-foldBtn:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: '-2px' },
  '.cm-foldBtn-head, .cm-foldBtn-end': { display: 'inline-flex', width: 'auto', minWidth: '0', maxWidth: '100%', minHeight: '0', padding: '0 8px', fontSize: '0.85em', color: 'var(--code-c)', background: 'transparent' },
  // 折叠行的宽度由别的行决定（width:0 + min-width:100% 让它不参与内容宽度的计算），标题太长就截断，不把页面撑宽
  '.cm-foldCaret': { flex: 'none' },
  '.cm-foldTitle': { flex: '0 1 auto', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  '.cm-foldCount': { flex: 'none', color: 'var(--code-c)' },
  '.cm-foldMark': { backgroundColor: 'rgba(127,146,152,.12)' },
  '.cm-foldBody': { backgroundColor: 'rgba(127,146,152,.07)' },
  '.cm-foldToast': { position: 'absolute', left: '50%', bottom: '10px', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 24px)', boxSizing: 'border-box', padding: '5px 12px', borderRadius: '6px', fontSize: '0.88em', lineHeight: '1.5', color: '#1f2a30', background: '#e8c48a', boxShadow: '0 2px 8px rgba(0,0,0,.35)', pointerEvents: 'none', opacity: '0', transition: 'opacity .15s', zIndex: '20' },
  '.cm-foldToast.show': { opacity: '1' }
}, { dark: true });

export function foldExtension() {
  return [foldField, readonlyFilter, hintListener, foldTheme];
}

// ---- 给外部用的操作 ----
export function foldBlocks(state) { return state.field(foldField).blocks; }

/** 第 n 行在折叠块里就展开那个块；返回该块的标题，不在块里返回 ''。
    scroll 为真时，刚展开的话把编辑器内部滚到那一行（只滚编辑器自己，不动页面） */
export function revealLine(view, line, scroll = false) {
  const st = view.state;
  if (line < 1 || line > st.doc.lines) return '';
  const blocks = st.field(foldField).blocks;
  const i = blockIndexOfLine(blocks.map(b => lineSpan(st.doc, b)), line);
  if (i < 0) return '';
  if (!blocks[i].open) {
    view.dispatch({ effects: toggleFold.of({ index: i, open: true }) });
    if (scroll) {
      const pos = st.doc.line(line).from;
      view.requestMeasure({
        read: v => v.lineBlockAt(pos).top,
        write: (top, v) => { v.scrollDOM.scrollTop = Math.max(0, top - v.scrollDOM.clientHeight / 2); }
      });
    }
  }
  return blocks[i].title;
}
/** 第 n 行（真实行号）所在折叠块的标题，不动界面 */
export function foldTitleAt(state, line) {
  if (line < 1 || line > state.doc.lines) return '';
  const blocks = state.field(foldField).blocks;
  const i = blockIndexOfLine(blocks.map(b => lineSpan(state.doc, b)), line);
  return i < 0 ? '' : blocks[i].title;
}
// 块的起止行号会随前面的改动变化，用时由位置现算
function lineSpan(doc, b) { return { startLine: doc.lineAt(b.from).number, endLine: doc.lineAt(b.to).number }; }

export function toggleFoldAt(view, index, open) {
  view.dispatch({ effects: toggleFold.of({ index, open }) });
}
