import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars, Decoration, placeholder } from '@codemirror/view';
import { EditorState, StateField, StateEffect, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab, toggleComment } from '@codemirror/commands';
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap, completeFromList } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { vue } from '@codemirror/lang-vue';
import { tags as t } from '@lezer/highlight';

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

function apiCompletions(names) {
  const opts = names.map(n => ({ label: n, type: 'function', detail: 'Vue', boost: 2 }));
  return javascriptLanguage.data.of({ autocomplete: completeFromList(opts) });
}

function create({ parent, doc, lang, api = [], onChange, onRun, label }) {
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
        syntaxHighlighting(style), theme, badField,
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
  return {
    view,
    get value() { return view.state.doc.toString(); },
    setValue(v) { if (v !== view.state.doc.toString()) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } }); },
    setBad(n) { view.dispatch({ effects: setBad.of(n || 0) }); },
    goLine(n) { const l = view.state.doc.line(Math.min(Math.max(1, n), view.state.doc.lines)); view.dispatch({ selection: { anchor: l.from }, scrollIntoView: true }); view.focus(); },
    focus() { view.focus(); }
  };
}
window.VueCM = { create };
