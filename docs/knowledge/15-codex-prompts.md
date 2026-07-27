---
name: codex-prompts-tool-ecosystem
description: Codex Prompts 速查文档，涵盖多模态知识蒸馏到智能体调用的自然语言指令模板与工具生态。当工程师希望在 Codex App、Cursor 或 Claude 中直接生成完整知识库 Pipeline 时使用。
---

# 第十五章：Codex Prompts 速查与工具生态

> **本章目标**：给工程师一套“直接说人话就能生成工程骨架”的 Prompt 模板。你不需要先手写 Python、FastAPI、ETL 或评估脚本，而是先把目标、输入、输出和安全边界说清楚，让 Codex / Cursor / Claude 一次性搭出可运行 Pipeline。

::: tip 使用说明
这些内容都是**自然语言指令模板**，可直接粘贴到 **Codex App / Cursor Composer / Claude** 中使用。

使用时遵守三条规则：

1. 所有涉及内部数据、经营数据、客户数据、审计日志、PII 的 Prompt，**必须明确指定使用本地 Ollama**，不得走公网 API。
2. 看到 `[占位符]` 时，替换成你自己的目录、表名、字段、集合名、模型名、调度周期或业务范围。
3. 如果你要让模型直接产出代码，请在指令里同时约束：**项目结构、输出文件名、依赖、测试方式、降级策略、日志格式**，这样生成结果更稳定。
:::

::: danger 关键安全提醒
所有 Prompt 中涉及**内部数据**的代码必须使用**本地 Ollama**。任何包含 `openai.com`、`api.anthropic.com` 或其他公网模型调用的内部数据代码，都违反了安全红线，不能进入开发、测试或生产环境。
:::

## 15.1 基础 Pipeline Prompt（1-5）

### 1. 网页采集（Amazon Best Seller → Markdown）

**用途**：把公开榜单页面抓成干净的 Markdown 原文，作为后续提取输入。

```text
请为我生成一个可运行的网页采集模块，目标是抓取 [Amazon Best Seller 类目 URL]，将商品标题、排名、价格、评分、评论数、品牌和商品链接整理为 Markdown 文件。

要求：
1. 优先使用 Firecrawl 或 Playwright 抓取动态页面，保留失败重试与本地缓存。
2. 输出为 `data/raw/amazon-best-seller-[category]-[date].md`。
3. 同时生成 `scripts/fetch_amazon_bestseller.py`、`requirements.txt`、`.env.example`。
4. 代码里把抓取规则抽成配置，方便替换为其他电商榜单。
5. 增加 robots.txt 检查、请求间隔、User-Agent 轮换和异常日志。
6. 最后给我一个 `python scripts/fetch_amazon_bestseller.py --url "[URL]"` 的运行命令。
```

**预期输出文件名**：`data/raw/amazon-best-seller-[category]-[date].md`

**安全注意事项**：仅限公开网页；不要写入账号 Cookie、支付信息或私人会话数据。

### 2. 结构化提取（Markdown → JSON，本地 Ollama）

**用途**：把采集后的 Markdown 转成结构化 JSON，供检索和分析使用。

```text
请基于本地文件 `data/raw/amazon-best-seller-[category]-[date].md` 生成一个结构化提取程序，把 Markdown 转成 JSON 数组。

要求：
1. 必须使用本地 Ollama，不允许调用任何公网 LLM API。
2. 默认模型使用 `[ollama_model]`，例如 `qwen2.5:14b` 或 `llama3.1:8b`。
3. 每条商品至少输出这些字段：`rank`、`title`、`brand`、`price`、`price_band`、`rating`、`review_count`、`category`、`product_url`、`competitive_position`、`source_file`、`captured_at`。
4. `price_band` 需要按 `[价格区间规则]` 自动分类；`competitive_position` 需要给出 `budget/mass/premium/luxury` 之一。
5. 生成 `scripts/extract_products_to_json.py`，并把结果写入 `data/structured/products-[category]-[date].json`。
6. 同时生成一个 JSON Schema 校验脚本，保证空字段、类型错误、缺失字段都能被拦截。
```

