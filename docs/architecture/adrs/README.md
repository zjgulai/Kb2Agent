---
title: MKD Architecture Decision Records
description: M1-A 架构决策索引与变更流程
---

# MKD Architecture Decision Records

| ADR | 决策 | 状态 |
|---|---|---|
| [ADR-001](./001-dual-product-ledgers) | Guide 与 Reference 独立成熟度账本 | accepted-design |
| [ADR-002](./002-git-native-sqlite) | Git-native authority + SQLite runtime projection | accepted-design |
| [ADR-003](./003-replay-first-e2) | Replay-first 单 E2 Agent | accepted-design |
| [ADR-004](./004-public-input-contract) | 公网固定输入、无上传、无自由文本 | accepted-design |
| [ADR-005](./005-license-gate) | 未选择许可证前阻断公开发布 | proposed-blocking |

## 变更流程

1. 新决策创建新 ADR，不静默改写已接受 ADR 的结论。
2. 替代旧决策时填写 `supersedes`，旧 ADR 改为 `superseded` 但保留。
3. 任何提高权限、改变证据语言、开放公网输入或改变权威存储的 ADR 必须由 Owner 重新确认。
4. ADR 接受仅代表设计决策，不代表实现、验收或生产状态。
