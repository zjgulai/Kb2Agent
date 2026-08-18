---
title: ADR-004 公网输入合同
---

# ADR-004：公网固定输入、无上传、无自由文本

- 状态：`accepted-design`
- 日期：2026-08-09

## 决策

公网只接受白名单 case、task、枚举与有界数值参数。禁止文件、自由文本、任意 URL 和动态工具定义。

Observation 只接受问题类型、case/run/artifact 引用和严重度。文字说明转到本地 Candidate 流程或代码仓库 Issue。

## 后果

- API Schema 可以严格拒绝未知字段。
- 日志不需要保存 prompt 或文件正文。
- 本地 Runner 可有不同输入合同，但必须保留 SSRF、大小、格式和许可门禁。
