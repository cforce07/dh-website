/**
 * Navigation data — the single source of truth for both the desktop
 * header nav and the mobile nav panel, so the two can never drift.
 *
 * `legalItems` backs the footer's bottom bar. Several of these routes
 * (pricing, FAQ, legal pages) do not exist as pages yet — they belong to
 * later sub-projects. Linking to them now is intentional groundwork, not
 * a bug.
 */
export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Find Your Helper', href: '/find-your-helper' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Helper Sources', href: '/helpers' },
  { label: 'Why DirectHired', href: '/why-directhired' },
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
] as const

export const legalItems = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'PDPA Notice', href: '/pdpa' },
  { label: 'Disclaimer', href: '/disclaimer' },
] as const
