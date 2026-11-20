import { marked } from '/marked.mjs';
import DOMPurify from '/purify.mjs';
import { continueList, editLines, sourceHighlight, mountEditorLayout, renderLocations, iconButton } from '/lib/index.mjs';
const editor = document.querySelector('#editor');
const preview = document.querySelector('#preview');
const byId = id => document.getElementById(id);
const title = byId('filename');
const shell = byId('shell');
const search = byId('search');
const open = document.createElement('button');
const create = document.createElement('button');
const { sections } = mountEditorLayout({ shell, sidebar:byId('notes'), search, create, list:byId('list'), main:byId('main'), heading:byId('heading'), actions:byId('actions'), brand:'妙言', open });
const documents = [];
const makeDocument = (name, text = '', location = 'drafts', updated = Date.now()) => ({ name, text, location, updated, changed:false });
let current = makeDocument('未命名');
documents.push(current);
let location = 'all';
const locations = [{ id:'all', label:'全部', icon:'library' }, { id:'drafts', label:'草稿' }, { id:'files', label:'打开的文件' }];
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle:'short', timeStyle:'short' });
function showDocuments() {
  renderLocations(sections, locations, location, id => {
    location = id;
    if (matchMedia('(max-width: 540px)').matches) shell.classList.add('mia-notes-only');
    showDocuments();
  });
  const term = search.value.trim().toLowerCase();
  byId('list').replaceChildren(...documents.filter(item => (location === 'all' || item.location === location) && (!term || item.name.toLowerCase().includes(term) || item.text.toLowerCase().includes(term))).map(item => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'mia-row';
    row.setAttribute('aria-current', String(item === current));
    const name = document.createElement('b');
    name.textContent = item.name || '未命名';
    const time = document.createElement('time');
    time.dateTime = new Date(item.updated).toISOString();
    time.textContent = dateFormat.format(item.updated);
    row.append(name, time);
    row.onclick = () => select(item);
    return row;
  }));
}
function select(item) {
  if (item !== current) {
    current = item;
    title.value = item.name;
    editor.value = item.text;
    editor.scrollTop = preview.scrollTop = 0;
  }
  shell.classList.remove('mia-notes-only');
  showDocuments();
  schedule();
}
function edit() {
  current.text = editor.value;
  current.name = title.value;
  current.changed = true;
  current.updated = Date.now();
  if (!composing) schedule();
}
title.value = current.name;
title.oninput = () => { edit(); showDocuments(); };
search.oninput = showDocuments;
open.onclick = () => byId('file').click();
create.onclick = () => {
  const item = makeDocument('未命名');
  documents.unshift(item);
  if (location === 'files') location = 'drafts';
  search.value = '';
  select(item);
  title.focus();
  title.select();
};
iconButton(byId('panes'), 'sidebar', '展开或收起文档导航').onclick = () => {
  if (matchMedia('(max-width: 540px)').matches) shell.classList.toggle('mia-notes-only');
  else shell.classList.toggle('mia-hide-library');
};
const focus = iconButton(byId('focus'), 'focus', '专注模式');
focus.setAttribute('aria-pressed', 'false');
focus.onclick = () => focus.setAttribute('aria-pressed', String(shell.classList.toggle('mia-focus')));
showDocuments();
let composing = false;
let frame = 0;
const highlight = sourceHighlight.attach(editor, document.querySelector('#mirror'));
const render = () => {
  frame = 0;
  byId('save').textContent = current.changed ? '保存 *' : '保存';
  highlight.refresh();
  if (document.body.dataset.view !== 'source') preview.innerHTML = DOMPurify.sanitize(marked.parse(editor.value), { FORBID_TAGS: ['img','form','iframe','style','video','audio'] });
};
const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
editor.addEventListener('input', edit);
editor.addEventListener('compositionstart', () => { composing = true; });
editor.addEventListener('compositionend', () => { composing = false; schedule(); });
editor.addEventListener('keydown', event => {
  if (event.isComposing || composing || event.altKey) return;
  const {selectionStart:from, selectionEnd:to, value} = editor;
  let command;
  if (event.key === 'Enter' && !event.shiftKey) {
    if (event.ctrlKey || event.metaKey) command = editLines(value, from, to, 'task');
    else if (from === to) command = continueList(value, from);
  } else if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && (from !== to || /^\s*(?:[-+*]|\d+[.)]) /.test(value.slice(value.lastIndexOf('\n',from-1)+1,from)))) {
    command = editLines(value, from, to, event.shiftKey ? 'outdent' : 'indent');
  }
  if (!command) return;
  event.preventDefault();
  editor.setSelectionRange(command.from, command.to);
  const applied = command.replacement ? document.execCommand('insertText',false,command.replacement) : document.execCommand('delete');
  if (!applied) editor.setRangeText(command.replacement, command.from, command.to, 'end');
  editor.setSelectionRange(command.start, command.end);
  edit();
});
const viewLabels = { source:'Markdown 源码', split:'分栏', preview:'预览' };
const viewButtons = [...document.querySelectorAll('button[data-view]')];
for (const button of viewButtons) {
  iconButton(button, button.dataset.view, viewLabels[button.dataset.view]);
  button.setAttribute('aria-pressed', String(button.dataset.view === document.body.dataset.view));
  button.onclick = () => {
    document.body.dataset.view = button.dataset.view;
    for (const item of viewButtons) item.setAttribute('aria-pressed', String(item === button));
    schedule();
  };
}
byId('file').onchange = async event => {
  const files = [...event.target.files];
  event.target.value = '';
  if (!files.length) return;
  try {
    const items = await Promise.all(files.map(async file => makeDocument(file.name.replace(/\.(?:md|markdown)$/i,''), await file.text(), 'files', file.lastModified)));
    documents.unshift(...items);
    location = 'files';
    search.value = '';
    select(items[0]);
  } catch { alert('无法读取文件'); }
};
async function save() {
  const item = current;
  const snapshot = { name:item.name, text:item.text };
  let name = (item.name.trim() || '未命名').replace(/[<>:"/\\|?*]/g,'_') + '.md';
  const content = new Blob([snapshot.text], {type:'text/markdown;charset=utf-8'});
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
    if (snapshot.name === item.name && snapshot.text === item.text) {
      item.name = name.replace(/\.(?:md|markdown)$/i, '');
      item.changed = false;
      if (item === current) title.value = item.name;
    }
    showDocuments();
    schedule();
  } catch (error) { if (error.name !== 'AbortError') alert('无法保存文件'); }
}
document.querySelector('#save').onclick = save;
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
});
window.addEventListener('beforeunload', event => { if (documents.some(item => item.changed)) event.preventDefault(); });
schedule();
