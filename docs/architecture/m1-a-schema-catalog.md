---
title: M1-A Schema 与对象目录
description: L0-L6、运行回执、关系和 Guide 适配边界
outline: deep
---

# M1-A Schema 与对象目录

## 结论

M1-A 已建立可在本地重复校验的 Reference 合同，但它仍是 `local candidate`：对象通过 Schema 不等于领域正确，不等于真实 Agent 已执行，也不等于产品验收。

## L0-L6 对象链

| 层 | 主要对象 | Schema | 进入下一层的必要条件 |
|---|---|---|---|
| L0 | SourceArtifact / SourceRevision / StructuralElement | `source.schema.json` | revision、hash、来源与结构定位完整 |
| L1 | EvidenceFragment / Claim | `evidence.schema.json` | locator 可解析、支持与冲突引用可追溯 |
| L2 | Concept / Metric / DecisionModel / Case / Playbook | `knowledge-object.schema.json` | 类型化、版本化、关系端点合法 |
| L3 | Skill | `skill.schema.json` | PromotionDecision 存在，首案最高 E2 |
| L4 | TaskPackage | `task-package.schema.json` | Skill、对象闭包和 EvaluationContract 均可解析 |
| L5 | ActionPackage / RunTrace | `action-package.schema.json` / `run-trace.schema.json` | 固定 fixture 可重放，事件输入输出闭合 |
| L6 | KnowledgeReceipt / ReleaseSnapshot | `knowledge-receipt.schema.json` / `release-snapshot.schema.json` | 评估引用、trace、manifest hash 一致 |

辅助对象由 `governance.schema.json`、`evaluation.schema.json`、`relation.schema.json` 和 `reference-package.schema.json` 约束。公共标识与枚举集中在 `common.schema.json`。

## 关系合同

`reference/ontology/relations.json` 是关系端点白名单。校验器同时阻止：

- 悬空引用和声明类型/真实类型不一致；
- 不允许的 `fromType → toType`；
- `supersedes` 有向环；
- Case 绕过 KnowledgeCandidate / PromotionDecision 直接产生 Skill；
- snapshot 对象集和关系集的 canonical hash 不一致。

## Guide 适配边界

`reference/adapters/guide-registry-map.json` 只定义映射，不执行批量迁移：

| 既有 Guide 注册表 | Reference 目标 | 必补信息 | 禁止推导 |
|---|---|---|---|
| `claims.yml` | Source / Evidence / Claim | revision、locator、hash、license | 原证据等级自动成为 Reference 验收 |
| `concepts.yml` | Concept / Relation | revision、治理状态、类型端点 | 有语义图即代表 runtime 可执行 |
| `acceptance.yml` | Evaluation / Receipt / Governance | trace、对象引用、release snapshot | repository-content 验收等于 runtime 验收 |

## 本地验证

```bash
npm run reference:contracts
```

该命令编译所有 Schema，验证四个产品注册表、一个正例包、六个固定负例和跨对象不变量。它不进行网络请求，不写规范知识库，也不产生外部副作用。
