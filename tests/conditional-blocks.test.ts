import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import MeetHelpers from '../src/sections/MeetHelpers.astro'
import Reviews from '../src/sections/Reviews.astro'

describe('conditional homepage blocks', () => {
  it('MeetHelpers guards on a non-empty collection', () => {
    const source = readFileSync('src/sections/MeetHelpers.astro', 'utf8')
    expect(source).toMatch(/length\s*[>!]/)
  })

  it('Reviews guards on a non-empty collection', () => {
    const source = readFileSync('src/sections/Reviews.astro', 'utf8')
    expect(source).toMatch(/length\s*[>!]/)
  })

  it('neither block invents fallback content', () => {
    for (const file of ['MeetHelpers', 'Reviews']) {
      const source = readFileSync(`src/sections/${file}.astro`, 'utf8')
      expect(source).not.toMatch(/lorem|placeholder name|example review/i)
    }
  })

  // The tests above only check that a length comparison exists somewhere in the
  // source — a component could technically match that regex while still
  // rendering a visible shell (e.g. an empty <section> with a heading) when the
  // collection is empty. The two collections genuinely are empty right now
  // (see src/content/helper-profiles and src/content/reviews below), so we can
  // render each component through Astro's container API with today's real,
  // empty collections and assert no <section> markup is produced — the
  // strongest check available without a full site build. (Astro still emits
  // the component's scoped <style> block: which components' CSS ships is
  // decided at compile time from the static import graph in index.astro, not
  // from this runtime conditional, so an unrendered block's dead CSS rules
  // being present is expected and harmless — they match no element on the
  // page. What must not appear is the <section> markup itself.)

  it('both backing collections are currently empty (precondition for the render check below)', () => {
    const helperProfileFiles = readdirSync('src/content/helper-profiles').filter((f) => f !== '.gitkeep')
    const reviewFiles = readdirSync('src/content/reviews').filter((f) => f !== '.gitkeep')
    expect(helperProfileFiles).toHaveLength(0)
    expect(reviewFiles).toHaveLength(0)
  })

  it('MeetHelpers renders no <section> markup with an empty helper-profiles collection', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(MeetHelpers)
    expect(html).not.toContain('<section')
    expect(html).not.toContain('meet-helpers')
  })

  it('Reviews renders no <section> markup with an empty reviews collection', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(Reviews)
    expect(html).not.toContain('<section')
    // Class name appears only inside the (still-emitted, but inert) scoped
    // <style> block, never attached to any element, when the guard holds.
    expect(html).not.toMatch(/class="reviews"/)
  })

  it('neither conditional block imports/uses the <Tbd> component — an absent section is not an unverified one', () => {
    for (const file of ['MeetHelpers', 'Reviews']) {
      const source = readFileSync(`src/sections/${file}.astro`, 'utf8')
      expect(source).not.toMatch(/from ['"].*Tbd\.astro['"]/)
      expect(source).not.toMatch(/<Tbd[\s/]/)
    }
  })
})