**预期输出文件名**：`data/structured/products-[category]-[date].json`

**安全注意事项**：本 Prompt 虽处理公开数据，但已指定使用本地 Ollama，后续若切换为内部资料可直接复用，不要改成公网模型。

### 3. 向量库导入（JSON → ChromaDB，BGE-M3 Embedding）

**用途**：把结构化商品知识导入向量库，建立可检索集合。

```text
请生成一个向量化导入模块，把 `data/structured/products-[category]-[date].json` 导入 ChromaDB。

要求：
1. Embedding 模型固定使用 `BAAI/bge-m3`。
2. 每条记录的 document 由标题、品牌、类目、价格带、竞争定位和摘要拼接而成。
3. metadata 至少包含 `rank`、`brand`、`category`、`price_band`、`competitive_position`、`captured_at`。
4. 集合名使用 `[collection_name]`，支持重复导入时按 `product_url + captured_at` 去重。
5. 输出 `scripts/load_into_chromadb.py` 和 `config/vector_store.yaml`。
6. 运行后打印导入数量、去重数量、失败数量和示例检索结果。
```

**预期输出文件名**：`scripts/load_into_chromadb.py`

**安全注意事项**：Embedding 过程会把文本持久化进向量库，若未来接入内部数据，必须将 ChromaDB 部署在受控内网。

### 4. 语义检索 API（FastAPI POST /query，支持过滤）

**用途**：暴露最小可用的语义检索服务，支持 metadata 过滤。

```text
请生成一个 FastAPI 检索服务，提供 `POST /query` 接口，对接已有 ChromaDB 集合 `[collection_name]`。

接口要求：
1. 请求体包含 `query`、`top_k`、`filters` 三个字段。
2. `filters` 至少支持 `category`、`brand`、`price_band`、`competitive_position`。
3. 返回 `matches` 数组，每项包含 `score`、`document`、`metadata`。
4. 生成 `app/main.py`、`app/schemas.py`、`app/retriever.py`、`tests/test_query_api.py`。
5. 给出本地启动命令、示例请求和 Pytest 用例。
6. 代码风格以生产可维护为目标，不要把所有逻辑写在一个文件里。
```

**预期输出文件名**：`app/main.py`

**安全注意事项**：如果接到公司内网中，默认关闭公开 Swagger 暴露，避免被外部探测检索结构。

### 5. 生产级 API（限流 + CORS + 审计日志）

**用途**：把最小检索 API 提升到可上线的服务边界。

```text
请在现有 FastAPI 检索服务上继续增强，生成生产级接口能力。

要求：
1. 增加基于 IP 或 API Key 的限流中间件。
2. 增加精确的 CORS 白名单配置，来源从环境变量读取。
3. 增加结构化审计日志，记录请求时间、调用方、query、filters、命中条数、耗时、错误码。
4. 为健康检查、配置加载失败、向量库不可用等场景补充错误处理。
5. 输出 `app/middleware.py`、`app/audit.py`、`docker-compose.yml`、`Dockerfile`。
6. 再补一份 `README-production.md`，说明部署方式、环境变量、风险点和回滚步骤。
```

**预期输出文件名**：`README-production.md`

**安全注意事项**：审计日志里不要落完整用户身份信息或原始敏感查询，必要时做哈希化或截断。

## 15.2 进阶功能 Prompt（6-12）

### 6. 新鲜度检查（半衰期计算，每天自动运行）

**用途**：自动判断知识是否陈旧，给召回结果加上时效权重。

```text
请生成一个知识新鲜度检查任务，对 `[collection_name]` 中的商品知识每天做一次半衰期衰减计算。

要求：
1. 半衰期规则可配置，例如 `[half_life_days]` 天。
2. 输出字段包括 `freshness_score`、`days_since_capture`、`stale_level`。
3. 生成 `jobs/freshness_check.py` 和定时运行配置（cron 或 APScheduler）。
4. 对于低于阈值的记录，标记需要重新抓取或重新提取。
5. 提供一份日报 Markdown：`reports/freshness-[date].md`。
```

**预期输出文件名**：`reports/freshness-[date].md`

