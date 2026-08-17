<script setup>
import { withBase } from 'vitepress'
import {
  PhArrowRight,
  PhBookOpen,
  PhCheckCircle,
  PhCode,
  PhFlask,
  PhLockKey,
  PhMagnifyingGlass,
  PhPlay,
  PhWarning
} from '@phosphor-icons/vue'
import EvidenceCatalog from './EvidenceCatalog.vue'
import { pipelineStages, replayPresentation, replayResult } from '../../../reference-lab-fixture.mjs'

function openSearch() {
  const trigger = document.querySelector('.VPNavBarSearch button, .DocSearch-Button')
  if (trigger instanceof HTMLElement) trigger.click()
}
</script>

<template>
  <main class="mkd-product-home evidence-home">
    <section class="mkd-product-hero" aria-labelledby="mkd-product-title">
      <div class="mkd-product-hero-copy">
        <p class="mkd-overline">MKD · Knowledge to Agent</p>
        <h1 id="mkd-product-title">把资料编译成<br><em>可审查的行动</em></h1>
        <p class="mkd-product-deck">
          一套从来源、证据、决策到 E2 Agent 的开放参考架构。每个建议都能回到对象、定位、版本与停止条件。
        </p>
        <div class="mkd-hero-actions">
          <a class="mkd-button mkd-button-primary" :href="withBase('/lab/')">
            <PhPlay :size="17" weight="fill" aria-hidden="true" />
            运行 Amazon Ads Replay
          </a>
          <a class="mkd-button mkd-button-secondary" :href="withBase('/knowledge/00-introduction')">
            <PhBookOpen :size="17" aria-hidden="true" />
            系统阅读 Guide
          </a>
        </div>
        <ul class="mkd-hero-boundaries" aria-label="当前产品边界">
          <li><PhCheckCircle :size="15" weight="fill" aria-hidden="true" /> 固定 Replay</li>
          <li><PhLockKey :size="15" aria-hidden="true" /> 外部写入为 0</li>
          <li><PhWarning :size="15" aria-hidden="true" /> LO-S 合成数据</li>
        </ul>
      </div>

      <aside class="mkd-hero-brief" aria-label="行动包预览">
        <div class="mkd-brief-header">
          <span>DECISION ACTION PACKAGE</span>
          <code>RUN-AMZ-M1B-001</code>
        </div>
        <p class="mkd-brief-kicker">Amazon Ads · ACOS 异常</p>
        <h2>{{ replayPresentation.headline }}</h2>
        <p>{{ replayResult.summary }}</p>
        <dl class="mkd-brief-grid">
          <div><dt>事实</dt><dd>2</dd></div>
          <div><dt>推断</dt><dd>1</dd></div>
          <div><dt>未知</dt><dd>2</dd></div>
          <div><dt>副作用</dt><dd>0</dd></div>
        </dl>
        <a :href="withBase('/lab/runs/amazon-ads-replay-001')">
          查看完整行动包 <PhArrowRight :size="15" aria-hidden="true" />
        </a>
      </aside>
    </section>

    <section class="mkd-evidence-spine" aria-labelledby="spine-title">
      <header>
        <p class="mkd-overline">THE EVIDENCE SPINE</p>
        <h2 id="spine-title">七个阶段，一条不能跳过的证据链</h2>
      </header>
      <ol>
        <li v-for="stage in pipelineStages" :key="stage.id">
          <span>{{ stage.number }}</span>
          <strong>{{ stage.label }}</strong>
          <small>{{ stage.detail }}</small>
        </li>
      </ol>
    </section>

    <section class="mkd-product-split" aria-label="产品成熟度与受众入口">
      <article>
        <p class="mkd-overline">TWO LEDGERS</p>
        <h2>内容成熟，不代表 Agent 已运行。</h2>
        <div class="mkd-ledger-row">
          <PhBookOpen :size="21" aria-hidden="true" />
          <div><strong>Guide</strong><span>26 页 · 文档身份、Claim、概念与 QA</span></div>
          <code>L1</code>
        </div>
        <div class="mkd-ledger-row">
          <PhFlask :size="21" aria-hidden="true" />
          <div><strong>Reference</strong><span>6 格式编译 + SQLite + E2 Agent + 20 条门禁</span></div>
          <code>M1-B</code>
        </div>
      </article>
      <article>
        <p class="mkd-overline">TWO READING DEPTHS</p>
        <h2>先做判断，再展开工程证据。</h2>
        <a :href="withBase('/lab/runs/amazon-ads-replay-001')">
          <span>产品与知识负责人</span>
          <strong>读行动包、未知项与批准条件</strong>
          <PhArrowRight :size="17" aria-hidden="true" />
        </a>
        <a :href="withBase('/reference/build')">
          <span>工程师与架构师</span>
          <strong>查 Schema、Trace、Eval 与 hash</strong>
          <PhCode :size="17" aria-hidden="true" />
        </a>
      </article>
    </section>

    <section class="evidence-summary mkd-guide-summary" aria-label="Guide 学习成熟度与推荐入口">
      <div class="summary-maturity">
        <p class="section-label">Guide · 从概念到验收</p>
        <ol class="maturity-summary">
          <li><span>01</span><div><strong>原理</strong><small>定义问题、术语与边界</small></div></li>
          <li><span>02</span><div><strong>方案</strong><small>给出输入、输出与取舍</small></div></li>
          <li><span>03</span><div><strong>可运行</strong><small>fixture 与 smoke 回执齐全</small></div></li>
          <li><span>04</span><div><strong>可验收</strong><small>阈值、负例与门禁齐全</small></div></li>
        </ol>
      </div>

      <nav class="recommended-summary recommended-block" aria-label="Guide 推荐入口">
        <p class="section-label">推荐入口</p>
        <a :href="withBase('/knowledge/00-introduction')">
          <span>先建立边界</span><strong>从导论开始</strong><PhArrowRight :size="16" aria-hidden="true" />
        </a>
        <a :href="withBase('/knowledge/04-architecture')">
          <span>再连接接口</span><strong>看全链路架构</strong><PhArrowRight :size="16" aria-hidden="true" />
        </a>
        <a :href="withBase('/knowledge/appendix-validation')">
          <span>最后定义回执</span><strong>使用验证框架</strong><PhArrowRight :size="16" aria-hidden="true" />
        </a>
      </nav>
    </section>

    <section class="mkd-guide-section" aria-labelledby="guide-catalog-heading">
      <header>
        <div>
          <p class="mkd-overline">THE GUIDE</p>
          <h2 id="guide-catalog-heading">26 个知识模块，作为方法与边界的参考层</h2>
        </div>
        <div class="mkd-guide-header-tools">
          <p>目录被保留，但不再承担首页的第一叙事。</p>
          <button class="mkd-guide-search" type="button" @click="openSearch">
            <PhMagnifyingGlass :size="16" aria-hidden="true" /> 搜索知识库
          </button>
        </div>
      </header>
      <EvidenceCatalog />
    </section>
  </main>
</template>
