import { createContentLoader } from 'vitepress'

export default createContentLoader('knowledge/*.md', {
  transform(pages) {
    return pages
      .map(({ url, frontmatter }) => ({
        url,
        docId: frontmatter.docId,
        title: frontmatter.title,
        description: frontmatter.description,
        displayNumber: frontmatter.displayNumber,
        route: frontmatter.route,
        learningOrder: frontmatter.learningOrder,
        chapter: frontmatter.chapter,
        order: frontmatter.order,
        section: frontmatter.section,
        stage: frontmatter.stage,
        maturity: frontmatter.maturity,
        verification: frontmatter.verification,
        codeStatus: frontmatter.codeStatus,
        reviewedAt: frontmatter.reviewedAt,
        testedWith: frontmatter.testedWith || [],
        evidence: frontmatter.evidence || []
      }))
      .sort((left, right) => left.learningOrder - right.learningOrder)
  }
})