**安全注意事项**：如果 freshness 逻辑引用内部运营更新时间，必须使用本地调度与本地存储，不向外发事件。

### 7. 内部 CSV 经营数据处理（pandas → Ollama → 向量库）

**用途**：把内部经营数据转成可检索业务知识。

```text
请基于内部 CSV 文件 `[csv_path]` 生成一个数据处理 Pipeline，把经营数据先用 pandas 聚合，再调用本地 Ollama 生成摘要，最后写入向量库。

要求：
1. 必须使用本地 Ollama，禁止任何公网模型 API。
2. CSV 中至少包含 `[date]`、`[sku]`、`[sales]`、`[orders]`、`[ad_spend]`、`[refund_rate]` 等字段。
3. 先按 `[聚合维度]` 做 pandas 聚合，再为每个分组生成业务摘要和异常说明。
4. 输出 `data/derived/internal-kb-[date].json`，再导入 `[internal_collection]`。
5. 生成 `pipelines/process_internal_csv.py`、`pipelines/summarize_with_ollama.py`、`pipelines/load_internal_vectors.py`。
6. 为缺失值、字段名变化、数值异常补充校验和告警。
```

**预期输出文件名**：`data/derived/internal-kb-[date].json`

**安全注意事项**：这是**内部数据专用**模板，所有摘要、Embedding、日志、缓存都必须在本地或内网执行。

### 8. 评估测试集（20 个标准查询，命中率测试）

**用途**：快速建立一套可重复运行的 RAG 回归测试集。

```text
请为当前知识库生成一个评估测试集，包含 20 个标准查询，覆盖事实查询、筛选查询、多条件比较、价格带判断、品牌对比和异常问题。

要求：
1. 生成 `eval/test_queries.json`，每条包含 `query`、`expected_keywords`、`expected_filters`、`expected_min_hits`。
2. 再生成 `eval/run_retrieval_eval.py`，统计 Hit Rate@3、Hit Rate@5、MRR。
3. 输出 `reports/retrieval-eval-[date].md`，汇总失败样例和建议修复点。
4. 评估脚本要能作为 CI 命令运行。
```

**预期输出文件名**：`eval/test_queries.json`

**安全注意事项**：若测试问题映射内部经营场景，不要把真实客户名、供应商名或渠道名直接写进公开仓库。

### 9. Embedding 对比实验（BGE-M3 vs 其他模型）

**用途**：用同一测试集比较不同 Embedding 模型的召回效果。

```text
请搭一个 Embedding 对比实验框架，比较 `BAAI/bge-m3` 与 `[other_embedding_models]` 在当前测试集上的检索效果。

要求：
1. 复用 `eval/test_queries.json`。
2. 每个模型单独建集合，避免相互污染。
3. 统计 Hit Rate@3、Hit Rate@5、MRR、平均响应时间、索引体积。
4. 产出 `reports/embedding-benchmark-[date].md` 和 `reports/embedding-benchmark-[date].csv`。
5. 明确给出推荐模型和不推荐原因。
```

**预期输出文件名**：`reports/embedding-benchmark-[date].md`

**安全注意事项**：如果候选 Embedding 需要联网下载模型，请先确认镜像源合规；内部数据评估时不要调用外部向量 API。

### 10. 错误处理与降级（抓取失败 / LLM 限流）

**用途**：给采集与生成链路补上可恢复机制。

```text
请为当前知识库 Pipeline 增加系统级错误处理与降级机制。

要求：
1. Firecrawl 抓取失败时按指数退避重试，仍失败则回退到本地缓存或 Playwright。
2. LLM 请求超时、限流或响应非法时，自动切换到本地 Ollama。
3. 把重试次数、降级原因、最终路径写入结构化日志。
4. 生成 `core/retry.py`、`core/fallbacks.py`、`tests/test_fallbacks.py`。
5. 最后给出一张失败路径流程图和告警建议。
```

**预期输出文件名**：`core/fallbacks.py`

**安全注意事项**：降级到缓存时要标记数据时间戳，避免误把过期缓存当成最新事实。

