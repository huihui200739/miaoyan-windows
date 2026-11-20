import { marked } from '/marked.mjs';
import DOMPurify from '/purify.mjs';
import { continueList, editLines, sourceHighlight } from '/lib/index.mjs';
const editor = document.querySelector('#editor');
const preview = document.querySelector('#preview');
const label = document.querySelector('#filename');
let name = '未命名.md';
let changed = false;
let composing = false;
let frame = 0;
const highlight = sourceHighlight.attach(editor, document.querySelector('#mirror'));
const render = () => {
  frame = 0;
  label.textContent = name + (changed ? ' *' : '');
  highlight.refresh();
  if (document.body.dataset.view !== 'source') preview.innerHTML = DOMPurify.sanitize(marked.parse(editor.value), { FORBID_TAGS: ['img','form','iframe','style','video','audio'] });
};
const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
editor.addEventListener('input', () => { changed = true; if (!composing) schedule(); });
editor.addEventListener('compositionstart', () => { composing = true; });
editor.addEventListener('compositionend', () => { composing = false; schedule(); });
editor.addEventListener('keydown', event => {
  if (event.isComposing || composing || event.altKey) return;
  const {selectionStart:from, selectionEnd:to, value} = editor;
  let edit;
  if (event.key === 'Enter' && !event.shiftKey) {
    if (event.ctrlKey || event.metaKey) edit = editLines(value, from, to, 'task');
    else if (from === to) edit = continueList(value, from);
  } else if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && (from !== to || /^\s*(?:[-+*]|\d+[.)]) /.test(value.slice(value.lastIndexOf('\n',from-1)+1,from)))) {
    edit = editLines(value, from, to, event.shiftKey ? 'outdent' : 'indent');
  }
  if (!edit) return;
  event.preventDefault();
  editor.setSelectionRange(edit.from, edit.to);
  const applied = edit.replacement ? document.execCommand('insertText',false,edit.replacement) : document.execCommand('delete');
  if (!applied) editor.setRangeText(edit.replacement, edit.from, edit.to, 'end');
  editor.setSelectionRange(edit.start, edit.end);
  changed = true;
  schedule();
});
for (const button of document.querySelectorAll('button[data-view]')) button.onclick = () => {
  document.body.dataset.view = button.dataset.view;
  for (const item of document.querySelectorAll('button[data-view]')) item.setAttribute('aria-pressed', String(item === button));
  schedule();
};
document.querySelector('#file').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || (changed && !confirm('当前文档有未保存的修改，仍要打开新文件吗？'))) return;
  try { editor.value = await file.text(); name = file.name; changed = false; schedule(); }
  catch { alert('无法读取文件'); }
};
async function save() {
  const content = new Blob([editor.value], {type:'text/markdown;charset=utf-8'});
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({suggestedName:name,types:[{description:'Markdown',accept:{'text/markdown':['.md','.markdown']}}]});
      const stream = await handle.createWritable();
      await stream.write(content);
      await stream.close();
      name = handle.name;
    } else {
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    }
    changed = false;
    schedule();
  } catch (error) { if (error.name !== 'AbortError') alert('无法保存文件'); }
}
document.querySelector('#save').onclick = save;
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
});
window.addEventListener('beforeunload', event => { if (changed) event.preventDefault(); });
schedule();
