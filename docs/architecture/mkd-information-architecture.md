---
title: MKD 信息架构与用户流程
description: Home、Guide、Reference Lab、Evidence、Build 与 Ops 的任务型信息架构
outline: deep
---

# MKD 信息架构与用户流程

## 导航原则

导航先回答“我要完成什么”，再回答“我要阅读哪一章”。现有 `/knowledge/*` 保持兼容，Guide 不因品牌升级而重编号。

## Sitemap

```text
/
├─ /lab/
│  └─ /lab/runs/amazon-ads-replay-001
├─ /knowledge/*                  # 26 个兼容路由
├─ /knowledge-map/
├─ /cases/
│  └─ /cases/amazon-ads/
├─ /evidence/
├─ /build/
└─ /ops/
```

| 页面 | 核心问题 | 默认层 | 展开层 | 主要 CTA |
|---|---|---|---|---|
| Home | 这个产品能否把资料变成可信行动？ | 价值、旗舰任务、行动包摘要 | 能力边界与成熟度 | 运行旗舰 Replay |
| Lab | 输入、模式和流水线发生了什么？ | 固定场景、Replay、步骤 | corpus、预算、版本 | 运行 Replay |
| Result | 为什么给出这个建议？ | 行动包、事实/推断/未知 | evidence、closure、trace、eval | 导出/检查证据 |
| Guide | 我应该如何设计同类系统？ | 学习路径、章节 | Claim 与 Reference 连接 | 继续学习 |
| Knowledge Map | 哪些对象和关系进入任务上下文？ | L0–L6 闭包 | 版本、来源、冲突 | 查看对象 |
| Cases | 哪些模式成功或失败？ | 案例摘要 | 证据、限制、回放 | 打开 Replay |
| Evidence | 当前声明能被什么支持？ | Claim/receipt/snapshot | owner/acceptance | 检查门禁 |
| Build | 如何在本地复现？ | quickstart | Schema/API/MCP | 复制命令 |
| Ops | 当前服务是否可运行/可发布？ | health/readiness | 预算、备份、回滚 | 查看状态 |

## A1 用户流程

```text
Home
→ 识别旗舰任务与 synthetic/replay 边界
→ 进入 Lab 并运行固定 Replay
→ 先读行动包
→ 核对事实 / 推断 / 未知
→ 展开证据与停止条件
→ 判断是否值得进入本地构建
```

成功标准：不阅读完整 Trace，也能在 3 分钟内判断建议是否可审查、哪些信息仍缺失。

## A2 用户流程

```text
Home / Build
→ 查看 snapshot 与 Schema
→ 运行固定 Replay
→ 展开 Object Closure / Tool Trace / Eval
→ 对照 Receipt 中的版本与 hash
→ 下载 JSON / Replay Bundle
→ 本地进入 ingest / compile / retrieve / run / eval
```

成功标准：可以从页面结论反向定位到对象、来源、工具和评测合同。

## 首页叙事顺序

1. 品牌与一句话价值。
2. 主 CTA“运行 Amazon Ads Replay”；次 CTA“阅读系统指南”。
3. Source → Evidence → Decision → Skill → Task → Agent → Receipt 七阶段。
4. 行动包摘要：事实、推断、未知、停止条件。
5. Guide / Reference 成熟度分账。
6. A1/A2 双入口。
7. 26 章目录作为 Guide 次级内容。

## Lab 状态模型

| 状态 | 页面行为 | 可访问性提示 |
|---|---|---|
| idle | 显示固定输入和边界 | 主按钮说明“运行本地 Replay” |
| running | 逐步点亮流水线 | `aria-live` 宣告当前步骤 |
| completed | 显示结果入口和摘要 | 焦点进入完成摘要 |
| blocked | 显示阻断原因和下一证据 | 焦点进入错误摘要 |

M1-A 的 Live switch 必须显示但禁用，并解释“需要 M1-C 授权、预算与安全门禁”。

## Result 信息层次

默认展示：任务、建议、事实、推断、未知、风险、停止条件、批准要求。

按需展开：Evidence locator、Object closure、Tool trace、成本/延迟、Eval diff、完整 Receipt。

## 响应式折叠

- `≥1440`：行动包主列 + 可折叠证据 rail；不同时展示三列高密度内容。
- `960–1439`：单主列 + Evidence drawer。
- `640–959`：Stepper 与行动包顺序排列。
- `390–639`：卡片/Disclosure，主操作和摘要触控高度至少 44px。

## 内容与路由兼容

现有 26 个 `/knowledge/*` 路由、`docId` 和 `learningOrder` 不变。`Guide` 是产品名称，不要求首版把 URL 批量迁移到 `/guide/*`。