### 11. 轻量知识图谱（NetworkX）

**用途**：在向量检索外补一层关系图，支持一跳扩展查询。

```text
请基于当前商品 JSON 和检索库生成一个轻量知识图谱模块，使用 NetworkX 构建品类、品牌、价格带、竞争定位之间的关系图。

要求：
1. 节点类型至少包含 `product`、`brand`、`category`、`price_band`、`competitive_position`。
2. 关系至少包含 `belongs_to`、`competes_in`、`priced_as`、`related_to`。
3. 提供一跳扩展查询函数，例如“查询某品牌后顺带返回相邻品类与价格带”。
4. 输出 `graph/build_graph.py`、`graph/query_graph.py`、`data/graph/market_graph.gpickle`。
5. 再生成一个简单可视化脚本输出 PNG。
```

**预期输出文件名**：`data/graph/market_graph.gpickle`

**安全注意事项**：关系图容易暴露业务结构，如果来自内部经营数据，图文件必须留在受控目录并限制下载。

### 12. MCP Server 封装（FastMCP）

**用途**：把检索能力封装成智能体可直接调用的 Tool。

```text
请将当前知识库检索能力封装为一个 FastMCP Server，提供两个 Tool：`search_products` 和 `get_market_overview`。

要求：
1. `search_products` 输入 `query`、`top_k`、`filters`，返回结构化命中结果。
2. `get_market_overview` 输入 `category` 或 `brand`，返回市场概览、价格带分布和主要竞争定位。
3. 生成 `mcp_server/server.py`、`mcp_server/tools.py`、`mcp_server/README.md`。
4. 给出 Cursor 或 Claude Desktop 的 MCP 配置示例。
5. 确保 Tool 输出稳定、字段名固定、错误信息可追踪。
```

**预期输出文件名**：`mcp_server/server.py`

**安全注意事项**：MCP Server 如果接入内部知识库，默认只在内网监听，不要暴露为公网无鉴权服务。

## 15.3 高级功能 Prompt（13-20）

### 13. 推理模型分析（Ollama DeepSeek-R1）

**用途**：做竞争格局、价格空白和机会评分分析。

```text
请基于当前商品知识库，构建一个使用本地 Ollama `deepseek-r1` 的分析模块，输出竞争格局分析、价格空白识别和机会评分。

要求：
1. 必须使用本地 Ollama，不允许任何公网推理模型。
2. 输入可以是类目、品牌或筛选后的商品集合。
3. 输出字段至少包含 `market_summary`、`price_gap_opportunities`、`competition_intensity`、`opportunity_score`、`reasoning_chain`。
4. 把 `reasoning_chain` 单独存为审计字段，方便复核。
5. 生成 `analysis/reasoning_insights.py` 和 `reports/reasoning-analysis-[date].json`。
```

**预期输出文件名**：`reports/reasoning-analysis-[date].json`

**安全注意事项**：`reasoning_chain` 可能暴露内部判断逻辑，仅限内部审计使用，不要直接回传给终端用户。

### 14. 多模态检索（CLIP 图片 + 文本联合 Embedding）

**用途**：支持“用图片找相似产品”。

```text
请生成一个多模态检索模块，支持商品图片和文本联合检索，实现“上传一张商品图，返回相似产品”。

要求：
1. 使用 CLIP 或兼容模型生成图片与文本 Embedding。
2. 图片向量和文本向量统一写入同一个检索层，支持 late fusion 或 weighted fusion。
3. 提供 `POST /image-query` 接口，输入图片文件，输出相似商品及相似度。
4. 生成 `multimodal/embed_images.py`、`multimodal/search.py`、`app/image_api.py`。
5. 附一个最小前端页面用于上传图片测试。
```

**预期输出文件名**：`app/image_api.py`

**安全注意事项**：如果图片来自内部设计稿、用户上传或未发布商品，Embedding 与缓存都必须走本地存储。

### 15. 实时流集成（MySQL binlog 监听）

**用途**：让知识库能随业务数据增量更新。

