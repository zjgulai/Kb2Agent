---
title: G6-A7-R1 Package Manifest 追加式校验修正设计
status: blocked-and-rolled-back
gate: G6-A7-R1
date: 2026-08-12
---

# G6-A7-R1 Package Manifest 追加式校验修正设计

## 决策目标

G6-A7-R1 不覆盖 G6-A7 attempt-1，也不重建或修改固定 archive。它只追加一个 source-locked attempt-2，把错误继承的 `site-checksums.sha256` 校验替换为冻结 `package-manifest.json.payloadFilesExcludingPackageManifest` 的逐文件路径、字节数与 SHA-256 校验；本地门禁全绿后，才允许一次新的 fresh-preflight、上传、隔离 `mkd_distill_438e` runtime 创建与私有 `172.20.0.1:18922` smoke。

## Source locks

- G6-A7 attempt-1 executor：`e472ec5c0d7336bec7abce6e923eafc3a0849555e13002df8b32609c7465aa99`
- G6-A7 blocked receipt：`e28d8945e80377e191b60a9017d5e87e2ef41df7bfdd43c24b3e072cba4dee28`
- G6-A7 blocked closeout：`7ac5a560d9d82cfd72e17d54fd6be53c53339df3119ea19931b119b7ac02e3f9`
- G6-A6 package manifest：52,673 bytes，SHA `e4130a2023b8e617bc12bd751dcca6fc68260937eb6b6d431b3111548a5551`
- 原固定 archive：2,751,877 bytes，SHA `ebb709a55d0ea0caa838f6ac064952bfc0dcb23d060ca93196f338365496ff59`

任一身份或父回执语义漂移时，attempt-2 必须在本地或上传前 fail closed。

## 唯一修正

远端解包后必须：

1. 验证 `package-manifest.json` 自身 SHA；
2. 验证 manifest 的 release、site digest、263 个 site 文件、12,978,696 bytes 与 280 个 payload 条目；
3. 对全部 280 个条目验证规范化相对路径、文件集合、文件类型、字节数与 SHA-256；
4. 拒绝绝对路径、`..`、反斜杠、符号链接、macOS metadata、缺失文件或额外文件；
5. release 安装后再次只对 manifest 中 263 个 `site/` 条目验证路径、字节数与 SHA-256；
6. deploy hashes 继续使用原 overlay manifest 的固定值独立复验。

除上述校验替换及 attempt-2 身份/回执路径外，G6-A7 的 preflight、安装、Compose、health、18922 smoke、postflight 与精确回滚语义保持不变。

## 授权与禁止边界

允许：本地追加设计、materializer、合同与独立回执；通过本地门禁后，上传未改变 archive、创建精确 438e release/Compose/双网络/双容器，并执行私有 18922 smoke；失败只清理本轮精确资源。

禁止：本地 Docker、live edge 写入或 reload/restart、88d4/a2fe 变更、证书/timer 变更、公网切换或 P9、真实 provider、production/live Agent、commit、push。

## 证据声明

本地 materialization/contracts 最高为 L2。只有实际远端 mutation 与终态读回都成功，才能声明 `L4-authorized-live-isolated-candidate-runtime-plus-L3-readback`。若失败，必须保留独立失败回执与精确回滚证据，不得进入 G6-A8。

## Attempt-2 执行结果

- 12/12 本地 preflight、固定 archive 远端 SHA/bytes、280/280 payload 路径/bytes/SHA、263 个 site 文件与 deploy hashes 全部通过。
- 438e 双容器被观测为 healthy、restart=0；私有 18922 health/home/Agent Lab/相对 redirect/404/405/release header smoke 全部通过。
- candidate-present postflight 的唯一失败为 `candidateIpamNoOverlap`。两条 conflict 均是 `host-route`，并分别精确等于刚创建的 `.32/28` 与 `.48/28` 候选子网；preflight 和回滚后读回均为零冲突。
- 事实层只能确认上述观测；“它们是候选 bridge 自身路由”属于由执行时序、CIDR 和回滚结果支持的推断。不得在本门禁内自动豁免或重试。
- executor 已执行精确 Compose down，并删除本轮 release/Compose；438e namespace/path/18922 恢复 absence，保护态读回全绿，rollback errors=0。
- attempt-2 receipt SHA：`965a48fce3c8dfc85c5754fe3d77afb2078d439f9cba3c5e28bd7e6ed3d4bf58`。
- 有效下一建议为未授权 G6-A7-R2：只对 candidate-present postflight 新增基于 Docker network ID 推导 bridge route device 的 self-owned route 分类；禁止按 CIDR 一概豁免。
