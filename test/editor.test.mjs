import { marked } from 'marked';
import test from 'node:test';
import assert from 'node:assert/strict';
import { continueList, editLines, sourceLineRange, toggleTaskAtSourceLine, sourceHighlight, localImageReference } from '../lib/index.mjs';
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


test('loose tasks render the box inside the first paragraph without moving nested tasks', () => {
  const html = marked.parse('- [x] done\n  - [ ] child\n\n- [ ] todo');
  assert.match(html, /<li><p><input [^>]*checked[^>]*> done<\/p>/);
  assert.match(html, /<li><input [^>]*> child<\/li>/);
  assert.match(html, /<li><p><input [^>]*> todo<\/p>/);
});

test('local images accept portable raster paths and reject external or parent paths', () => {
  assert.deepEqual(localImageReference('./assets/你好%20世界.PNG'), { parts:['assets','你好 世界.PNG'],type:'image/png' });
  for (const url of ['../a.png', 'x/%2e%2e/a.png', '%5c%5chost/a.png','C:/a.png','https://host/a.png','a.svg','a.png:stream','a.png?x','a%00.png','a//b.png','%ff.jpg']) {
    assert.equal(localImageReference(url), null, url);
  }
});
