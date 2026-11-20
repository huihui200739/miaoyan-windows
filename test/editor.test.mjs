import test from 'node:test';
import assert from 'node:assert/strict';
import { continueList, editLines, sourceLineRange, toggleTaskAtSourceLine, sourceHighlight } from '../lib/index.mjs';
const apply = (text, edit) => text.slice(0, edit.from) + edit.replacement + text.slice(edit.to);

test('ports MiaoYan Return behavior for numbered and nested quoted tasks', () => {
  for (const [text, expected] of [['> > 9) [x] 中文','> > 9) [x] 中文\n> > 10) [ ] '], ['intro\r\n- last','intro\r\n- last\r\n- '], ['- one\n- ','- one\n'], ['> > ','']]) {
    assert.equal(apply(text, continueList(text, text.length)), expected);
  }
  for (const text of ['* * *','pasted\u2028- ','\u0060\u0060\u0060\n- code']) assert.equal(continueList(text,text.length),null);
});

test('source positions and task edits preserve CRLF and UTF-16 offsets', () => {
  const text = '中文😀\u2028标题\r\n> - [ ] item';
  assert.deepEqual(sourceLineRange(text,1),{from:9,to:text.length});
  assert.equal(apply(text,toggleTaskAtSourceLine(text,1)),text.replace('[ ]','[x]'));
  assert.equal(toggleTaskAtSourceLine('~~~\n- [ ] code\n~~~',1),null);
  const items = '1. foo\n- bar';
  assert.equal(apply(items,editLines(items,7,7,'indent')),'1. foo\n   - bar');
});

test('highlighter distinguishes Setext headings, references and code without emitting raw HTML', () => {
  const output = sourceHighlight.highlight('中文\n===\n\n[ref]: https://example.com\n~~~\n# in code <img>\n~~~');
  assert.match(output, /md-syntax-heading">中文/);
  assert.match(output, /md-syntax-link">\[ref\]/);
  assert.match(output, /md-syntax-code"># in code &lt;img&gt;/);
  assert.doesNotMatch(output, /<img>/);
});
