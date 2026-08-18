import postcss, {
  type AtRule,
  type Declaration,
  type Node,
  type Rule,
} from 'postcss'
import { describe, expect, it } from 'vitest'
import { GAME_STYLES } from './styles.ts'

function declarations(rule: Rule): Readonly<Record<string, string>> {
  return Object.fromEntries(
    rule.nodes
      .filter((node): node is Declaration => node.type === 'decl')
      .map((declaration) => [declaration.prop, declaration.value]),
  )
}

function mediaQuery(rule: Rule): string | null {
  let parent: Node['parent'] = rule.parent
  while (parent !== undefined) {
    if (parent.type === 'atrule' && (parent as AtRule).name === 'media') {
      return (parent as AtRule).params
    }
    parent = parent.parent
  }
  return null
}

function targetsLauncher(rule: Rule): boolean {
  return rule.selectors.some((selector) =>
    /(^|[^\w-])\.dwc-launcher(?![\w-])/.test(selector),
  )
}

describe('DSH launcher placement', () => {
  const root = postcss.parse(GAME_STYLES)
  const launcherRules: Rule[] = []
  root.walkRules((rule) => {
    if (targetsLauncher(rule)) launcherRules.push(rule)
  })

  it('keeps the launcher above the host composer controls', () => {
    const baseRules = launcherRules.filter(
      (rule) => rule.selector === '.dwc-launcher' && mediaQuery(rule) === null,
    )
    expect(baseRules).toHaveLength(1)
    expect(declarations(baseRules[0]!)).toMatchObject({
      bottom: 'auto',
      position: 'fixed',
      right: 'max(1.25rem, env(safe-area-inset-right))',
      top: 'max(5.25rem, calc(env(safe-area-inset-top) + 4.25rem))',
    })

    for (const rule of launcherRules) {
      const values = declarations(rule)
      if (values.bottom !== undefined) expect(values.bottom).toBe('auto')
      if (values.top !== undefined) expect(values.top).toContain('safe-area-inset-top')
    }
  })

  it('uses a compact launcher on narrow screens', () => {
    const mobileRules = launcherRules.filter(
      (rule) =>
        rule.selector === '.dwc-launcher' &&
        mediaQuery(rule) === '(max-width: 760px)',
    )
    expect(mobileRules).toHaveLength(1)
    expect(declarations(mobileRules[0]!)).toMatchObject({
      'border-radius': '50%',
      'min-height': '3.75rem',
      right: 'max(0.75rem, env(safe-area-inset-right))',
      top: 'max(4.25rem, calc(env(safe-area-inset-top) + 3.5rem))',
      width: '3.75rem',
    })
  })
})
