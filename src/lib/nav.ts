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
 * share, and it is in tests/links.test.ts's known-future-routes
 * allowlist. Change the label freely; do not change the href.
 */
export const navItems = [
  { label: 'Find Your Helper', href: '/find-your-helper' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Helper Sources', href: '/helpers' },
  { label: 'Why Us', href: '/why-directhired' },
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
] as const

export const legalItems = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'PDPA Notice', href: '/pdpa' },
  { label: 'Disclaimer', href: '/disclaimer' },
] as const
