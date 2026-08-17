---
title: MKD M1-A 产品合同
description: Guide 与 Reference Lab 的任务、边界、证据语言和验收合同
outline: deep
---

# MKD M1-A 产品合同

> 状态：`local-candidate` · 证据上限：`L2 fixture/dry-run` · 实现范围：`P0–P2`

本文冻结 **MKD · Knowledge to Agent** 的首版产品合同。它约束本地候选实现，不证明 Reference runtime、真实 Amazon Ads 效果或生产部署已经完成。

## 一句话价值

把多格式资料编译为有来源、有关系、有边界、可评测的知识对象，再由 E2 受控 Agent 生成可审查、可批准、可复放的决策行动包。

## 双产品合同

| 产品线 | 用户任务 | 权威资产 | 当前最大声明 |
|---|---|---|---|
| Guide | 学会判断知识系统的设计、风险和验证方法 | 文档、概念、Claim、来源、学习路径 | 具备本地知识治理基础 |
| Reference Lab | 运行并审查资料到行动包的固定闭环 | Schema、fixture、compiler、task、trace、eval、receipt | M1-A Schema 与本地原型候选 |

两条成熟度必须分账。Guide 的文章完整度不能证明 Reference 已运行；Reference 的固定 fixture 也不能证明 Guide 全文事实已验收。

## 主用户

### A1 · AI 产品经理 / 知识工程负责人

需要在默认视图中判断：

1. 输入材料是否足以支持当前建议。
2. 哪些是事实、推断和未知项。
3. 哪些动作可以批准，哪些必须停止。
4. 产品当前是设计、可运行、可验收还是生产状态。

### A2 · 工程师 / 架构师

需要展开检查：

1. 对象、关系、Schema 和稳定 ID。
2. snapshot、模型、prompt、工具和 eval 版本。
3. 工具调用、失败关闭、成本和延迟。
4. Replay 与 live 的结构化差异。

## 旗舰任务

固定 Amazon Ads 合成案例回答：

> 为什么某广告组合的 ACOS 连续上升，哪些可验证因素最可能解释变化，下一步应该检查、计算和准备哪些行动草案？

M1-A 只使用设计 fixture，不调用广告平台，不生成真实业务阈值，不证明诊断有效性。

## E2 执行边界

允许：

- 读取已批准 snapshot 中的对象与证据。
- 执行确定性的指标计算和差异比较。
- 生成待人工批准的检查清单与行动草案。
- 输出 ActionPackage、Trace 和 KnowledgeReceipt。

禁止：

- 修改预算、竞价、否定词或广告活动。
- 发送消息、邮件或工单。
- 自动写入 canonical knowledge。
- 接受自由文本、任意 URL 或用户文件作为公网输入。

## 输出合同

行动包默认必须包含：

1. 任务与输入快照。
2. 事实、推断、未知项分栏。
3. 诊断假设与证据。
4. 决策选项和建议顺序。
5. 计算公式、输入、单位与窗口。
6. 风险、停止条件和批准要求。
7. 证据定位和 freshness。
8. Trace、eval、成本和版本。

输入不足时只允许输出公式、区间、未知项和下一证据，不允许伪造精确数值。

## 支持与禁止声明

### M1-A 完成后允许

- “L0–L6 与支撑对象拥有机器可读 Schema。”
- “固定正负 fixture 可以在本地校验。”
- “Home/Lab/Result 高保真原型可以本地交互。”
- “Guide 与 Reference 的成熟度已分账。”

### M1-A 完成后仍禁止

- “多格式编译器已经可运行。”
- “Amazon Ads 诊断已经被领域专家验证。”
- “Agent 已调用真实模型或真实平台。”
- “Reference Lab 已可公开使用或可生产部署。”
- “核心 Runner 已具备可发布许可证。”

## 首版非目标

- 用户上传、任意对话、多租户、账号和计费。
- 多 Agent、图数据库、云向量库和大型任务队列。
- 外部平台写入和自动知识晋级。
- 全量迁移现有 26 章或 platform-operations wiki。

## M1-A 退出条件

- 产品合同、ADR、IA、设计规格和测试蓝图完整。
- Guide/Reference 成熟度与支持/禁止声明可机器读取。
- L0–L6、关系、Task/Skill、行动包、回执和治理 Schema 可校验。
- 正例 fixture 通过；负例按预期失败。
- 高保真原型在 1440/1280/960/768/390 下无横向溢出并可键盘操作。
- Owner 完成设计复核；许可证、具名角色和 M1-B 授权可继续保持阻断。

## 当前授权边界

本轮只授权本地 P0–P2。`provider-call`、`deploy`、`canonical-write`、`external-send`、`commit`、`push` 和 `package-publish` 均需要新的明确授权。
