# 妙言 Markdown Windows 移植

这是非官方的 Windows Markdown 编辑器和可嵌入的编辑模块。以 Tw93 的妙言源码为基准，用浏览器的原生文本输入代替 macOS AppKit 的 NSTextView。保留中文输入法与撤销，支持打开和保存本地文件、源码高亮、分栏预览、列表和引用续写、缩进以及任务标记。

## 在 Windows 运行

安装 Node.js 22 或更新版。在仓库目录执行 `npm ci` 和 `npm start`。编辑器会在默认浏览器中打开，由回环地址提供页面，文档在浏览器中处理。执行 `npm test` 验证移植规则。

## 源码与集成

`lib/index.mjs` 是供随序等应用使用的入口。编辑规则返回 UTF-16 范围与替换文本，宿主负责撤销、存储与文档列表。此版本覆盖 Markdown 编辑器，妙言的原生窗口、笔记库和同步功能属于后续移植范围。

`upstream/` 保存用于移植的妙言源码快照，基准为 [tw93/MiaoYan 83ddc004](https://github.com/tw93/MiaoYan/tree/83ddc004353a794856379bb85460b8f2a249ce01)。重点移植 `MarkdownEditing.swift` 的续写、缩进、任务标记与源行定位，以及 `MarkdownRuleHighlighter.swift` 和 `NotesTextProcessor.swift` 的高亮规则。原始源码及此移植使用 MIT 许可证，见 [LICENSE](LICENSE)。
