---
title: G6-A6-R1 只读 reconciliation 设计
status: complete-readonly-reconciliation
gate: G6-A6-R1
date: 2026-08-12
---

# G6-A6-R1 只读 reconciliation 设计

## 决策目标

G6-A6 因 shared edge whole-file identity 从 `99a617...` / 50,180 bytes 漂移至 `bd3293...` / 51,384 bytes 而按设计阻断。G6-A6-R1 只回答一个问题：这个漂移能否在“隔离候选运行态准备”范围内被归类为 unrelated whole-edge telemetry，同时继续把 exact 88d4 server block 作为强门禁。

本门禁不回答未来 edge switch 是否安全。任何 future edge switch 仍必须重新绑定当时的 whole-edge SHA/inode/owner/mode/bytes，并执行独立的强门禁事务。

## 固定输入

- G6-A6 baseline receipt：`3e8ebc42c1ecf693ada6bb41fd833a9db3c993f315923a0fe1a8bdcb16f7d132`
- G6-A6 blocked closeout：`7b3bc8612a9f9fa19a7c2d1822093e54f57fc9f8f808691edf3b3271483c28b7`
- G6-A6 collector：`4b555a0dbc91d82de5626750272ad02ed92b5e569ffcb428e0c6903e28e8fda9`
- 观测 whole-edge：`bd3293c1b62f67b7a1af7e4fb0ca57b6f84448020b74b0f9afc9a0204c3490a2` / inode 901063 / ubuntu:ubuntu / 0644 / 51,384 bytes
- canonical 88d4 block：`deploy/mkd-distill-88d4/edge-server.conf`，2,056 bytes，SHA `2d42a084d24bb053a2fef5b4c994c9317940c9de9eb27626f3a67d2f669670d8`

## 单次只读采集

attempt-2 只允许一个 strict-host-key SSH session。除了重复 G6-A6 的候选 absence、18922、IPAM、88d4 containers/networks/config、TLS/timer、容量保护态外，新增一个只读 block probe：

1. 从 live edge 中按唯一 BEGIN/END marker 提取原始 bytes；
2. 不输出 block 内容，只输出 SHA、bytes、BEGIN/END count、server_name/upstream/release count；
3. 将远端提取结果与 canonical block 做 byte-exact 比较；
4. whole-edge 必须仍等于 G6-A6 观测到的 `bd3293...` identity，否则 attempt-2 继续 blocked。

## 判定

只有全部 hard checks 为真时，允许以下带标签结论：

- `priorWholeEdgeDrift=telemetry-only-for-isolated-runtime-preparation`
- `exact88d4BlockGating=true`
- `futureLiveEdgeSwitchRequiresFreshExactWholeFile=true`

不得据此声称 upload、runtime creation、edge switch、public P9、provider validation 或 production/live Agent 已授权或完成。

## 失败关闭

任何 source lock、whole-edge current identity、block SHA/bytes/count、候选 absence、18922、IPAM、88d4 runtime、TLS/timer 或容量检查失败，只创建独立 blocked receipt。父 G6-A6 baseline/closeout 不覆盖，不自动重试，不执行远端 mutation。

## 执行结果

- 唯一 attempt-2 SSH 已完成，21/21 hard checks 通过；没有重试。
- materialized engine SHA：`c3668f6bd502b485e349808b196d86919f6328896c840a94dd4507ce6a3b0315`
- reconciliation receipt SHA：`4d86145391a897ee661b5482c41b51746c1f25277d388770ea1e54cd99af06c6`
- effect ledger：SSH=1；public read、upload、remote/local Docker mutation、runtime creation、edge/cert/timer action、provider、production Agent、commit/push 均为 0。
- G6-A7 仍为未授权；本结果不能作为 upload、runtime creation 或 edge switch 的执行许可。
