---
title: ADR-005 核心 Runner 许可证门禁
---

# ADR-005：核心 Runner 许可证门禁

- 状态：`proposed-blocking`
- 日期：2026-08-09
- blocker：`LICENSE_DECISION_PENDING`

## 决策

在 Owner 确认项目许可证前，Schema、fixture 和未来 Runner 只允许本地开发与审查，禁止 package/container 公开发布。

## 候选

1. Apache-2.0：推荐，包含明确专利授权条款。
2. MIT：更短、更宽松，但不包含同等明确的专利条款。

## 关闭条件

Owner 选择许可证；安全/发布角色复核第三方依赖和 corpus 再分发边界；随后才创建 LICENSE 与包元数据。
