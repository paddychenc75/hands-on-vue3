import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars, Decoration } from '@codemirror/view';
import { EditorState, StateField, StateEffect, Compartment, Transaction } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab, toggleComment } from '@codemirror/commands';
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap, completeFromList } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { vue } from '@codemirror/lang-vue';
import { tags as t } from '@lezer/highlight';
import { foldExtension, foldBlocks, foldTitleAt, replaceAll, revealLine } from './folds.js';

// 配色全部引用 style.css 里的 --code-* 变量（和文章里的代码块是同一组），浅色和深色自动切换
const style = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword, t.self], color: 'var(--code-k)' },
  { tag: [t.string, t.special(t.string), t.attributeValue, t.regexp], color: 'var(--code-s)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--code-c)', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--code-n)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--code-k)' },
  { tag: [t.attributeName], color: 'var(--code-p)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--code-f)' },
  { tag: [t.brace, t.punctuation, t.separator], color: 'var(--code-punct)' },
  { tag: t.invalid, color: 'var(--code-bad-bar)' }
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--code-bg)', color: 'var(--code-ink)', fontSize: 'var(--ed-fs, 13px)', borderRadius: 'var(--r-md, 12px)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--f-mono)', lineHeight: '1.55' },
  '.cm-content': { padding: '6px 0', caretColor: 'var(--brand)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--brand)', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: 'var(--code-bar)', color: 'var(--code-c)', border: 'none', borderRight: '1px solid var(--code-border)', borderRadius: 'var(--r-md, 12px) 0 0 var(--r-md, 12px)' },
  '.cm-activeLine': { backgroundColor: 'var(--code-line)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--code-line)', color: 'var(--code-ink)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--code-sel) !important' },
  '.cm-matchingBracket': { backgroundColor: 'var(--code-match)', outline: '1px solid var(--brand)', color: 'inherit !important' },
  '.cm-nonmatchingBracket': { color: 'var(--code-bad-bar) !important' },
  '.cm-selectionMatch': { backgroundColor: 'var(--code-todo-bg)' },
  '.cm-todoLine': { backgroundColor: 'var(--code-todo-bg)', boxShadow: 'inset 3px 0 var(--code-todo-bar)', color: 'var(--code-todo-ink)' },
  '.cm-todoLine span': { fontWeight: '600' },
  '.cm-badLine': { backgroundColor: 'var(--code-bad-bg)', boxShadow: 'inset 3px 0 var(--code-bad-bar)' },
  '.cm-badGutter': { color: 'var(--code-bad-bar)', fontWeight: '700' },
  '.cm-tooltip': { backgroundColor: 'var(--c-raised)', color: 'var(--text-1)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm, 8px)', fontFamily: 'var(--f-mono)', boxShadow: 'var(--sh-3)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--brand)', color: 'var(--on-brand)' },
  '.cm-completionDetail': { opacity: .7, fontStyle: 'normal', marginLeft: '8px' },
  '.cm-placeholder': { color: 'var(--code-c)' },
  '.cm-panels': { backgroundColor: 'var(--code-bar)', color: 'var(--code-ink)', borderTop: '1px solid var(--code-border)' },
  '.cm-panels input, .cm-panels button': { fontFamily: 'inherit', color: 'var(--code-ink)', backgroundColor: 'var(--c-surface)', border: '1px solid var(--border-strong)', borderRadius: '6px' }
});

// 出错的行
const setBad = StateEffect.define();
const badField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) if (e.is(setBad)) {
      const n = e.value;
      if (!n || n > tr.state.doc.lines) deco = Decoration.none;
      else { const l = tr.state.doc.line(n); deco = Decoration.set([Decoration.line({ class: 'cm-badLine' }).range(l.from)]); }
    }
    if (tr.docChanged && !tr.effects.some(e => e.is(setBad))) deco = Decoration.none;   // 修改代码后去掉标记
    return deco;
  },
  provide: f => EditorView.decorations.from(f)
});

// 要写的地方：含 TODO 的行加醒目的底色和左边的标记。折叠块里有很多已经写好的代码，学习者要一眼找到自己该写哪里
const todoField = StateField.define({
  create: state => todoDecos(state.doc),
  update: (deco, tr) => (tr.docChanged ? todoDecos(tr.state.doc) : deco),
  provide: f => EditorView.decorations.from(f)
});
function todoDecos(doc) {
  const ranges = [];
  for (let i = 1; i <= doc.lines; i++) {
    const l = doc.line(i);
    if (/\bTODO\b/.test(l.text)) ranges.push(Decoration.line({ class: 'cm-todoLine' }).range(l.from));
  }
  return Decoration.set(ranges);
}
/** 第一个 TODO 行滚到编辑器内靠上的位置（只在带折叠块的长代码里用；只滚编辑器自己，不滚页面） */
function scrollToFirstTodo(view) {
  const doc = view.state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    if (/\bTODO\b/.test(doc.line(i).text)) {
      requestAnimationFrame(() => { view.requestMeasure({ read: v => v.lineBlockAt(doc.line(i).from).top, write: (top, v) => { v.scrollDOM.scrollTop = Math.max(0, top - 36); } }); });
      return;
    }
  }
}

function apiCompletions(names) {
  const opts = names.map(n => ({ label: n, type: 'function', detail: 'Vue', boost: 2 }));
  return javascriptLanguage.data.of({ autocomplete: completeFromList(opts) });
}

export function create({ parent, doc, lang, api = [], onChange, onRun, label }) {
  const fs = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), drawSelection(),
        indentOnInput(), bracketMatching(), closeBrackets(), autocompletion({ activateOnTyping: true, icons: false }),
        highlightActiveLine(), highlightSelectionMatches(),
        indentUnit.of('  '), EditorState.tabSize.of(2),
        syntaxHighlighting(style), theme, badField, todoField, foldExtension(),
        lang === 'tpl' ? vue() : [javascript(), apiCompletions(api)],
        keymap.of([
          { key: 'Mod-Enter', run: () => { onRun && onRun(); return true; } },
          { key: 'Mod-/', run: toggleComment },
          ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab
        ]),
        EditorView.contentAttributes.of({ 'aria-label': label || '代码编辑器', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
        EditorView.updateListener.of(u => { if (u.docChanged && onChange) onChange(u.state.doc.toString()); })
      ]
    })
  });
  if (foldBlocks(view.state).length > 0) scrollToFirstTodo(view);
  return {
    view,
    get value() { return view.state.doc.toString(); },
    // 整体替换文档（重置、半成品、参考答案、找回代码）。含折叠块的代码重新解析、初始折叠；这种替换不进撤销历史（撤销会被只读块拦下，反而困惑）
    setValue(v) {
      const cur = view.state.doc.toString();
      if (v === cur) return;
      const hasFolds = foldBlocks(view.state).length > 0 || /#fold/.test(v);
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v }, annotations: [replaceAll.of(true), Transaction.addToHistory.of(!hasFolds)] });
      if (hasFolds) scrollToFirstTodo(view);
    },
    // 出错的行（真实行号）；在折叠块里就先展开那个块
    setBad(n) { if (n) revealLine(view, n, true); view.dispatch({ effects: setBad.of(n || 0) }); },
    goLine(n) { revealLine(view, n); const l = view.state.doc.line(Math.min(Math.max(1, n), view.state.doc.lines)); view.dispatch({ selection: { anchor: l.from }, scrollIntoView: true }); view.focus(); },
    /** 第 n 行所在折叠块的标题，不在块里是 '' */
    foldTitleAt(n) { return foldTitleAt(view.state, n); },
    focus() { view.focus(); }
  };
}
