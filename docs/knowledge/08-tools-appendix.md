# 附录：所有工具逐一说明

### A. 多模态内容解析工具

---

#### MinerU 2.5-Pro
- **定位**：精度最高的本地 PDF/文档解析器，2026年 OmniDocBench 榜首
- **核心能力**：PDF解析、表格提取、公式识别、阅读顺序还原、OCR
- **精度**：OmniDocBench 综合评分 95.7（超越 GPT-4V 级别 VLM）
- **要求**：需要 GPU（1.2B 参数模型）
- **推荐场景**：最高精度需求、有 GPU 的场景、复杂扫描件
- **安装**：
  ```bash
  pip install mineru
  mineru -p input.pdf -o output/ -m auto
  ```
- **来源**：开源本地，GitHub opendatalab/MinerU

---

#### Docling（IBM Research）
- **定位**：企业级开源文档解析器，LangChain/LlamaIndex 原生集成
- **核心能力**：PDF/DOCX/PPTX/图片解析，表格提取（97.9%准确率），视频 ASR+关键帧
- **精度**：表格最强的开源本地方案之一
- **要求**：CPU 可用（无需 GPU）
- **推荐场景**：企业数据合规、air-gap 环境、需要 LangChain 集成
- **安装**：
  ```bash
  pip install docling
  docling input.pdf --output output.md
  ```
- **来源**：开源本地，GitHub docling-project/docling（63K★）

---

#### LlamaParse
- **定位**：托管 API，语义感知的多模态文档解析
- **核心能力**：复杂 PDF、表格、图表的语义理解（非仅 OCR），多模态解析
- **两种模式**：
  - Fast Mode：速度快，适合简单文档
  - Agentic Mode：Agent 驱动，处理复杂布局
- **要求**：API Key，按页计费（约 $0.003/页）
- **推荐场景**：复杂 PDF、需要快速集成、无服务器场景
- **安装**：
  ```bash
  pip install llama-cloud-services   # 注意：旧 llama-parse 包已废弃
  ```
- **注意**：正在迁移 SDK，使用最新文档

---

#### Unstructured
- **定位**：多格式企业文档 ETL，RAG 专用分块
- **核心能力**：支持 30+ 文件格式（含 email/HTML/RTF），RAG 专用分块策略
- **精度**：表格提取不如 Docling，但格式支持最广
- **推荐场景**：需要处理多种格式混合的企业文档集合
- **安装**：
  ```bash
  pip install unstructured
  ```

---

#### markitdown（Microsoft）
- **定位**：万能文件→Markdown 转换器
- **核心能力**：支持 PDF/DOCX/PPTX/XLSX/图片/音频/ZIP，零配置，166K★
- **推荐场景**：快速格式转换，不需要高精度时的首选
- **安装**：
  ```bash
  pip install markitdown
  markitdown input.pptx > output.md
  ```

---

### B. 音视频处理工具

---

#### yt-dlp
- **定位**：视频/音频下载神器，支持 YouTube/B站/播客平台等 1000+ 站点
- **核心命令**：
  ```bash
  # 下载视频+官方字幕
  yt-dlp --write-subs --sub-langs zh-Hans [URL]
  
  # 仅提取音频（MP3）
  yt-dlp -x --audio-format mp3 [URL] -o audio.mp3
  
  # 下载字幕不下视频
  yt-dlp --write-subs --skip-download [URL]
  ```
- **推荐场景**：所有需要从网络获取视频/音频内容的场景

---

#### faster-whisper
- **定位**：OpenAI Whisper 的高速本地实现，中文识别优秀
- **核心能力**：多语言 ASR，large-v3 模型中文识别质量接近商业 API
- **性能**：比原版 Whisper 快 4x，内存减半
- **推荐场景**：本地中文语音转写首选（免费）
- **安装和使用**：
  ```bash
  pip install faster-whisper
  faster-whisper --model large-v3 --language zh audio.mp3 --output_format txt
  ```
- **来源**：SYSTRAN/faster-whisper（53K★）

