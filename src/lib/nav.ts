/**
 * Navigation data — the single source of truth for both the desktop
 * header nav and the mobile nav panel, so the two can never drift.
 *
 * `legalItems` backs the footer's bottom bar. Several of these routes
 * (pricing, FAQ, legal pages) do not exist as pages yet — they belong to
 * later sub-projects. Linking to them now is intentional groundwork, not
 * a bug.
 */
/*
 * No 'Home' entry, deliberately. The wordmark in the header, the mobile
 * nav panel and the footer all link to '/', so a Home item duplicates a
 * link the user already has on every surface this list renders into —
 * and it cost 56px of a header that did not fit. Do not re-add it
 * without re-running tests/header-fit.test.ts.
 *
 * 'Why Us', not 'Why DirectHired' (client decision D-1, approved): the
 * brand name is already set 40px to the left in the wordmark, so the
 * longer label re-stated it inside its own header. The ROUTE keeps the
 * full name — /why-directhired is the URL DirectHired will print and
 * share, and it is enumerated in tests/links.test.ts's DEFERRED_ROUTES.
 * Change the label freely; do not change the href — and if you add a nav
 * entry for a route that does not exist yet, add it to that enumeration
 * in the same commit. It is no longer derived from this file, precisely
 * so that adding a link cannot silently permit itself.
 */
/*
 * 'Services' AND 'Helper Sources' ARE GONE, 2026-08-17, by DirectHired's
 * decision. They return when sub-project 3 ships /services and /helpers.
 *
 * Neither page exists. Both were linked from the header and the mobile panel
 * on all 8 built pages, which is 16 broken links, and this file's own note
 * below — "if you add a nav entry for a route that does not exist yet, add it
 * to that enumeration" — is what made that legal: they were enumerated in
 * tests/links.test.ts's DEFERRED_ROUTES, and that suite ALSO required every
 * enumerated route to be linked. So the suite actively enforced the two
 * broken nav items.
 *
 * Linking a route before it exists is defensible when the page is weeks away
 * and the link is groundwork. It stopped being defensible when it became the
 * top-level navigation of a live site: a visitor clicking "Services" in the
 * header gets a 404, and it is the second item in the list.
 *
 * DO NOT RE-ADD THEM BEFORE THE PAGES SHIP. Both routes were also removed
 * from DEFERRED_ROUTES, so a link to either now FAILS tests/links.test.ts
 * rather than being allowlisted — which is stricter than before, and
 * deliberately so. Sub-project 3 adds the entries back in the same commit as
 * the pages, and the entries can then be deleted again immediately, because
 * the pages will resolve.
 *
 * The header was re-measured after the trim: tests/header-fit.test.ts's
 * MEASURED block carries the new nav width and item count.
 */
export const navItems = [
  { label: 'Find Your Helper', href: '/find-your-helper' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Why Us', href: '/why-directhired' },
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
] as const

/*
 * FOOTER-ONLY ROUTES. Rendered in the footer's Explore list after
 * `navItems`, and deliberately not in the header or the mobile panel.
 *
 * /contact is here rather than in navItems because core-pages design spec
 * §3.4 says so, and because navItems is FULL: tests/header-fit.test.ts pins
 * the item count at the number that was measured to fit between the
 * wordmark and the header CTA at --bp-desktop, so an eighth entry fails
 * that suite. That failure would be correct, and deleting a real page's nav
 * entry to make room would be the wrong way to answer it. The footer
 * already carries the phone, email, address and hours as text; the page is
 * where the local-SEO signals belong (spec §51, §4).
 *
 * Same rule as navItems: a route added here that does not exist yet must be
 * enumerated in tests/links.test.ts's DEFERRED_ROUTES in the same commit.
 */
export const footerItems = [{ label: 'Contact', href: '/contact' }] as const

export const legalItems = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'PDPA Notice', href: '/pdpa' },
  { label: 'Disclaimer', href: '/disclaimer' },
] as const
