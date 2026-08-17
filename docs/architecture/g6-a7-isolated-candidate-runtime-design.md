---
title: G6-A7 隔离候选运行态部署设计
status: blocked-and-rolled-back
gate: G6-A7
date: 2026-08-12
---

# G6-A7 隔离候选运行态部署设计

## 决策目标

G6-A7 只把已冻结并通过四角色评审的 `mkd-m1c-438e6ae583fc952d` 静态候选部署为不可公网访问的隔离运行态，并在宿主 `172.20.0.1:18922` 完成 upstream smoke。它不切换 live edge，不执行公网 P9，不启用真实 provider 或 production/live Agent。

## 固定输入

- G6-A6-R1 reconciliation receipt：`4d86145391a897ee661b5482c41b51746c1f25277d388770ea1e54cd99af06c6`
- G6-A6-R1 materialized engine：`c3668f6bd502b485e349808b196d86919f6328896c840a94dd4507ce6a3b0315`
- G6-A6-R1 materializer source：`b980bda1287538d0d6c082c6da34134bf9ad96c6b23d4afeb9fbd475e46e3cc0`
- G6-A6 overlay archive：2,751,877 bytes，SHA `ebb709a55d0ea0caa838f6ac064952bfc0dcb23d060ca93196f338365496ff59`
- G6-A6 overlay manifest：`afefcaa1990a6c587c1f51f3386348a1808b07886cf105d3db1f9dd3a9f4a3cb`
- canonical 88d4 edge block：2,056 bytes，SHA `2d42a084d24bb053a2fef5b4c994c9317940c9de9eb27626f3a67d2f669670d8`

## 运行态边界

- Compose project：`mkd_distill_438e`
- containers：`mkd_distill_438e-static-1`、`mkd_distill_438e-ingress-1`
- networks：`mkd_distill_438e_internal`（`192.168.224.32/28`）、`mkd_distill_438e_ingress`（`192.168.224.48/28`）
- release：`/opt/mkd-distill/releases/mkd-m1c-438e6ae583fc952d`
- Compose：`/opt/mkd-distill/compose/438e6ae5`
- upstream：仅绑定 `172.20.0.1:18922`

不得复用、重建、停止或重启 `mkd_distill_88d4`、`mkd_distill_a2fe` 或其他 project。不得修改 shared edge、证书、renewal timer、Docker daemon 或现有网络。

## Fresh preflight

任何远端 mutation 前必须重新确认：

1. 438e project、两个 network、release、Compose path 和 18922 listener 全部不存在；
2. 两个候选 `/28` 与当前 Docker subnets/host routes 零冲突；
3. 88d4 两容器、两网络、18921、site/config、TLS/timer 保持精确；
4. live 88d4 block 与 canonical block byte-exact；
5. whole-edge SHA/bytes 仅记录 telemetry，但 inode/owner/mode 仍绑定 G6-A6-R1 保护态；
6. pinned image 与容量满足阈值。

任一条件失败时，在上传前以 `blocked-before-mutation` 冻结独立回执。

## 授权事务

1. 在唯一 run-id 用户 staging 中创建目录并上传原固定 archive；
2. 远端复算 archive SHA/bytes，安全解包并验证 checksums、文件数、总 bytes 与 deploy hashes；
3. 通过同文件系统 staging 原子安装 release 与 Compose assets；
4. 以 `compose.yaml + compose.ipam.g6-a6.yaml` 启动且只启动 438e static/ingress；
5. 验证 health、restart=0、只读/非 root/cap-drop/no-new-privileges/PIDs/resource limits、双网络/IPAM、无 volume 和单一 host binding；
6. 在宿主 loopback bridge 地址执行 health、home、Agent Lab、相对 redirect、404、405 与 release header smoke；
7. 删除本轮用户 staging，再执行保护态与候选终态读回。

## 精确失败回滚

只有本轮 mutation journal 已记录的精确资源才能清理。若已启动 438e Compose，只对该 project 执行 `down`；只有本轮已安装时才删除本轮 release/Compose path；只删除本轮 run-id staging。回滚后重新确认 438e absence 与全部 88d4/TLS/timer 保护态。shared edge 无恢复动作，因为本门禁从不写入它。

## 证据与下一门禁

成功最高为 `L4-authorized-live-isolated-candidate-runtime-plus-L3-readback`，只能声明隔离候选运行态和 18922 upstream 已通过。未来 G6-A8 edge switch 必须重新绑定当时 whole-edge SHA/inode/owner/mode/bytes，执行独立 backup、syntax、same-inode、reload、public smoke 与 rollback 门禁；G6-A8 当前未授权。

## Attempt-1 执行结果

- fresh preflight、固定 archive 远端 SHA/bytes 和安全解包通过。
- staging verification 错误沿用了旧 G6-A4 archive 的 `site-checksums.sha256` 假设；冻结的 G6-A6 overlay 实际以 `package-manifest.json.payloadFilesExcludingPackageManifest` 表达 280 个 payload checksums，且不包含该旧文件。
- 因 compound `test -f` 失败，attempt-1 在 release 安装与 Docker 创建前阻断；仅创建 staging、上传、解包三项 mutation。
- 本轮 staging 已删除，438e namespace/path/18922 恢复 absence，88d4 exact block/runtime、TLS/timer 全部读回通过，rollback errors=0。
- blocked receipt SHA：`e28d8945e80377e191b60a9017d5e87e2ef41df7bfdd43c24b3e072cba4dee28`。
- 原固定 archive 未改变且不是损坏包。后续只能由未授权的 G6-A7-R1 source-lock 本次失败并把 staging verifier 改为 package-manifest 逐文件验证；不得在 G6-A7 内自动重试。