```text
请为内部业务库生成一个实时流集成模块，监听 MySQL binlog，把 `[source_table]` 的增量变化同步到知识库。

要求：
1. 捕获 insert、update、delete 三类事件。
2. 更新流程包括：字段映射、摘要重建、本地 Ollama 重写、向量库 upsert、审计日志记录。
3. 输出 `streaming/binlog_listener.py`、`streaming/sync_pipeline.py`、`streaming/checkpoint.json`。
4. 支持断点续跑和重复消费保护。
5. 生成一份增量同步时序说明文档。
```

**预期输出文件名**：`streaming/binlog_listener.py`

**安全注意事项**：这是典型内部数据链路，摘要生成必须使用本地 Ollama，binlog 凭证不得写死在代码中。

### 16. A/B 测试框架（两个 Prompt 版本对比）

**用途**：比较不同检索 Prompt 或总结 Prompt 的效果差异。

```text
请生成一个 A/B 测试框架，对比两个 Prompt 版本 `[prompt_a]` 和 `[prompt_b]` 在同一评估集上的效果。

要求：
1. 测试指标包括 Hit Rate@K、人工评分均值、平均响应时间。
2. 自动做显著性检验，判断差异是否可信。
3. 输出 `abtest/run_abtest.py`、`abtest/prompts.yaml`、`reports/abtest-[date].md`。
4. 报告里要说明哪个版本胜出，以及建议上线条件。
```

**预期输出文件名**：`reports/abtest-[date].md`

**安全注意事项**：如果 Prompt 包含内部业务术语或 SOP，不要把实验样本发往公网推理服务。

### 17. 成本监控（全链路 token + 费用追踪）

**用途**：量化采集、提取、生成、检索全链路成本。

```text
请为当前知识库系统增加成本监控模块，跟踪抓取、Embedding、LLM 生成、检索和分析各环节的 token、耗时和费用。

要求：
1. 输出统一成本事件表。
2. 生成一个 Streamlit 仪表盘，按天、按模块、按模型查看消耗。
3. 增加月预算阈值，超出后触发熔断或降级到本地模型。
4. 生成 `monitoring/cost_tracker.py`、`dashboard/streamlit_cost_app.py`、`reports/monthly-cost-[month].md`。
```

**预期输出文件名**：`dashboard/streamlit_cost_app.py`

**安全注意事项**：成本日志可记录模型名和用量，但不要记录完整内部 Prompt 正文和敏感数据原文。

### 18. PII 脱敏（presidio 检测）

**用途**：在内部数据进入知识库前做脱敏和审计。

```text
请生成一个 PII 脱敏模块，使用 Presidio 检测内部文本中的邮箱、手机号、身份证、地址、人名等敏感信息，并按策略替换后再进入知识库。

要求：
1. 支持 `mask/hash/remove/tokenize` 四种替换策略。
2. 生成脱敏前后差异日志，但日志中不得保留原始敏感值。
3. 输出 `security/pii_redaction.py`、`security/redaction_policy.yaml`、`reports/pii-audit-[date].md`。
4. 为误杀和漏检提供人工复核入口。
```

**预期输出文件名**：`security/pii_redaction.py`

**安全注意事项**：PII 检测本身也属于敏感处理流程，不能把原文送去公网模型做识别。

### 19. 对抗验证（知识矛盾检测）

**用途**：定期扫出知识库中的互相矛盾陈述。

```text
请生成一个知识矛盾检测任务，每周批量扫描知识库中的重复定义、价格冲突、类目冲突和时间冲突，并输出 HTML 报告。

要求：
1. 先按实体聚合，再对同一实体的不同记录做冲突比对。
2. 冲突类型至少包括 `value_conflict`、`time_conflict`、`taxonomy_conflict`、`source_conflict`。
3. 生成 `validation/contradiction_scan.py`、`validation/conflict_rules.yaml`、`reports/conflict-report-[date].html`。
4. 报告中展示冲突证据、来源、建议处理动作和优先级。
```

**预期输出文件名**：`reports/conflict-report-[date].html`

**安全注意事项**：冲突报告通常会聚合多个来源片段，若来源含内部信息，应限制访问权限并启用审计访问日志。

