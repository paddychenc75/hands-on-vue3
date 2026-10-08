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

const style = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword, t.self], color: 'var(--code-k)' },
  { tag: [t.string, t.special(t.string), t.attributeValue, t.regexp], color: 'var(--code-s)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--code-c)', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--code-n)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--code-k)' },
  { tag: [t.attributeName], color: 'var(--code-n)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#c9b6f2' },
  { tag: [t.brace, t.punctuation, t.separator], color: 'var(--code-c)' },
  { tag: t.invalid, color: '#ff8f9c' }
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--code-bg)', color: 'var(--code-ink)', fontSize: 'var(--ed-fs, 13px)', borderRadius: '8px' },
  '&.cm-focused': { outline: '2px solid var(--accent)', outlineOffset: '1px' },
  '.cm-scroller': { fontFamily: 'var(--f-mono)', lineHeight: '1.55' },
  '.cm-content': { padding: '6px 0', caretColor: 'var(--code-ink)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--code-ink)', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--code-c)', border: 'none', borderRight: '1px solid rgba(127,146,152,.28)', borderRadius: '8px 0 0 8px' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,.04)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,.06)', color: 'var(--code-ink)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'rgba(158,195,240,.32) !important' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(127,209,167,.22)', outline: '1px solid rgba(127,209,167,.5)', color: 'inherit !important' },
  '.cm-nonmatchingBracket': { color: '#ff8f9c !important' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(232,196,138,.16)' },
  '.cm-todoLine': { backgroundColor: 'rgba(232,196,138,.16)', boxShadow: 'inset 3px 0 #e8c48a', color: '#f3dcb0' },
  '.cm-todoLine span': { fontWeight: '600' },
  '.cm-badLine': { backgroundColor: 'rgba(255,120,135,.16)', boxShadow: 'inset 3px 0 #ff8f9c' },
  '.cm-badGutter': { color: '#ff8f9c', fontWeight: '700' },
  '.cm-tooltip': { backgroundColor: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '6px', fontFamily: 'var(--f-mono)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: '#fff' },
  '.cm-completionDetail': { opacity: .7, fontStyle: 'normal', marginLeft: '8px' },
  '.cm-placeholder': { color: 'var(--code-c)' }
}, { dark: true });

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
