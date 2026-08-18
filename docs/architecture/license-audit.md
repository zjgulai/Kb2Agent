---
title: M1-A 许可证与公开边界审计
description: 当前仓库、依赖、Schema、fixture 与未来 Runner 的许可证门禁
outline: deep
---

# M1-A 许可证与公开边界审计

## 当前结论

`blocked-for-publication`：仓库根目录没有项目许可证，用户尚未选择核心 Runner 许可证，因此 M1-A 可以本地开发和审查，但不得发布 package、容器镜像或对外宣称开源。

## 已核对范围

- 根目录 `LICENSE*`：未发现。
- `package.json`：项目未声明 `license` 字段。
- 直接前端/测试依赖：由 `package-lock.json` 固定版本；执行 P0 时只记录清单，不把依赖许可证推导为本项目许可证。
- 新增 Schema 与 synthetic fixture：当前仍属于未许可仓库内容。
- Amazon Ads 真实/公开语料：不在 M1-A；P3 必须逐文件建立来源和许可清单。

## 直接依赖许可证快照

以下结论来自当前 `package-lock.json` 固定版本，只说明依赖自身的许可证，不授予本项目许可证：

| 直接依赖 | 当前版本 | 许可证 |
|---|---:|---|
| `@axe-core/playwright` | lockfile 固定 | MPL-2.0 |
| `@phosphor-icons/vue` | lockfile 固定 | MIT |
| `@playwright/test` | lockfile 固定 | Apache-2.0 |
| `ajv` | 8.18.0 | MIT |
| `chrome-launcher` | lockfile 固定 | Apache-2.0 |
| `gray-matter` | lockfile 固定 | MIT |
| `lighthouse` | lockfile 固定 | Apache-2.0 |
| `mermaid` | 11.16.1 | MIT |
| `vitepress` / `vue` / remark-unified 工具链 | lockfile 固定 | MIT |

## 依赖安全快照（2026-08-09）

升级 Ajv 8.18.0 与 Mermaid 11.16.1 后，`npm audit` 报告 `5` 项：`3 moderate / 2 high / 0 critical`。剩余项位于开发/构建依赖链：DOMPurify、esbuild、nanoid、Vite、VitePress；其中 Vite/VitePress 当前报告 `fixAvailable: false`。

因此：

- 允许继续 M1-A 本地候选验证；本地开发服务器只能绑定 loopback，不暴露公网。
- 不把审计结果描述为“零漏洞”或“安全验收通过”。
- 发布与部署继续阻断；后续必须在 VitePress/Vite 提供兼容修复后重跑 audit 与全部 QA。
- 不使用 `npm audit fix --force` 跨主版本改写依赖图。

## 建议但未决策

首选候选是 Apache-2.0，理由是对公开核心 Runner 提供明确专利条款；MIT 可以作为更短、更宽松的备选。最终选择需要 Owner/法律责任人确认。

在选择前：

- 不创建带误导性的 LICENSE。
- 不在 `package.json` 写入许可证。
- 不发布 npm/PyPI/container artifact。
- 文档中的“公开”只表示目标范围，不表示已经授予许可。

## P3 许可门禁

每个 corpus 文件必须记录：来源 URL、作者/发布者、版本/as-of、许可或使用依据、允许的再分发范围、内容 hash、脱敏/合成状态和 reviewer。

任何一个文件为 `unknown` 或 `restricted` 时，公开 bundle 必须失败关闭。
