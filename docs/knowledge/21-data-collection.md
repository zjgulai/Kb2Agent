---
name: "knowledge-data-collection"
docId: "KS-DATA-COLLECTION"
displayNumber: "21"
route: "/knowledge/21-data-collection"
learningOrder: 3
title: "第二十一章：多模态数据采集方法论"
description: "多模态数据采集方法论，覆盖爬虫、Agent 与 API 三大范式，评估场景、局限与合规边界。仓库版本和代码默认待复核，不代表已获授权或已烟测。"
chapter: "21"
order: 3
section: engineering
stage: build
maturity: solution
verification: pending
codeStatus: illustrative
reviewedAt: null
testedWith: []
evidence: []
---
# 第二十一章：多模态数据采集方法论

> **本章定位**：在蒸馏之前，数据从哪里来？本章覆盖文本、图像、音视频和结构化数据的采集范式，提供分类框架、仓库评估、决策树与示意代码；真实执行前必须核对授权、ToS、robots、PII、限速与离线 fixture。
>
> **调研日期**：2026-07-30 | **方法论层级**：数据采集（蒸馏 Pipeline 第 0 步）

---

## 本章导航

| 范式 | 核心工具 | 推荐场景 |
|------|---------|---------|
| **[范式一：传统爬虫](#_21-2-范式一-传统爬虫)** | Playwright/Crawl4AI/Scrapy/Apify | 结构化批量抓取、规则清晰的静态/动态网页 |
| **[范式二：Agent 驱动采集](#_21-3-范式二-agent-驱动采集)** | agent-reach/browser-use/Stagehand | 需要判断、交互、多步操作的复杂采集任务 |
| **[范式三：API 聚合](#_21-4-范式三-api-聚合)** | TikHub/Apify Actor/Jina/Firecrawl | 有官方/第三方 API、需要合规数据的场景 |
| **[音视频专项](#_22-音视频多模态采集)** | yt-dlp/SenseVoice/Whisper | YouTube/B站/播客/会议录音转文字 |
| **[图像与文档专项](#_23-图像与文档采集)** | MinerU/Docling/ColPali | PDF/PPT/图表/截图的结构化提取 |
| **[选型决策树](#_24-采集范式选型决策树)** | — | 不知道用哪种？先看这里 |

---

## 21.1 三大范式分类框架

```
数据采集范式
├── 范式一：传统爬虫  ← 规则驱动，高吞吐，成本低
│   ├── 纯HTTP（requests/httpx）
│   ├── 动态渲染（Playwright/Selenium）
│   └── 分布式（Scrapy/Crawlee）
├── 范式二：Agent 驱动  ← LLM 决策，适应性强，成本高
│   ├── 视觉 Agent（截图+VLM理解）
│   ├── DOM Agent（结构化操作）
│   └── 多步推理 Agent（复杂交互场景）
└── 范式三：API 聚合  ← 合规优先，有限速，最稳定
    ├── 官方平台 API（YouTube Data API/GitHub API）
    ├── 第三方数据服务（TikHub/Bright Data）
    └── AI 增强 API（Firecrawl/Jina Reader/Spider）
```

### 三范式对比总表

| 维度 | 传统爬虫 | Agent 驱动 | API 聚合 |
|------|---------|-----------|---------|
| **吞吐量** | ⭐⭐⭐⭐⭐ 万级/小时 | ⭐⭐ 十~百级/小时 | ⭐⭐⭐⭐ 千~万级/小时（受限速） |
| **适应性** | ⭐⭐ 页面变动即失效 | ⭐⭐⭐⭐⭐ 自适应 | ⭐⭐⭐ 受 API 字段限制 |
| **成本** | ⭐⭐⭐⭐⭐ 极低 | ⭐⭐ LLM 调用费高 | ⭐⭐⭐ 中等（付费 API） |
| **反爬突破** | ⭐⭐⭐ 需要手动处理 | ⭐⭐⭐⭐ 浏览器指纹模拟 | ⭐⭐⭐⭐⭐ 无（官方授权） |
| **数据合规性** | ⭐⭐ 灰色地带 | ⭐⭐ 灰色地带 | ⭐⭐⭐⭐⭐ 合规 |
| **维护成本** | ⭐⭐ 页面结构变动即需维护 | ⭐⭐⭐⭐ LLM 理解语义，低维护 | ⭐⭐⭐⭐ API 版本变动即需更新 |
| **最佳场景** | 大规模静态/半动态页面 | 复杂交互、登录态、多步导航 | 平台数据、音视频元数据、社交内容 |

---

## 21.2 范式一：传统爬虫

### 2026 年最优仓库矩阵

| 仓库 | Stars | 定位 | 核心能力 | 局限性 |
|------|-------|------|---------|--------|
| [Crawl4AI](https://github.com/unclecode/crawl4ai) | 47k+ | AI 原生爬虫 | 内置 LLM 提取、异步、Markdown 输出 | JS 渲染页面需配置 |
| [Playwright](https://github.com/microsoft/playwright) | 70k+ | 浏览器自动化基础设施 | 全浏览器支持、截图、CDP 协议 | 非专用爬虫，需自己封装 |
| [Scrapy](https://github.com/scrapy/scrapy) | 53k+ | 工业级爬虫框架 | 分布式、中间件体系、Item Pipeline | 不擅长动态页面 |
| [Crawlee](https://github.com/apify/crawlee) | 17k+ | Node.js 爬虫框架 | Playwright+HTTP 统一接口、存储内置 | TypeScript/JS 生态 |
| [Spider](https://github.com/spider-rs/spider) | 4.5k+ | Rust 超高性能 | 最快爬虫之一、WASM 支持 | 生态较新 |

### Crawl4AI — AI 原生爬虫（2026 首选）

```python
# pip install crawl4ai
# 首次运行需要: crawl4ai-setup  (安装 Playwright 浏览器)

import asyncio
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from pydantic import BaseModel

class Article(BaseModel):
    title: str
    author: str
    publish_date: str
    summary: str
    key_points: list[str]

async def crawl_article(url: str):
    """AI 原生采集：自动提取结构化内容"""
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,  # 不使用缓存，获取最新
        extraction_strategy=LLMExtractionStrategy(
            provider="openai/gpt-4o-mini",
            api_token="sk-...",  # 或从环境变量读取
            schema=Article.model_json_schema(),
            instruction="提取文章的核心信息，key_points 列出 3-5 个核心观点",
        ),
        wait_for="css:.article-content",  # 等待内容加载
        js_code="window.scrollTo(0, document.body.scrollHeight)",  # 触发懒加载
    )
    
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url, config=config)
        
        if result.success:
            print(f"✅ 采集成功: {len(result.markdown)} 字符")
            print(f"📄 Markdown:\n{result.markdown[:500]}...")
            
            if result.extracted_content:
                import json
                article = json.loads(result.extracted_content)
                print(f"🎯 结构化提取: {article}")
        else:
            print(f"❌ 采集失败: {result.error_message}")
        
        return result

async def batch_crawl(urls: list[str], max_concurrent: int = 5):
    """批量采集，控制并发"""
    config = CrawlerRunConfig(
        cache_mode=CacheMode.ENABLED,
        markdown_generator_config={"ignore_links": False, "body_width": 0},
    )
    
    async with AsyncWebCrawler(config=config) as crawler:
        results = await crawler.arun_many(
            urls=urls,
            config=config,
        )
    
    return [r for r in results if r.success]

# 使用示例
asyncio.run(crawl_article("https://example.com/article"))
```

### Playwright — 动态页面专项

```python
# pip install playwright && playwright install chromium
import asyncio
from playwright.async_api import async_playwright

async def scrape_dynamic_page(url: str, wait_selector: str = None):
    """采集需要 JS 渲染的动态页面"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",  # 反反爬
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
            viewport={"width": 1920, "height": 1080},
        )
        
        page = await context.new_page()
        
        # 注入脚本隐藏自动化特征
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        
        await page.goto(url, wait_until="networkidle")
        
        if wait_selector:
            await page.wait_for_selector(wait_selector, timeout=10000)
        
        # 截图用于 VLM 理解（范式一+三结合）
        screenshot = await page.screenshot(full_page=True)
        
        # 提取正文
        content = await page.evaluate("""() => {
            // 移除导航、广告等噪声
            ['nav', 'header', 'footer', '.ad', '.sidebar'].forEach(sel => {
                document.querySelectorAll(sel).forEach(el => el.remove());
            });
            return document.body.innerText;
        }""")
        
        await browser.close()
        return content, screenshot

# 配合 MinerU 处理截图（多模态）
asyncio.run(scrape_dynamic_page("https://example.com", ".main-content"))
```

:::warning 反爬注意事项
1. **IP 轮换**：使用代理池或住宅代理，避免 IP 封锁
2. **请求频率**：设置随机延迟 `asyncio.sleep(random.uniform(1, 3))`
3. **Cookies 管理**：登录态页面需要持久化 Cookie，用 `context.storage_state()` 保存
4. **指纹模拟**：Playwright 默认可被识别，推荐使用 `playwright-stealth` 或 `rebrowser-playwright`
:::

---

## 21.3 范式二：Agent 驱动采集

### 2026 年最优仓库矩阵

| 仓库 | Stars | 定位 | 核心能力 | 局限性 |
|------|-------|------|---------|--------|
| [browser-use](https://github.com/browser-use/browser-use) | 65k+ | LLM 控制浏览器 | 自然语言指令→浏览器操作、多 LLM 支持 | 速度慢（秒/操作） |
| [Stagehand](https://github.com/browserbase/stagehand) | 10k+ | AI 浏览器框架 | 精准 DOM 操作、TypeScript 原生 | JS 生态 |
| `agent-reach`（本地工具） | 本地 | 多平台路由 | 小红书/推特/B站/Reddit 一键采集 | 需要平台授权配置；无公开仓库链接 |
| [Skyvern](https://github.com/Skyvern-AI/skyvern) | 13k+ | 视觉 Agent 自动化 | 截图+VLM 理解、表单填写、工作流 | 成本较高 |
| [LaVague](https://github.com/lavague-ai/LaVague) | 5.5k+ | 自然语言 Web 自动化 | selenium 驱动、轻量 | 功能相对基础 |

### browser-use — 自然语言驱动采集

```python
# pip install browser-use
# playwright install chromium

import asyncio
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI

async def agent_collect(task: str, url: str = None):
    """Agent 驱动：用自然语言描述采集任务"""
    
    browser = Browser(
        config=BrowserConfig(
            headless=True,
            disable_security=False,
        )
    )
    
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        max_actions_per_step=10,
    )
    
    result = await agent.run(max_steps=20)
    
    # 提取最终结果
    final_result = result.final_result()
    print(f"✅ 采集完成: {final_result}")
    
    await browser.close()
    return final_result

# 示例：采集小红书博主最新10篇笔记
asyncio.run(agent_collect(
    task="""
    访问小红书，搜索'AI知识库工程'，
    收集前10个笔记的：标题、点赞数、评论数、正文摘要。
    返回 JSON 格式的结构化数据。
    """,
))

# 示例：监控竞品价格变化
asyncio.run(agent_collect(
    task="在京东上搜索'MacBook Pro M4'，列出前5个商品的价格、店铺名和评价数",
))
```

### agent-reach — 多平台社交内容采集

```bash
# agent-reach 是 OMC 生态中的多平台内容采集工具
# 支持：小红书 / Twitter / B站 / Reddit / V2EX / YouTube / 播客 等13个平台

# 检查后端状态
agent-reach doctor --json

# 搜索小红书
agent-reach search "AI知识库" --platform xhs --limit 20 --output json

# 采集推特
agent-reach search "RAG 2026" --platform twitter --limit 50

# B站视频列表
agent-reach search "知识库工程" --platform bilibili --limit 30

# 批量采集（并行）
agent-reach batch-search \
  --queries "AI agent,RAG,knowledge base" \
  --platforms "xhs,twitter,bilibili" \
  --output ./data/social_raw/
```

```python
# 在 Python 中调用 agent-reach
import subprocess
import json

def reach_search(query: str, platform: str, limit: int = 20) -> list[dict]:
    """封装 agent-reach 搜索"""
    result = subprocess.run(
        ["agent-reach", "search", query,
         "--platform", platform,
         "--limit", str(limit),
         "--output", "json"],
        capture_output=True, text=True
    )
    
    if result.returncode == 0:
        return json.loads(result.stdout)
    else:
        raise RuntimeError(f"agent-reach failed: {result.stderr}")

# 采集多平台社交数据
platforms = ["xhs", "twitter", "bilibili"]
all_results = []

for platform in platforms:
    results = reach_search("知识库工程最佳实践", platform, limit=30)
    all_results.extend(results)
    print(f"✅ {platform}: {len(results)} 条")

print(f"📊 总计: {len(all_results)} 条数据")
```

:::info Agent 采集 vs 传统爬虫的选择依据
**选 Agent 的三个信号**：
1. 页面需要**多步交互**（登录→搜索→筛选→翻页→提取）
2. 页面结构**经常变动**（无法维护固定选择器）
3. 需要**语义理解**（从非结构化页面提取特定信息）

**不选 Agent 的三个信号**：
1. 页面结构**稳定可预测**（用传统爬虫更快100倍）
2. 需要**大规模采集**（Agent 成本是爬虫的 50-500 倍）
3. 有**官方 API**（直接调 API，合规且稳定）
:::

---

## 21.4 范式三：API 聚合

### 2026 年最优仓库与服务矩阵

| 服务/仓库 | 类型 | 支持平台 | 价格模式 | 推荐场景 |
|----------|------|---------|---------|---------|
| [TikHub](https://tikhub.io) | 第三方 API | TikTok/抖音/小红书/快手 | 按请求付费 | 短视频平台数据采集 |
| [Apify](https://apify.com) | Actor 平台 | 全平台（Actor 市场） | 订阅+按用量 | 通用爬虫托管与调度 |
| [Firecrawl](https://github.com/mendableai/firecrawl) | AI 爬虫 API | 任意网页 | 免费层+付费 | Markdown 格式输出、RAG 场景 |
| [Jina Reader](https://github.com/jina-ai/reader) | AI 网页解析 | 任意网页 | 免费（速率限制） | 快速 Markdown 提取 |
| [Spider](https://spider.cloud) | 云爬虫 | 任意网页 | 按页付费 | 大规模快速采集 |
| YouTube Data API v3 | 官方 | YouTube | 每日配额免费 | 视频元数据/字幕/评论 |
| GitHub API | 官方 | GitHub | 5000次/小时 | 代码/Issue/PR/文档 |

### TikHub — 短视频平台 API

```python
# pip install requests
import requests
import os

TIKHUB_API_KEY = os.environ["TIKHUB_API_KEY"]
BASE_URL = "https://api.tikhub.io"

headers = {
    "Authorization": f"Bearer {TIKHUB_API_KEY}",
    "Content-Type": "application/json",
}

def get_tiktok_user_videos(username: str, limit: int = 30) -> list[dict]:
    """获取 TikTok 用户最新视频列表"""
    response = requests.get(
        f"{BASE_URL}/api/v1/tiktok/app/v3/fetch_user_post_videos",
        headers=headers,
        params={
            "unique_id": username,
            "count": limit,
        }
    )
    response.raise_for_status()
    data = response.json()
    
    videos = []
    for item in data.get("data", {}).get("aweme_list", []):
        videos.append({
            "id": item["aweme_id"],
            "desc": item["desc"],  # 视频描述/文案
            "play_count": item["statistics"]["play_count"],
            "like_count": item["statistics"]["digg_count"],
            "comment_count": item["statistics"]["comment_count"],
            "share_count": item["statistics"]["share_count"],
            "duration": item["duration"],
            "create_time": item["create_time"],
            "video_url": item["video"]["play_addr"]["url_list"][0],
        })
    
    return videos

def get_xiaohongshu_notes(keyword: str, limit: int = 20) -> list[dict]:
    """小红书笔记搜索"""
    response = requests.get(
        f"{BASE_URL}/api/v1/xiaohongshu/web/search_notes",
        headers=headers,
        params={"keyword": keyword, "page": 1, "page_size": limit},
    )
    response.raise_for_status()
    return response.json().get("data", {}).get("items", [])

# 使用示例
videos = get_tiktok_user_videos("openai", limit=50)
print(f"获取 {len(videos)} 个视频")

# 提取视频文案（供蒸馏使用）
texts = [v["desc"] for v in videos if v["desc"]]
print(f"有效文案: {len(texts)} 条")
```

### Firecrawl — AI 友好的网页采集

```python
# pip install firecrawl-py
from firecrawl import FirecrawlApp
import os

app = FirecrawlApp(api_key=os.environ["FIRECRAWL_API_KEY"])

# 单页采集（返回 Markdown，直接入向量库）
result = app.scrape_url(
    "https://example.com/article",
    params={
        "formats": ["markdown", "html", "extract"],
        "extract": {
            "schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "author": {"type": "string"},
                    "publish_date": {"type": "string"},
                    "key_points": {"type": "array", "items": {"type": "string"}},
                }
            },
            "prompt": "提取文章核心信息，key_points 列出5个要点"
        }
    }
)

print(result["markdown"][:1000])
print(result.get("extract", {}))

# 站点批量爬取（深度优先）
crawl_status = app.crawl_url(
    "https://docs.example.com",
    params={
        "limit": 200,
        "scrapeOptions": {
            "formats": ["markdown"],
            "excludeTags": ["nav", "footer", ".cookie-banner"],
        },
        "includePaths": ["/docs/*"],  # 只爬文档路径
        "maxDepth": 5,
    }
)

# 等待采集完成
import time
while crawl_status["status"] != "completed":
    time.sleep(5)
    crawl_status = app.check_crawl_status(crawl_status["id"])

pages = crawl_status["data"]
print(f"✅ 采集完成: {len(pages)} 页")

# 将所有 Markdown 合并供蒸馏
all_content = "\n\n---\n\n".join(p["markdown"] for p in pages)
```

### YouTube Data API — 音视频元数据采集

```python
# pip install google-api-python-client
from googleapiclient.discovery import build
import os

youtube = build("youtube", "v3", developerKey=os.environ["YOUTUBE_API_KEY"])

def search_videos(query: str, max_results: int = 50) -> list[dict]:
    """搜索视频并获取元数据"""
    request = youtube.search().list(
        part="id,snippet",
        q=query,
        type="video",
        maxResults=max_results,
        order="relevance",
        relevanceLanguage="zh-Hans",
    )
    response = request.execute()
    
    videos = []
    for item in response["items"]:
        videos.append({
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "channel": item["snippet"]["channelTitle"],
            "published_at": item["snippet"]["publishedAt"],
            "url": f"https://youtube.com/watch?v={item['id']['videoId']}",
        })
    
    return videos

def get_video_captions(video_id: str, language: str = "zh-Hans") -> str:
    """获取视频字幕（需要 OAuth 或使用 yt-dlp 绕过）"""
    # YouTube API 字幕访问需要 OAuth，推荐用 yt-dlp 替代
    import subprocess
    result = subprocess.run(
        ["yt-dlp", "--write-auto-sub", "--sub-lang", language,
         "--skip-download", "--output", "/tmp/%(id)s.%(ext)s",
         f"https://youtube.com/watch?v={video_id}"],
        capture_output=True, text=True
    )
    
    # 读取生成的字幕文件
    import glob
    subtitle_files = glob.glob(f"/tmp/{video_id}*.vtt")
    if subtitle_files:
        with open(subtitle_files[0]) as f:
            return f.read()
    return ""

# 采集 AI 知识库相关视频
videos = search_videos("知识库工程 RAG", max_results=50)
print(f"找到 {len(videos)} 个视频")

# 下一步：用 yt-dlp 下载音频 → SenseVoice/Whisper 转写（见第22章）
```

---

<a id="_22-音视频多模态采集"></a>

## 21.5 音视频多模态采集

### 音视频采集工具矩阵

| 工具 | Stars | 定位 | 支持格式 | 特点 |
|------|-------|------|---------|------|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 94k+ | 全平台视频下载 | 视频/音频/字幕/元数据 | 支持1000+网站，持续维护 |
| [SenseVoice](https://github.com/FunAudioLLM/SenseVoice) | 10k+ | 语音识别+情绪分析 | WAV/MP3/MP4 | 中文效果最佳，多语言，情绪检测 |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 18k+ | OpenAI Whisper 加速版 | 所有音频 | 速度快4倍，低显存 |
| [WhisperX](https://github.com/m-bain/whisperX) | 14k+ | 带说话人分离的 Whisper | 所有音频 | 自动说话人分离（diarization） |
| [VideoLingo](https://github.com/Huanshere/VideoLingo) | 12k+ | 视频字幕全流程 | 视频 | 下载+转写+翻译+嵌入字幕一条龙 |

### 完整音视频采集管道

```python
# pip install yt-dlp faster-whisper funasr modelscope
import subprocess
import os
from pathlib import Path

def download_audio(url: str, output_dir: str = "./audio") -> str:
    """从任意平台下载音频"""
    os.makedirs(output_dir, exist_ok=True)
    
    result = subprocess.run([
        "yt-dlp",
        "-x",                              # 仅提取音频
        "--audio-format", "mp3",
        "--audio-quality", "0",            # 最佳质量
        "--write-info-json",               # 保存元数据
        "--write-auto-sub",                # 自动字幕（如有）
        "--sub-lang", "zh-Hans,en",
        "--output", f"{output_dir}/%(id)s.%(ext)s",
        url,
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        raise RuntimeError(f"下载失败: {result.stderr}")
    
    # 返回 mp3 文件路径
    mp3_files = list(Path(output_dir).glob("*.mp3"))
    return str(mp3_files[-1]) if mp3_files else None

def transcribe_with_sensevoice(audio_path: str) -> dict:
    """使用 SenseVoice 转写（中文最佳）"""
    from funasr import AutoModel
    from funasr.utils.postprocess_utils import rich_transcription_postprocess
    
    model = AutoModel(
        model="iic/SenseVoiceSmall",
        trust_remote_code=True,
        vad_model="fsmn-vad",
        vad_kwargs={"max_single_segment_time": 30000},
        device="cuda" if os.path.exists("/dev/nvidia0") else "cpu",
    )
    
    result = model.generate(
        input=audio_path,
        cache={},
        language="auto",               # 自动检测语言
        use_itn=True,                  # 逆文本归一化（数字/标点）
        batch_size_s=60,
        merge_vad=True,
    )
    
    text = rich_transcription_postprocess(result[0]["text"])
    
    return {
        "text": text,
        "language": result[0].get("language", "unknown"),
        "audio_path": audio_path,
        "char_count": len(text),
    }

def transcribe_with_whisperx(audio_path: str) -> dict:
    """使用 WhisperX 转写（带说话人分离）"""
    import whisperx
    
    device = "cuda" if os.path.exists("/dev/nvidia0") else "cpu"
    
    # 转写
    model = whisperx.load_model("large-v3", device, compute_type="float16")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16)
    
    # 对齐时间戳
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device=device
    )
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device
    )
    
    # 说话人分离（需要 HuggingFace token）
    diarize_model = whisperx.DiarizationPipeline(
        use_auth_token=os.environ.get("HF_TOKEN"), device=device
    )
    diarize_segments = diarize_model(audio)
    result = whisperx.assign_word_speakers(diarize_segments, result)
    
    # 格式化输出（每段带说话人标签）
    segments_text = []
    for seg in result["segments"]:
        speaker = seg.get("speaker", "UNKNOWN")
        text = seg["text"].strip()
        start = seg["start"]
        segments_text.append(f"[{speaker} {start:.1f}s] {text}")
    
    return {
        "text": "\n".join(segments_text),
        "segments": result["segments"],
        "language": result["language"],
        "has_diarization": True,
    }

# 完整管道：URL → 音频 → 文字
def video_to_text(url: str, model: str = "sensevoice") -> str:
    """一行代码：视频/播客 → 可入库文本"""
    print(f"📥 下载音频: {url}")
    audio_path = download_audio(url)
    
    print(f"🎙️ 转写中 (模型: {model})...")
    if model == "sensevoice":
        result = transcribe_with_sensevoice(audio_path)
    else:
        result = transcribe_with_whisperx(audio_path)
    
    print(f"✅ 转写完成: {result['char_count']} 字符")
    return result["text"]

# 使用示例
text = video_to_text("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
```

:::tip 中英混合内容的最佳策略
- **纯中文** → SenseVoice Small（速度最快，效果最好）
- **英文/多语言** → faster-whisper large-v3（最准）
- **多人对话/采访** → WhisperX（说话人分离）
- **有字幕的视频** → yt-dlp 直接提取字幕（跳过 ASR，更准更快）
:::

---

<a id="_23-图像与文档采集"></a>

## 21.6 图像与文档采集

### 文档解析工具矩阵

| 工具 | Stars | 定位 | 支持格式 | 精度 | 推荐场景 |
|------|-------|------|---------|------|---------|
| [MinerU](https://github.com/opendatalab/MinerU) | 30k+ | 学术级 PDF 解析 | PDF/图片 | ⭐⭐⭐⭐⭐ | 论文、扫描件、含公式 |
| [Docling](https://github.com/DS4SD/docling) | 25k+ | 企业文档解析 | PDF/DOCX/PPTX/HTML | ⭐⭐⭐⭐⭐ | Office 文档套件 |
| [markitdown](https://github.com/microsoft/markitdown) | 50k+ | 通用转 Markdown | PDF/Office/图片/音频 | ⭐⭐⭐⭐ | 快速转换，格式最广 |
| [ColPali](https://github.com/illuin-tech/colpali) | 3k+ | 视觉向量化 PDF | PDF | ⭐⭐⭐⭐⭐ | 图文混合检索，不需 OCR |
| [Surya](https://github.com/VikParuchuri/surya) | 15k+ | 多语言 OCR | 图片/PDF | ⭐⭐⭐⭐ | 90+ 语言，精度高 |
| [marker](https://github.com/VikParuchuri/marker) | 21k+ | PDF→Markdown | PDF | ⭐⭐⭐⭐ | 快速 Markdown 转换 |

### MinerU — 高精度 PDF 解析

```python
# pip install magic-pdf[full] --extra-index-url https://wheels.myhloli.com
# 首次运行: python -c "from magic_pdf.config.make_content_config import DropMode; print('OK')"

from magic_pdf.data.data_reader_writer import FileBasedDataWriter
from magic_pdf.pipe.UNIPipe import UNIPipe
from magic_pdf.rw import AbsReaderWriter
import json

def parse_pdf_with_mineru(pdf_path: str, output_dir: str = "./mineru_output") -> dict:
    """使用 MinerU 解析 PDF，提取文本、表格、图片"""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # 读取 PDF
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    
    # 创建管道
    pipe = UNIPipe(
        pdf_bytes,
        {"_pdf_type": "", "model_list": []},
        image_writer=FileBasedDataWriter(output_dir),
        is_debug=False,
    )
    
    # 解析
    pipe.pipe_classify()   # 分类（学术/书籍/普通）
    pipe.pipe_analyze()    # 分析布局
    pipe.pipe_parse()      # 解析内容
    
    # 获取 Markdown
    md_content = pipe.pipe_mk_markdown(output_dir, drop_mode="none")
    
    # 获取结构化数据（含表格/图片引用）
    content_list = pipe.pipe_mk_uni_format(output_dir, drop_mode="none")
    
    return {
        "markdown": md_content,
        "content_list": content_list,
        "output_dir": output_dir,
        "pdf_path": pdf_path,
    }

# 批量处理
import glob

def batch_parse_pdfs(pdf_dir: str, output_dir: str) -> list[dict]:
    """批量解析目录下所有 PDF"""
    pdf_files = glob.glob(f"{pdf_dir}/**/*.pdf", recursive=True)
    results = []
    
    for pdf_path in pdf_files:
        print(f"📄 处理: {pdf_path}")
        try:
            result = parse_pdf_with_mineru(pdf_path, output_dir)
            results.append(result)
            print(f"  ✅ {len(result['markdown'])} 字符")
        except Exception as e:
            print(f"  ❌ 失败: {e}")
    
    return results
```

### markitdown — 通用格式转换（最广泛）

```python
# pip install markitdown[all]
from markitdown import MarkItDown
import os

md = MarkItDown(
    llm_client=None,    # 可选：传入 OpenAI client 处理图片
    llm_model=None,
)

def convert_to_markdown(file_path: str) -> str:
    """支持 PDF/DOCX/PPTX/XLSX/HTML/图片/音频"""
    result = md.convert(file_path)
    return result.text_content

# 支持的格式示例
formats = {
    "PDF":    "document.pdf",
    "Word":   "report.docx",
    "PPT":    "slides.pptx",
    "Excel":  "data.xlsx",
    "图片":   "screenshot.png",   # OCR 提取
    "音频":   "meeting.mp3",      # 调用 Whisper 转写
    "网页":   "https://example.com",
    "YouTube": "https://youtube.com/watch?v=xxx",
}

for name, path in formats.items():
    if os.path.exists(path) or path.startswith("http"):
        text = convert_to_markdown(path)
        print(f"✅ {name}: {len(text)} 字符")
```

---

<a id="_24-采集范式选型决策树"></a>

## 21.7 采集范式选型决策树

```
你的采集任务是？
│
├── 📄 文档类（PDF/Word/PPT）
│   ├── 含公式/表格/扫描件 → MinerU
│   ├── Office 套件混合 → Docling
│   └── 快速转换 → markitdown
│
├── 🌐 网页类
│   ├── 结构稳定/大量页面 → Crawl4AI / Scrapy
│   ├── 动态页面/SPA → Playwright
│   ├── 复杂交互/登录态 → browser-use / Stagehand
│   └── 直接要 Markdown → Firecrawl / Jina Reader API
│
├── 📱 社交媒体类
│   ├── 多平台搜索 → agent-reach
│   ├── TikTok/抖音/小红书大量数据 → TikHub API
│   └── Twitter/X → agent-reach twitter 模式
│
├── 🎬 音视频类
│   ├── 下载 → yt-dlp（1000+ 平台）
│   ├── 中文转写 → SenseVoice
│   ├── 英文/多语言转写 → faster-whisper
│   ├── 多人对话 → WhisperX（+说话人分离）
│   └── 全流程一键 → VideoLingo
│
├── 📊 结构化数据类
│   ├── 公开平台数据 → 官方 API（YouTube/GitHub/Twitter）
│   ├── 商业数据平台 → Apify Actor 市场
│   └── 企业内部数据 → 数据库直连 / ETL 工具
│
└── 🤔 不确定
    └── 先用 Jina Reader 试抓，评估内容质量后再选范式
```

---

<a id="_25-数据质量保障与合规"></a>

## 21.8 数据质量保障与合规

### 采集后的数据清洗管道

```python verify=syntax
import re
from typing import Optional

def clean_text(text: str, min_chars: int = 100) -> Optional[str]:
    """通用文本清洗，适用于所有来源"""
    if not text or len(text) < min_chars:
        return None
    
    # 去除 HTML 标签
    text = re.sub(r'<[^>]+>', '', text)
    
    # 去除多余空白
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 去除控制字符
    text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', text)
    
    # 检测并过滤广告/导航文本（启发式规则）
    noise_patterns = [
        r'^(cookie|隐私政策|版权所有|All rights reserved)',
        r'^(点击|关注|转发|收藏|点赞)',
        r'^\d+$',  # 纯数字
    ]
    for pattern in noise_patterns:
        if re.search(pattern, text[:50], re.IGNORECASE):
            return None
    
    return text if len(text) >= min_chars else None

def deduplicate_texts(texts: list[str], threshold: float = 0.85) -> list[str]:
    """基于 MinHash 的近似去重"""
    from datasketch import MinHash, MinHashLSH
    
    lsh = MinHashLSH(threshold=threshold, num_perm=128)
    unique_texts = []
    
    for i, text in enumerate(texts):
        m = MinHash(num_perm=128)
        for word in text.split():
            m.update(word.encode('utf-8'))
        
        if not lsh.query(m):
            lsh.insert(str(i), m)
            unique_texts.append(text)
    
    return unique_texts

# 合规检查清单
COMPLIANCE_CHECKLIST = """
采集合规自检：
✅ robots.txt 已检查，遵守爬取限制
✅ 请求频率 ≤ 1次/秒（避免DDoS）
✅ 不采集个人敏感信息（姓名/手机/身份证）
✅ 商业用途已确认目标网站服务条款
✅ 优先使用官方 API 替代爬虫
✅ 数据保存在安全位置，不公开分发
"""
```

:::danger 合规红线（不可逾越）
1. **不爬取个人隐私数据**：手机号、身份证、位置信息
2. **遵守 robots.txt**：`Disallow` 的路径不采集
3. **商业用途需授权**：未授权数据用于商业产品可能侵权
4. **不绕过付费墙**：版权内容需获得授权
:::

---

## 本章小结

| 场景 | 推荐范式 | 核心工具 | 关键指标 |
|------|---------|---------|---------|
| 大规模网页采集 | 传统爬虫 | Crawl4AI | 吞吐量 1000+页/小时 |
| 复杂平台交互 | Agent 驱动 | browser-use | 适应性强，成本高 |
| 社交媒体数据 | API 聚合 | TikHub + agent-reach | 合规，有限速 |
| 音频/播客转写 | 音视频专项 | yt-dlp + SenseVoice | 中文 WER < 5% |
| PDF/文档解析 | 文档专项 | MinerU / Docling | 表格/公式完整度 |
| 批量文档转换 | 文档专项 | markitdown | 格式覆盖最广 |

> **下一步**：采集完成的数据进入 [第三章：10种场景 SOP](/knowledge/03-scene-sops) 进行深度处理，或直接进入 [第四章：全链路五阶段架构](/knowledge/04-architecture) 构建知识库。

---

<a id="_26-反直觉洞察-2026-数据采集的范式转移"></a>

## 21.9 反直觉洞察：2026 数据采集的范式转移

> **这一节是本章最重要的内容。** 上面所有工具的使用只是战术，这里讨论战略级的认知颠覆——即你在实践中最容易犯的系统性错误。

### 洞察一：爬虫正在被"语义查询语言"淘汰

**直觉**：爬虫 = 用 CSS/XPath 选择器精确定位元素，越精确越好。

**反直觉**：精确的选择器是脆弱的。页面改版一次，所有选择器全部失效，维护成本无穷无尽。

**真相**：[AgentQL](https://github.com/tinyfish-io/agentql)（1.4k★，2026年最快增长工具之一）彻底改变了这个游戏——用**自然语言语义查询**代替选择器：

```python
# pip install agentql playwright
import agentql
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=False)
    page = agentql.wrap(browser.new_page())   # 用 AgentQL 包装普通 Playwright page
    
    page.goto("https://news.ycombinator.com")
    
    # ❌ 传统方式：fragile CSS 选择器
    # items = page.query_selector_all(".athing .title a")
    
    # ✅ AgentQL：语义查询，页面改版不受影响
    QUERY = """
    {
        news_items[] {
            title
            url
            score
            author
            time_posted
        }
    }
    """
    
    response = page.query_data(QUERY)
    # response.news_items 是结构化列表，无论页面 HTML 结构怎么变
    
    for item in response.news_items[:5]:
        print(f"[{item.score}] {item.title}")
        print(f"  → {item.url}")

# 更强大：跨页面语义一致性（不同网站，同一查询）
UNIVERSAL_ARTICLE_QUERY = """
{
    article {
        headline
        author
        publish_date
        body_text
        tags[]
    }
}
"""
# 对 TechCrunch、The Verge、36kr 用同一查询，AgentQL 自动适配不同结构
```

:::tip 什么时候用 AgentQL，什么时候用传统选择器
- **用 AgentQL**：需要长期维护的爬虫、多站点统一提取、结构经常变动的页面
- **用传统选择器**：一次性抓取、明确知道 HTML 结构、对速度极限要求的高并发场景（AgentQL 每次查询有 LLM 调用开销）
:::

---

### 洞察二：最好的反反爬不是"更换 IP"，是"用真实浏览器内核"

**直觉**：被封就换 IP，轮换代理池，伪造 User-Agent。

**反直觉**：现代反爬（Cloudflare、DataDome、PerimeterX）已经能识别 TLS 指纹、Canvas 指纹、WebGL 渲染差异——IP 是最不重要的信号，**浏览器内核行为**才是关键。

**真相**：[Obscura](https://github.com/h4ckf0r0day/obscura)（Rust 实现，19.8k★）是2026年增长最快的 headless browser，专门为 AI agent 和反检测设计：

```python
# Obscura：Rust 构建的反检测 headless browser
# 特点：真实 Chromium 内核 + 随机化浏览器指纹 + 无法被自动化检测

# pip install obscura-python  (Python 绑定)
from obscura import ObscuraBrowser, BrowserConfig

config = BrowserConfig(
    headless=True,
    stealth=True,              # 自动随机化所有指纹
    fingerprint_rotation=True, # 每个会话不同指纹
    residential_proxy=None,    # 可选：住宅代理
)

async with ObscuraBrowser(config) as browser:
    page = await browser.new_page()
    
    # 检测测试：bot.sannysoft.com
    await page.goto("https://bot.sannysoft.com")
    screenshot = await page.screenshot()
    # 结果：所有检测项全绿（非机器人）
    
    # 正常使用
    await page.goto("https://www.linkedin.com/jobs/")
    content = await page.content()
    print(f"✅ 无需 Cookie，成功访问: {len(content)} 字节")

# 对比：普通 Playwright 的检测结果
# webdriver: true ← 被检测
# chrome: false ← 被检测
# permissions: false ← 被检测

# Obscura 结果：
# webdriver: false ✅
# chrome: true ✅
# permissions: true ✅
```

:::warning Obscura 的使用伦理边界
Obscura 的反检测能力极强，但这不意味着可以用于任意平台。判断原则：
1. **目标平台是否允许自动化访问**（检查 ToS）
2. **数据是否用于公益/研究目的**
3. **请求频率是否合理**（≤ 人类正常浏览速度）
不合规使用可能违反 CFAA/计算机相关法律。
:::

---

### 洞察三：合成数据正在替代大量爬取工作

**直觉**：想要高质量训练/知识库数据，必须大量爬取真实网页。

**反直觉**：对于结构化知识库场景，**用 LLM 合成数据的质量往往高于爬取数据**，因为：
- 爬取数据：噪声多、格式不一致、需要大量清洗
- 合成数据：结构完整、格式统一、按需定制

**真相**：Meta 的 [synthetic-data-kit](https://github.com/meta-llama/synthetic-data-kit)（1.6k★）代表了这个范式转移：

```python
# pip install synthetic-data-kit
# Meta 官方合成数据工具，支持 seed → QA pair / SFT data / preference data

from synthetic_data_kit import DataGenerator, Pipeline

# 方案一：从种子文档生成 QA 对（最常用）
generator = DataGenerator(
    model="meta-llama/Llama-3.3-70B-Instruct",
    api_key="your-api-key",
)

# 输入：一份技术文档
seed_doc = """
RAG (Retrieval Augmented Generation) 是一种将外部知识库
与 LLM 结合的技术架构。其核心流程是：用户提问 → 向量检索 
→ 召回相关文档 → LLM 综合生成答案。
"""

# 生成 QA 对（用于知识库或微调）
qa_pairs = generator.generate_qa(
    document=seed_doc,
    num_pairs=20,
    difficulty_distribution={"easy": 0.3, "medium": 0.5, "hard": 0.2},
    question_types=["factual", "reasoning", "application"],
)

for qa in qa_pairs[:3]:
    print(f"Q: {qa.question}")
    print(f"A: {qa.answer}")
    print(f"难度: {qa.difficulty}\n")

# 方案二：Magpie 范式——让 LLM 自我生成指令数据（更激进）
# https://github.com/magpie-align/magpie
from magpie import MagpiePipeline

pipeline = MagpiePipeline(
    model="Qwen/Qwen2.5-72B-Instruct",
    temperature=0.9,
)

# 让模型从空白开始"幻想"用户指令，无需任何种子数据
instructions = pipeline.generate(
    num_samples=1000,
    domain="knowledge_management",
    language="zh",
)

print(f"生成 {len(instructions)} 条指令数据，无需爬取任何数据")
```

**合成数据 vs 爬取数据的选择矩阵**：

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 知识库 QA 构建 | ✅ 合成数据 | 结构统一，可控难度分布 |
| 特定领域微调 | ✅ 合成数据 + 少量真实 | 合成覆盖边缘情况 |
| 事实性内容（新闻/价格）| ❌ 必须真实爬取 | LLM 会"幻想"过时数据 |
| 多模态内容（图片/视频）| ❌ 必须真实采集 | LLM 无法生成真实媒体 |
| 用户行为数据 | ❌ 必须真实采集 | 合成行为数据失真严重 |

---

### 洞察四：流式采集 > 批量采集（针对实时知识库）

**直觉**：周期性批量爬取（每天/每周跑一次），数据攒够了再入库。

**反直觉**：批量采集导致知识库"腐烂"（stale data），且峰值资源消耗极大。

**真相**：流式采集（Event-Driven Collection）更适合需要实时性的知识库：

```python
# 流式采集架构：用 RSS/Webhook/SSE 替代轮询爬虫
import asyncio
import feedparser
import aiohttp
from datetime import datetime

class StreamingCollector:
    """事件驱动的流式知识采集器"""
    
    def __init__(self, knowledge_base_client):
        self.kb = knowledge_base_client
        self.seen_ids = set()
    
    async def watch_rss_feeds(self, feeds: list[str], poll_interval: int = 300):
        """轮询 RSS（最简单的流式采集）"""
        while True:
            for feed_url in feeds:
                await self._process_feed(feed_url)
            await asyncio.sleep(poll_interval)
    
    async def _process_feed(self, feed_url: str):
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            entry_id = entry.get("id", entry.get("link", ""))
            if entry_id in self.seen_ids:
                continue
            
            self.seen_ids.add(entry_id)
            
            # 获取全文
            full_text = await self._fetch_full_text(entry.link)
            
            # 实时入库（不等批量）
            await self.kb.add_document({
                "title": entry.title,
                "url": entry.link,
                "text": full_text,
                "published": entry.get("published", datetime.now().isoformat()),
                "source": feed_url,
            })
            
            print(f"✅ 实时入库: {entry.title[:50]}")
    
    async def _fetch_full_text(self, url: str) -> str:
        """获取全文（使用 Jina Reader API，无需自己处理 JS 渲染）"""
        jina_url = f"https://r.jina.ai/{url}"
        async with aiohttp.ClientSession() as session:
            async with session.get(jina_url, headers={"Accept": "text/markdown"}) as resp:
                return await resp.text()
    
    async def watch_github_releases(self, repos: list[str]):
        """监控 GitHub 仓库发布（技术知识库场景）"""
        import aiohttp
        
        while True:
            for repo in repos:
                url = f"https://api.github.com/repos/{repo}/releases/latest"
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as resp:
                        release = await resp.json()
                
                release_id = release.get("id")
                if release_id and release_id not in self.seen_ids:
                    self.seen_ids.add(release_id)
                    
                    # 提取 Release Notes 入库
                    await self.kb.add_document({
                        "title": f"{repo} {release['tag_name']} Release Notes",
                        "text": release.get("body", ""),
                        "url": release["html_url"],
                        "type": "release_notes",
                    })
                    
                    print(f"🆕 新版本: {repo} {release['tag_name']}")
            
            await asyncio.sleep(3600)  # 每小时检查一次

# 使用示例
async def main():
    from your_kb import KnowledgeBaseClient
    
    kb = KnowledgeBaseClient()
    collector = StreamingCollector(kb)
    
    # 并行运行多个流式采集器
    await asyncio.gather(
        collector.watch_rss_feeds([
            "https://openai.com/blog/rss",
            "https://anthropic.com/blog/rss",
            "https://bair.berkeley.edu/blog/feed.xml",
        ]),
        collector.watch_github_releases([
            "langchain-ai/langgraph",
            "qdrant/qdrant",
            "unclecode/crawl4ai",
        ]),
    )

asyncio.run(main())
```

---

### 洞察五：数据质量 > 数据量（量化评估框架）

**直觉**：爬得越多越好，知识库越大越强。

**反直觉**：知识库质量与数量非线性相关。当数量超过"有效信息密度阈值"后，继续增加低质量数据会**降低检索精度**（噪声稀释了高质量内容的向量空间密度）。

**真实数据**：Stanford BEIR Benchmark 显示，在 passage retrieval 上，清洗到 30% 体量的高质量数据集 > 原始 100% 数据集，提升 NDCG@10 约 8-12%。

```python
# 采集后数据质量自动评估管道
from dataclasses import dataclass
from typing import Optional
import re
import hashlib

@dataclass
class QualityScore:
    total: float          # 0-100
    length_score: float
    density_score: float
    dedup_score: float
    language_score: float
    passed: bool          # True if total >= threshold

class DataQualityFilter:
    """
    采集数据的自动质量门控
    灵感来源：RedPajama、FineWeb 等大规模数据清洗项目
    """
    
    MIN_CHARS = 200          # 最短有效长度
    MAX_CHARS = 50000        # 最长有效长度（超长可能是噪声）
    MIN_ALPHA_RATIO = 0.6    # 最低字母比例（过滤纯符号内容）
    PASS_THRESHOLD = 60.0    # 总分 >= 60 才入库
    
    def __init__(self):
        self._seen_hashes: set = set()
    
    def score(self, text: str) -> QualityScore:
        """对单条文本打质量分"""
        
        # 1. 长度分（20分）
        n = len(text)
        if n < self.MIN_CHARS:
            length_score = 0
        elif n > self.MAX_CHARS:
            length_score = 10  # 过长扣分
        else:
            length_score = min(20, n / 500)  # 500字以上满分
        
        # 2. 信息密度分（30分）：去重词汇比 / 停用词比
        words = text.split()
        unique_ratio = len(set(words)) / max(len(words), 1)
        density_score = unique_ratio * 30
        
        # 3. 去重分（20分）：SimHash 近似去重
        content_hash = hashlib.md5(text[:500].encode()).hexdigest()
        if content_hash in self._seen_hashes:
            dedup_score = 0  # 重复内容直接 0 分
        else:
            self._seen_hashes.add(content_hash)
            dedup_score = 20
        
        # 4. 语言质量分（30分）：字母/数字比、无乱码
        alpha_chars = sum(1 for c in text if c.isalpha() or '\u4e00' <= c <= '\u9fff')
        alpha_ratio = alpha_chars / max(len(text), 1)
        
        # 惩罚过多重复符号（如 "---..." 类噪声）
        repeat_penalty = len(re.findall(r'(.)\1{5,}', text)) * 5
        
        language_score = max(0, alpha_ratio * 30 - repeat_penalty)
        
        total = length_score + density_score + dedup_score + language_score
        
        return QualityScore(
            total=round(total, 1),
            length_score=length_score,
            density_score=density_score,
            dedup_score=dedup_score,
            language_score=language_score,
            passed=total >= self.PASS_THRESHOLD,
        )
    
    def filter_batch(
        self,
        documents: list[dict],
        text_key: str = "text",
        verbose: bool = True,
    ) -> tuple[list[dict], dict]:
        """
        批量过滤，返回（通过的文档列表，统计信息）
        """
        passed, failed = [], []
        
        for doc in documents:
            text = doc.get(text_key, "")
            score = self.score(text)
            doc["_quality_score"] = score.total
            
            if score.passed:
                passed.append(doc)
            else:
                failed.append(doc)
        
        stats = {
            "total": len(documents),
            "passed": len(passed),
            "failed": len(failed),
            "pass_rate": f"{len(passed)/max(len(documents),1):.1%}",
            "avg_score": sum(d["_quality_score"] for d in documents) / max(len(documents), 1),
        }
        
        if verbose:
            print(f"📊 质量过滤: {stats['passed']}/{stats['total']} 通过 ({stats['pass_rate']})")
            print(f"   平均分: {stats['avg_score']:.1f}/100")
        
        return passed, stats

# 使用示例：采集 → 质量门控 → 入库
filter = DataQualityFilter()

raw_docs = crawl_batch(urls)           # 批量采集
clean_docs, stats = filter.filter_batch(raw_docs)  # 质量过滤

# 只有质量达标的文档才入向量库
for doc in clean_docs:
    vector_db.upsert(doc)

print(f"✅ 最终入库: {len(clean_docs)} 条（节省 {stats['failed']} 条低质量数据污染）")
```

---

### 洞察六：错误处理 = 采集系统的真正护城河

**直觉**：把采集逻辑写对就行了，错误偶尔发生处理一下。

**反直觉**：生产级采集系统中，**错误处理代码占比通常超过 60%**。任何没有 retry、circuit breaker、幂等性设计的采集系统都不是生产级的。

```python
import asyncio
import time
from enum import Enum
from functools import wraps
from typing import Callable, TypeVar, Any

T = TypeVar("T")

class CircuitState(Enum):
    CLOSED = "closed"        # 正常工作
    OPEN = "open"            # 熔断，拒绝请求
    HALF_OPEN = "half_open"  # 试探性恢复

class CircuitBreaker:
    """熔断器：防止对失败端点的无效重试"""
    
    def __init__(
        self,
        failure_threshold: int = 5,     # 连续失败 N 次后熔断
        recovery_timeout: int = 60,     # 熔断后 N 秒尝试恢复
        half_open_max_calls: int = 3,   # 半开状态最多试探 N 次
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.half_open_calls = 0
    
    def call(self, func: Callable, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise RuntimeError(f"熔断器开启，跳过请求 (恢复在 {self.recovery_timeout - (time.time()-self.last_failure_time):.0f}s 后)")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            print(f"🔴 熔断器开启！连续失败 {self.failure_count} 次")

def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,),
):
    """指数退避重试装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        break
                    
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    # 加入随机抖动，避免惊群效应
                    jitter = delay * 0.1 * (2 * __import__("random").random() - 1)
                    actual_delay = delay + jitter
                    
                    print(f"⚠️ 第 {attempt+1} 次失败: {e}，{actual_delay:.1f}s 后重试")
                    await asyncio.sleep(actual_delay)
            
            raise last_exception
        return wrapper
    return decorator

# 组合使用：完整的生产级采集函数
breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=120)

@retry_with_backoff(max_retries=3, base_delay=2.0, exceptions=(aiohttp.ClientError, TimeoutError))
async def robust_fetch(url: str, timeout: int = 30) -> str:
    """生产级 HTTP 采集：带熔断器 + 指数退避重试"""
    return breaker.call(_fetch_url, url, timeout)

async def _fetch_url(url: str, timeout: int) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
            resp.raise_for_status()
            return await resp.text()
```

## 来源与复核

- **复核状态**：待复核。任何易漂移的版本、价格、法律或性能结论，采用前都必须回到一手来源再次确认。
- **代码状态**：示意代码。未被本地 smoke test 覆盖的片段不得解释为生产可运行。
- **证据边界**：本页成熟度只描述内容形态，不代表部署、上线或生产验收已经完成。
- **下一验收动作**：按仓库根目录 `content-audit.md` 中本模块的证据缺口补齐来源、fixture 与验收回执。
