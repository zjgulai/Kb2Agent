---
title: ADR-003 Replay-first 单 E2 Agent
---

# ADR-003：Replay-first 单 E2 Agent

- 状态：`accepted-design`
- 日期：2026-08-09

## 决策

默认产品证据是不可变 Replay。首版只使用单任务 E2 Agent 和确定性只读/计算工具；live 只作为同一 TaskPackage 的限频对比，不覆盖 Replay 基线。

## 后果

- 无 provider key 也必须能复放固定 bundle。
- 模型、prompt、tool、snapshot 和 eval 版本写入 Receipt。
- 没有任何写工具、消息工具或 canonical promotion 工具。
- 多 Agent 不进入 V1。
