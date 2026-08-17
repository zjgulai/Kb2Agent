---
title: M1-B 交叉审计与下一门禁 TODO
description: 从产品、数据、知识图谱、Agent、安全、体验与部署七个视角交叉核验 M1-B
sidebar: false
outline: deep
---

# M1-B 交叉审计与下一门禁 TODO

## 审计结论

M1-B 的本地候选范围可以关闭：P3–P6 的实现、负例、回放、导出、容器与网站证据相互吻合；没有发现把计划、静态 Demo 或本地测试冒充生产结果的情况。证据上限保持 `L2-fixture-or-dry-run`。

| 审计视角 | 结论 | 关键证据 | 遗留风险 |
|---|---|---|---|
| 产品合同 | 通过 | A1 主受众、A2 辅受众；旗舰任务与 E2 边界落到页面和 TaskPackage | 四角色未验收 |
| 多格式数据 | 通过 | 6 格式、哈希/许可清单、88 个 locator、4 类失败注入 | 尚未验证授权真实语料 |
| 知识库架构 | 通过 | L0–L6 对象、7 条类型关系、snapshot/SQLite parity、review packet | canonical promotion 仍 pending |
| Agent | 通过 | 8 个本地工具、20/20 golden、确定性重复运行、CLI/MCP/容器一致 | 无真实模型与平台只读对照 |
| 安全与权限 | 有条件通过 | external calls/effects/writes 均为 0；apply=true 硬阻断；静态公网面 | dev-only 依赖公告、experimental SQLite |
| 网站体验 | 通过 | Lab/Result 真实导出；5 个证据页；5 视口；axe 与溢出门禁 | 尚无真实用户可用性访谈 |
| 部署准备 | 形态通过、部署未执行 | digest-pinned Docker、read-only Compose、静态/本地运行面解耦 | 腾讯云主机、域名、TLS、备份、观测均未验收 |

## 下一门禁建议：M1-C Candidate Deployment Readiness

M1-C 应继续保持“候选部署”，先证明真实基础设施可以安全承载只读静态站点，不立即开启 live Agent。

### P7：内容与领域验收

- [ ] 为 Product/Content、Amazon Ads Domain、Engineering/Test、Security/Release 指定具名 reviewer。
- [ ] 对 3 条核心 evidence、Metric 公式、DecisionModel 分支和停止条件逐项签字。
- [ ] 用 4–6 个经过许可审查的真实或去标识样本做只读提取对照；禁止在未审许可前进入公开站点。
- [ ] 将 review packet 的 unresolved 从 3 项降为 0，仍不自动 canonical apply。

### P8：腾讯云候选环境

- [ ] 建立服务器身份、地域、系统版本、磁盘、CPU/内存和端口基线。
- [ ] 只部署静态 VitePress 构建；Nginx 启用 TLS、安全头、gzip/brotli、不可变缓存和 404/405 策略。
- [ ] Agent Runner、SQLite 与 stdio MCP 默认不对公网监听；如需远程调用，另立认证与网络隔离门禁。
- [ ] 建立可恢复发布：版本目录、原子软链切换、前一版本回滚、构建 hash 回读。
- [ ] 建立最小观测：健康检查、静态资源 4xx/5xx、磁盘阈值、证书到期、备份恢复演练；不采集自由文本。

### P9：候选验收

- [ ] 从公网只读访问验证 6 个 Reference 页面、Guide、导出文件和移动端布局。
- [ ] 复核 CSP、依赖公告、镜像扫描与 SBOM；禁止公网启动 Vite dev server。
- [ ] 对发布前后 snapshot hash、静态文件清单与 Nginx 配置 hash 做 parity 检查。
- [ ] 形成候选部署回执；明确区分 local、container、candidate cloud 与 production。

### 暂不进入的 M1-D / Live 项目

- [ ] provider adapter、真实模型调用、预算、限频、熔断与 kill switch。
- [ ] Amazon Ads 只读 API 或任何账户写入工具。
- [ ] canonical knowledge apply 与自动晋升。
- [ ] 用户自由文本、上传、外部 URL 抓取、签名会话和多租户隔离。

以上四组能力需要新的明确授权，不能由“同意下一门禁”推断获得。