---

#### pyannote-audio
- **定位**：说话人分离（Speaker Diarization）开源库
- **核心能力**：识别音频中的多个说话人，输出 [SPEAKER_00] 等标注
- **推荐场景**：多人对话的播客/会议录音
- **安装**：
  ```bash
  pip install pyannote.audio
  # 需要 HuggingFace token（模型有访问限制）
  ```
- **来源**：pyannote/pyannote-audio（7K★）

---

### C. 知识蒸馏核心工具

---

#### cangjie-skill（仓颉Skill）
- **定位**：书/视频/播客通用蒸馏框架，RIA-TV++ 7阶段方法论
- **核心能力**：
  - 5个并行提取器（框架/原则/案例/反例/术语）
  - 三重验证筛选（2处佐证/预测力/独特性）
  - 输出格式：RIA++（引用/释义/案例/触发场景/执行步骤/边界）
- **支持输入**：书籍/长视频转写/播客文字稿/PDF
- **来源**：kangarooking/cangjie-skill（4551★）
- **使用**：
  ```bash
  /cangjie-skill [输入文件路径]
  ```

---

#### Resource2Skill（Microsoft）
- **定位**：多模态资源→分层 Skill Wiki，Microsoft 出品
- **核心能力**：
  - 输入：教程视频、代码仓库、文章、参考产物
  - 输出：多模态 Skill Wiki（文本+代码+视觉样例+元数据+溯源）
  - 7个领域测试：比无 Skill Agent 高 +11.9 分
- **Skill Entry 结构**：
  ```json
  {
    "name": "skill_name",
    "text_body": "何时用/为何用/如何触发",
    "code_field": "可执行代码模板",
    "visual_examples": ["关键帧路径"],
    "source_path": "原始来源路径"
  }
  ```
- **来源**：microsoft/Resource2Skill（267★）
- **安装**：
  ```bash
  git clone https://github.com/microsoft/Resource2Skill
  ```

---

#### COLLEAGUE.SKILL
- **定位**：从人的痕迹（聊天/文档/代码/邮件）蒸馏个人 Skill
- **核心能力**：
  - 双轨提取：能力轨道（工作方法/心智模型）+ 行为轨道（沟通风格/边界）
  - 版本管理 + 生命周期追踪
  - 支持安装到 Claude Code、Codex
- **输出**：SKILL.md + work_skill.md + persona_skill.md + manifest.json
- **来源**：titanwings/colleague-skill（18.5K★）

---

#### Anything2Skill
- **定位**：将文档/手册/对话/日志/轨迹编译为结构化 Skill 契约
- **Skill 契约字段**：调用条件、禁忌、行动步骤、工作流、约束、输出规范、置信度
- **特性**：版本管理、生命周期追踪、可视化 Skill 树
- **来源**：arxiv.org/abs/2606.09316（2026）

---

#### Corpus2Skill（HuggingFace）
- **定位**：离线将整个文档语料库编译为层级 Skill 目录树
- **核心创新**：Agent 直接浏览树（ls/cat）而非向量检索
- **效果**：企业客服 QA 基准上超越 dense retrieval、RAPTOR、agentic RAG
- **来源**：HuggingFace papers/2604.14572

---

#### bdistill
- **定位**：结构化 IF-THEN 决策规则提取
- **核心能力**：
  - 描述需求 → 结构化提取 → 对抗挑战（逼迫具体化）→ 一致性验证 → JSONL 持久化
  - 输出格式含 quality_score 和 tags
- **推荐场景**：监控系统、推荐引擎、自动化决策
- **来源**：francyjglisboa/bdistill-skills

---

#### yourself-skill
- **定位**：自我蒸馏——从个人记录（日记/工作日志/对话）提取个人知识 Skill
- **来源**：notdog1998/yourself-skill（3203★）

---

### D. 网页/内容提取工具

---

#### Jina Reader
- **定位**：URL→干净 Markdown，零配置，公共 API
- **使用**：
  ```bash
  curl "r.jina.ai/[目标URL]"
  # 例：curl "r.jina.ai/https://example.com/article"
  ```
