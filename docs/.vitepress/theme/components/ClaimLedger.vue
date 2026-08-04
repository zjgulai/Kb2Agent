<script setup>
import { computed } from 'vue'
import { data as registry } from '../../../claims.data.mjs'

const props = defineProps({
  documentId: {
    type: String,
    required: true
  }
})

const verificationLabels = {
  pending: '待验证',
  blocked: '受阻',
  'source-reviewed': '来源复核',
  'synthetic-supported': '合成证据',
  'fixture-verified': 'Fixture 验证',
  'production-observed': '生产只读观察',
  'authorized-live': '授权在线执行'
}

const gradeLabels = {
  'L0-unverified': 'L0 · 未验证',
  'L1-public-or-runtime': 'L1 · 一手公开 / 只读观察',
  'LO-S-synthetic': 'LO-S · 合成证据',
  'L2-fixture-or-dry-run': 'L2 · Fixture / Dry-run',
  'L3-production-read-only': 'L3 · 生产只读',
  'L4-authorized-live': 'L4 · 授权在线'
}

const typeLabels = {
  'external-fact': '外部事实',
  'legal-context': '法律语境',
  'normative-control': '控制要求',
  calculation: '计算结果',
  'interface-contract': '接口契约',
  'current-state': '当前状态',
  methodology: '方法契约'
}

const ownershipLabels = {
  contentOwner: '内容维护',
  evidenceReviewer: '证据复核',
  testOwner: '测试维护',
  finalApprover: '最终批准'
}

const assignmentLabels = {
  'role-mapped': '角色已映射 · 待具名认领',
  assigned: '已指定 · 待接受',
  accepted: '已接受责任'
}

const claims = computed(() => registry.claims.filter((claim) => claim.documentId === props.documentId))

function sourceFor(sourceId) {
  return registry.sources[sourceId]
}

function evidenceFor(evidenceId) {
  return registry.evidence[evidenceId]
}

function ownershipFor(claim) {
  return Object.entries(claim.ownership).map(([field, roleId]) => ({
    field,
    role: registry.ownerRoles[roleId]
  }))
}

function acceptedOwnerCount(claim) {
  return ownershipFor(claim).filter(({ role }) => role?.assignmentState === 'accepted').length
}
</script>

<template>
  <section class="claim-ledger" :aria-label="`关键断言与证据：${documentId}`">
    <header class="claim-ledger-intro">
      <p><strong>{{ claims.length }} 条试点断言</strong> · 页面状态与断言证据分开计算</p>
      <p>L0/L1/L2 只说明登记范围；不自动代表法律合规、生产可用或整章验收。</p>
    </header>

    <article v-for="claim in claims" :key="claim.claimId" class="claim-card">
      <div class="claim-card-heading">
        <a class="claim-id" :href="`#${claim.anchor}`">{{ claim.claimId }}</a>
        <span class="claim-status" :data-status="claim.verification">
          {{ verificationLabels[claim.verification] }}
        </span>
      </div>

      <p class="claim-statement">{{ claim.statement }}</p>

      <dl class="claim-metadata">
        <div>
          <dt>证据等级</dt>
          <dd>{{ gradeLabels[claim.evidenceGrade] }}</dd>
        </div>
        <div>
          <dt>类型 / 风险</dt>
          <dd>{{ typeLabels[claim.claimType] }} · {{ claim.risk === 'critical' ? '关键' : '高' }}</dd>
        </div>
        <div>
          <dt>截至日期</dt>
          <dd>{{ claim.asOf || '不适用' }}</dd>
        </div>
        <div>
          <dt>责任链</dt>
          <dd :class="{ 'is-gap': acceptedOwnerCount(claim) < 4 }">
            4/4 角色已映射 · {{ acceptedOwnerCount(claim) }}/4 已接受
          </dd>
        </div>
      </dl>

      <details class="claim-details">
        <summary>查看适用范围、限制与证据</summary>
        <dl>
          <div>
            <dt>适用范围</dt>
            <dd>{{ claim.applicability }}</dd>
          </div>
          <div>
            <dt>限制</dt>
            <dd>{{ claim.limitations }}</dd>
          </div>
          <div>
            <dt>下一动作</dt>
            <dd>{{ claim.nextAction }}</dd>
          </div>
        </dl>

        <div class="claim-ownership">
          <strong>责任链（角色映射）</strong>
          <ul>
            <li v-for="item in ownershipFor(claim)" :key="item.field">
              <span><b>{{ ownershipLabels[item.field] }}</b>{{ item.role.label }}</span>
              <small :data-owner-state="item.role.assignmentState">
                {{ assignmentLabels[item.role.assignmentState] }}
              </small>
            </li>
          </ul>
          <p>角色映射只解决职责归属；具名责任人接受并留下回执前，不能据此宣称已审批。</p>
        </div>

        <div v-if="claim.sourceRefs.length" class="claim-references">
          <strong>来源</strong>
          <ul>
            <li v-for="sourceId in claim.sourceRefs" :key="sourceId">
              <a
                v-if="sourceFor(sourceId).url"
                :href="sourceFor(sourceId).url"
                target="_blank"
                rel="noreferrer"
              >{{ sourceFor(sourceId).title }}</a>
              <span v-else>{{ sourceFor(sourceId).title }} · <code>{{ sourceFor(sourceId).path }}</code></span>
              <small>复核于 {{ sourceFor(sourceId).reviewedAt }}</small>
            </li>
          </ul>
        </div>

        <div v-if="claim.evidenceRefs.length" class="claim-references">
          <strong>本地证据</strong>
          <ul>
            <li v-for="evidenceId in claim.evidenceRefs" :key="evidenceId">
              <span>{{ evidenceFor(evidenceId).title }} · <code>{{ evidenceFor(evidenceId).path }}</code></span>
              <small>{{ gradeLabels[evidenceFor(evidenceId).grade] }}</small>
            </li>
          </ul>
        </div>

        <p v-if="!claim.sourceRefs.length && !claim.evidenceRefs.length" class="claim-empty-evidence">
          尚无可登记证据；保持 L0，不允许据此升级内容成熟度。
        </p>
      </details>
    </article>
  </section>
</template>