### 20. 预测验证闭环（推荐 → 执行 → 回灌）

**用途**：把知识推荐与真实业务结果连成反馈闭环。

```text
请为选品推荐系统构建一个预测验证闭环：先根据知识库输出推荐，再记录执行结果、销售表现和反馈，最后更新机会评分与置信度。

要求：
1. 推荐记录至少包含 `recommendation_id`、`recommended_sku`、`reason`、`confidence`、`created_at`。
2. 执行后写回 `actual_sales`、`actual_margin`、`conversion_rate`、`outcome_label`。
3. 生成一个更新模块，根据真实结果校准原来的 `opportunity_score` 与 `confidence`。
4. 输出 `feedback/recommendation_loop.py`、`feedback/update_confidence.py`、`reports/feedback-loop-[date].md`。
5. 说明如何把这个闭环接入下一轮 Prompt 和评估体系。
```

**预期输出文件名**：`feedback/update_confidence.py`

**安全注意事项**：这条链路直接连接经营结果，所有训练样本、回灌数据和置信度更新都必须限制在内网执行。

## 15.4 工具生态速查表 v2

> **阅读方式**：先按阶段选，再看优先级。`🔥` 表示默认优先尝试，`⭐` 表示成熟备选，`📚` 表示了解即可或特定场景使用。状态灯含义：`🟢` 适合当前主流生产实践，`🟡` 适合试点或特定约束，`🔴` 仅在遗留系统或强制条件下考虑。

### 采集

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | Firecrawl | 🟢 | 网站抓取与清洗 | 动态站点和批量抓取都省心 |
| 🔥 | Playwright | 🟢 | 浏览器级采集 | 页面复杂、要登录、要点击时必备 |
| ⭐ | Jina Reader | 🟡 | 快速网页转 Markdown | 适合轻量公开网页，不适合复杂交互 |

### 提取

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | MinerU | 🟢 | PDF/Office 高精度解析 | 混排文档主力 |
| ⭐ | Docling | 🟢 | CPU 友好文档解析 | 企业内网部署友好 |
| 📚 | Marker | 🟡 | 批量 PDF 解析 | 吞吐高，但要注意协议边界 |

### 结构化提取

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | Ollama + JSON Schema | 🟢 | 本地结构化抽取 | 内部数据默认路线 |
| ⭐ | Instructor | 🟢 | 结构化输出约束 | 让字段更稳、更少脏数据 |
| ⭐ | Pydantic | 🟢 | 字段验证 | 作为 LLM 输出后的硬校验层 |

### 约束输出

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | JSON Schema | 🟢 | 约束固定字段输出 | 最通用、最便于审计 |
| 🔥 | Pydantic | 🟢 | Python 侧校验 | 和 FastAPI、ETL 配合最好 |
| ⭐ | Guardrails | 🟡 | 增强约束与重试 | 适合高可靠抽取链路 |

### Embedding

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | BAAI/bge-m3 | 🟢 | 多语种通用 Embedding | 兼顾中英和检索质量 |
| ⭐ | jina-embeddings-v3 | 🟢 | 高质量检索向量 | 排名稳，适合对比实验 |
| 📚 | e5-large-v2 | 🟡 | 经典文本向量 | 老牌可靠，但新项目不必优先 |

### 向量库

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | ChromaDB | 🟢 | 本地原型与轻量生产 | 上手极快，适合知识库 PoC |
| ⭐ | Qdrant | 🟢 | 生产级向量检索 | 过滤、扩展性都更强 |
| 📚 | FAISS | 🟡 | 本地离线索引 | 适合嵌入式或实验场景 |

### 图谱

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | NetworkX | 🟢 | 轻量关系图 | 先把关系结构跑通 |
| ⭐ | Neo4j | 🟢 | 生产级知识图谱 | 查询强，但维护成本更高 |
| 📚 | ArangoDB | 🟡 | 文档+图混合存储 | 适合统一存储诉求 |

### RAG框架

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | LlamaIndex | 🟢 | 检索编排与数据连接 | 接入快，组件多 |
| 🔥 | LangChain | 🟢 | RAG 基础框架 | 生态大，但注意控制复杂度 |
| ⭐ | Haystack | 🟡 | 检索评估与管线化 | 企业搜索场景更常见 |