- **推荐场景**：快速提取单篇文章，无需安装任何工具

---

#### Defuddle CLI
- **定位**：本地网页内容提取，去除广告/导航/弹窗，保留正文 Markdown
- **优势**：本地运行，无需 API，适合批量处理
- **来源**：项目 skills 中已集成

---

#### Obsidian Web Clipper
- **定位**：浏览器插件，一键保存网页到 Obsidian inbox/
- **推荐场景**：日常积累，配合每周批量蒸馏使用

---

### E. 代码仓库处理工具

---

#### Repomix
- **定位**：将整个代码仓库打包为单文件，直接给 LLM 处理
- **使用**：
  ```bash
  npx repomix --output repo-packed.md --include "docs/**,examples/**,README*"
  ```
- **来源**：Aider-AI/repomix（27K★，原含于 markitdown 生态）

---

#### Context7 MCP
- **定位**：精准查询官方库文档（语义搜索，始终返回最新版本）
- **核心优势**：解决代码仓库文档过时问题，直接返回官方最新 API 说明
- **推荐场景**：编程时需要查库文档，取代手动翻文档
- **配置**：MCP server，在 .mcp.json 中配置

---

#### Ananta
- **定位**：让 LLM 主动探索大型代码库（写 Python 查询代码自主发现）
- **核心创新**：LLM 不是被动接收代码，而是主动 "运行查询" 探索
- **推荐场景**：理解复杂代码库架构
- **来源**：Ovid/ananta（24★）

---

### F. 知识库基础设施

---

#### OpenKB
- **定位**：文档→Wiki→Skill 全链路知识库系统
- **核心能力**：长文档 PageIndex、Wiki 生成、Skill 工厂
- **来源**：VectifyAI/OpenKB
- **安装**：
  ```bash
  pip install openkb
  openkb skill new my-skill "作为 X 领域专家"
  ```

---

#### LightRAG
- **定位**：支持知识图谱的 RAG 系统，适合多模态知识图谱入库
- **推荐场景**：图片/图表蒸馏后的知识图谱存储

---

#### wigolo
- **定位**：本地优先网页情报系统（搜索+抓取+监控+缓存）
- **核心能力**：
  - wigolo-search：ML重排序的网页搜索
  - wigolo-watch：监控目标页面更新
  - wigolo-fetch：本地缓存的网页抓取
- **推荐场景**：持续更新知识库时监控目标源

---

### G. 综合参考：GitHub 生态速查

| 工具 | Stars | 输入 | 核心方法 |
|------|-------|------|----------|
| kangarooking/cangjie-skill | 4551★ | 书+视频+播客 | RIA-TV++ 7阶段 |
| microsoft/Resource2Skill | 267★ | 视频+代码+文章 | 多模态Skill Wiki |
| titanwings/colleague-skill | 18500★ | 人物痕迹 | 双轨（能力+行为）|
| notdog1998/yourself-skill | 3203★ | 个人记录 | 自我蒸馏 |
| virgiliojr94/book-to-skill | 9188★ | 书/PDF | Map-Reduce+两层 |
| jangviktor-web/nihaixia | 1347★ | 视频讲义+医案 | 多模态→SKILL.md |
| SYSTRAN/faster-whisper | 53K★ | 音频 | 本地 ASR |
| pyannote/pyannote-audio | 7K★ | 多人音频 | 说话人分离 |
| docling-project/docling | 63K★ | 文档+视频 | 多模态解析 |
| microsoft/markitdown | 166K★ | 任意文件 | 万能→Markdown |
| Aider-AI/repomix | 27K★ | 代码仓库 | 仓库→单文件 |
| francyjglisboa/bdistill-skills | — | 规则/数据 | IF-THEN提取 |
| VectifyAI/OpenKB | — | 文档 | 文档→Wiki→Skill |
| Ovid/ananta | 24★ | 代码库 | LLM主动探索 |

---
