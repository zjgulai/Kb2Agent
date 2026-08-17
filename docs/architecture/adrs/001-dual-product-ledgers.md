---
title: ADR-001 Guide 与 Reference 独立成熟度账本
---

# ADR-001：Guide 与 Reference 独立成熟度账本

- 状态：`accepted-design`
- 日期：2026-08-09
- 决策者：Owner

## 背景

当前站点能证明文档身份、Claim 和本地验收合同，但不能证明完整 Knowledge-to-Agent runtime。把两者合并会让内容成熟度错误抬升产品能力。

## 决策

Guide 使用 `principle/solution/runnable/acceptance`；Reference 使用 `draft/replayable/live-candidate/accepted`。两套账本只能通过显式引用关联，不允许互相继承等级。

## 后果

- 页面必须说明自己引用的是哪条产品线的证据。
- Reference fixture 通过不改变 26 个 Guide 页面的成熟度。
- Guide Claim 通过也不允许把 runtime 标为 replayable。