### Agent框架

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | FastMCP | 🟢 | Tool 暴露与 Agent 接入 | 做“可调用能力”最直接 |
| ⭐ | PydanticAI | 🟢 | 类型安全 Agent | 适合强调结构化输出 |
| 📚 | AutoGen | 🟡 | 多 Agent 协同 | 场景复杂时再上 |

### MCP协议

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | FastMCP | 🟢 | Python MCP Server | 目前最顺手 |
| ⭐ | MCP Python SDK | 🟢 | 标准协议实现 | 追求规范化时使用 |
| 📚 | MCP TypeScript SDK | 🟡 | Node 侧 MCP 开发 | 前端或 JS 栈团队更合适 |

### 工作流编排

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | APScheduler | 🟢 | 轻量定时任务 | 每日扫描、报表生成够用 |
| ⭐ | Airflow | 🟢 | 批量 ETL 编排 | DAG 清晰，适合多步骤生产流 |
| 📚 | Prefect | 🟡 | Python 友好编排 | 开发体验不错，团队需额外熟悉 |

### 本地LLM

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | Ollama | 🟢 | 本地模型统一入口 | 内部数据默认标准答案 |
| ⭐ | vLLM | 🟢 | 高吞吐服务化推理 | 并发高时更划算 |
| 📚 | LM Studio | 🟡 | 桌面实验推理 | 个人试验方便，不是生产主力 |

### 评估

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | Pytest | 🟢 | 检索与 API 回归测试 | 最容易纳入 CI |
| 🔥 | Ragas | 🟢 | RAG 质量评估 | 适合快速量化召回与回答 |
| ⭐ | DeepEval | 🟡 | LLM 评估框架 | 适合做更丰富的实验 |

### 监控

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | Prometheus | 🟢 | 指标采集 | API、任务、延迟都能统一监控 |
| ⭐ | Grafana | 🟢 | 可视化看板 | 和 Prometheus 配套最稳 |
| ⭐ | Streamlit | 🟡 | 业务型监控面板 | 做成本和评估报表很快 |

### 安全

| 优先级 | 工具 | 状态 | 核心用途 | 一句话备注 |
| --- | --- | --- | --- | --- |
| 🔥 | Presidio | 🟢 | PII 检测与脱敏 | 内部数据入库前先过这一层 |
| ⭐ | Vault | 🟢 | 密钥管理 | 不要把凭证塞进代码和 .env 提交 |
| ⭐ | Trivy | 🟡 | 镜像与依赖扫描 | 上线前做基础供应链检查 |

## 15.5 怎么选最少的一组组合？

如果你只想快速搭一个**最小可用知识库 Pipeline**，可以优先采用下面这条组合：

1. **采集**：Firecrawl / Playwright
2. **提取**：Markdown + 本地 Ollama 结构化输出
3. **Embedding**：BGE-M3
4. **向量库**：ChromaDB（原型）或 Qdrant（生产）
5. **API**：FastAPI
6. **Agent 调用**：FastMCP
7. **评估**：Pytest + Ragas
8. **安全**：Presidio + 本地 Ollama

这套组合的好处是：**简单、便宜、迁移成本低、内外部数据边界清楚**。先把链路打通，再决定是否加图谱、多模态、实时流或预测反馈闭环。

## 15.6 最后提醒：Prompt 写得越像“技术负责人下任务”，Codex 产物越稳

一个好 Prompt，至少要说清楚五件事：

1. **输入是什么**：URL、Markdown、CSV、表、图片还是向量库。
2. **输出是什么**：文件名、接口、报表、集合名、字段名。
3. **约束是什么**：本地 Ollama、JSON Schema、日志格式、部署方式。
4. **失败怎么办**：重试、缓存、降级、告警。
5. **怎么验收**：测试脚本、样例请求、报表或评估指标。

只要这五件事说完整，Codex App / Cursor / Claude 基本就能从“写几段代码”升级成“帮你搭完整知识库工程”。
