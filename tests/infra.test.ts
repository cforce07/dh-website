/**
 * Guards on the CloudFront viewer-request function.
 *
 * The function is uploaded verbatim to a runtime with no module system, so it
 * cannot export anything and cannot be imported. It is evaluated here instead —
 * the same trick, and for the same reason, as the robots.txt guard in
 * tests/content.test.ts: a file that cannot import `company` still has to agree
 * with it, so something has to check.
 *
 * This matters more than a normal unit test. A viewer-request function runs on
 * EVERY request to BOTH distributions, so a mistake here is not one broken
 * page — it is every page at once, including the ones nobody touched. That is
 * also why scripts/deploy-cloudfront-function.sh re-tests the same behaviour
 * against the real published function before it will publish. These assertions
 * are the fast copy; that script is the one that can stop a bad deploy.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { company } from '../src/data/company'

const SRC = readFileSync('infra/cloudfront-directory-index.js', 'utf8')

/** `www.directhired.com` — the canonical host, derived rather than repeated. */
const CANONICAL_HOST = new URL(company.siteUrl).hostname
/** `directhired.com` — the apex, which must 301 to the canonical host. */
const APEX_HOST = CANONICAL_HOST.replace(/^www\./, '')
/** The preview distribution shares this function and must be unaffected. */
const PREVIEW_HOST = 'didceb5na1cjo.cloudfront.net'

type Querystring = Record<string, { value: string; multiValue?: { value: string }[] }>

function loadHandler(): (event: unknown) => any {
  return new Function(`${SRC}; return handler`)()
}

function event(uri: string, host: string, querystring: Querystring = {}) {
  return {
    version: '1.0',
    context: { eventType: 'viewer-request' },
    request: {
      method: 'GET',
      uri,
      headers: { host: { value: host } },
      querystring,
      cookies: {},
    },
  }
}

describe('the apex redirect', () => {
  const handler = loadHandler()

  it('301s the bare apex to the canonical host', () => {
    const out = handler(event('/', APEX_HOST))
    expect(out.statusCode).toBe(301)
    expect(out.headers.location.value).toBe(`${company.siteUrl}/`)
  })

  it('preserves the path', () => {
    const out = handler(event('/pricing', APEX_HOST))
    expect(out.headers.location.value).toBe(`${company.siteUrl}/pricing`)
  })

  /*
   * A redirect that drops the query string is a reporting bug nobody notices
   * until someone tries to measure a campaign — by which point the traffic has
   * already arrived unattributed and the data cannot be recovered.
   */
  it('preserves the query string, so campaign parameters survive', () => {
    const out = handler(event('/pricing', APEX_HOST, { utm_source: { value: 'fb' } }))
    expect(out.headers.location.value).toBe(`${company.siteUrl}/pricing?utm_source=fb`)
  })

  it('preserves a valueless query parameter', () => {
    const out = handler(event('/', APEX_HOST, { debug: { value: '' } }))
    expect(out.headers.location.value).toBe(`${company.siteUrl}/?debug`)
  })

  it('preserves a repeated query parameter', () => {
    const out = handler(
      event('/', APEX_HOST, {
        tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] },
      }),
    )
    expect(out.headers.location.value).toBe(`${company.siteUrl}/?tag=a&tag=b`)
  })
})

/*
 * The negative cases. These are the half that actually protects something:
 * the positive case above is obvious and would be noticed immediately, while
 * a host test that matched too broadly would send www to itself forever, and
 * would do it to the preview distribution too.
 */
describe('the apex redirect does not fire for anything else', () => {
  const handler = loadHandler()

  it('does NOT redirect the canonical host — that would be an infinite loop', () => {
    const out = handler(event('/pricing', CANONICAL_HOST))
    expect(out.statusCode).toBeUndefined()
    expect(out.uri).toBe('/pricing/index.html')
  })

  it('does NOT redirect the preview distribution, which shares this function', () => {
    const out = handler(event('/pricing', PREVIEW_HOST))
    expect(out.statusCode).toBeUndefined()
    expect(out.uri).toBe('/pricing/index.html')
  })

  it('matches the apex exactly, not by suffix — a lookalike host must not match', () => {
    const out = handler(event('/', 'notdirecthired.com'))
    expect(out.statusCode).toBeUndefined()
  })

  it('tolerates a missing host header rather than throwing', () => {
    const bare = {
      version: '1.0',
      context: { eventType: 'viewer-request' },
      request: { method: 'GET', uri: '/pricing', headers: {}, querystring: {}, cookies: {} },
    }
    expect(() => handler(bare)).not.toThrow()
    expect(handler(bare).uri).toBe('/pricing/index.html')
  })
})

describe('the redirect target cannot drift from company.siteUrl', () => {
  it('names the canonical origin the rest of the site uses', () => {
    expect(SRC).toContain(company.siteUrl)
  })

  it('names the apex it redirects away from', () => {
    expect(SRC).toContain(`'${APEX_HOST}'`)
  })
})

/*
 * Regression cover for what the function did before the redirect was added.
 * The apex branch returns early, so it sits upstream of all of this and could
 * break it without any of the cases above noticing.
 */
describe('directory index rewriting is unchanged', () => {
  const handler = loadHandler()

  const cases: [string, string][] = [
    ['/', '/index.html'],
    ['/pricing', '/pricing/index.html'],
    ['/pricing/', '/pricing/index.html'],
    ['/services/transfer-helper', '/services/transfer-helper/index.html'],
    ['/services/transfer-helper/', '/services/transfer-helper/index.html'],
    ['/helpers/indonesia', '/helpers/indonesia/index.html'],
    ['/_astro/style.css', '/_astro/style.css'],
    ['/fonts/fraunces.woff2', '/fonts/fraunces.woff2'],
    ['/sitemap-index.xml', '/sitemap-index.xml'],
    ['/robots.txt', '/robots.txt'],
    ['/favicon.svg', '/favicon.svg'],
  ]

  it.each(cases)('%s -> %s', (uri, expected) => {
    expect(handler(event(uri, CANONICAL_HOST)).uri).toBe(expected)
  })
})

/*
 * COST AND TLS GUARDS ON THE PRODUCTION DISTRIBUTION CONFIG.
 *
 * These assert a committed JSON file, not live AWS, so they cannot prove what
 * is currently deployed — `aws cloudfront get-distribution-config` does that,
 * and the runbook records the result. What they DO prevent is the config in
 * this repository quietly regressing, which is how the deployed one would come
 * to be wrong on the next `create-distribution`.
 *
 * The SSLSupportMethod case is the one with money attached. See its comment.
 */
describe('production distribution config', () => {
  const dist = JSON.parse(readFileSync('infra/prod-distribution.json', 'utf8'))

  /*
   * `vip` provisions dedicated IP addresses at every CloudFront edge and bills
   * roughly US$600 PER MONTH. `sni-only` is free and is supported by every
   * browser released since about 2010.
   *
   * This is not a hypothetical. The PREVIEW distribution's live config carries
   * `SSLSupportMethod: "vip"` to this day. It costs nothing there only because
   * that distribution uses the default *.cloudfront.net certificate, and the
   * field is inert until a CUSTOM certificate is attached. The production
   * config was written by mirroring preview — so copying that one field
   * without reading it would have started a $600/month charge silently, with
   * no error and no warning, the moment the distribution deployed.
   */
  it('uses sni-only, never vip — vip costs ~US$600/month', () => {
    expect(dist.ViewerCertificate.SSLSupportMethod).toBe('sni-only')
  })

  it('does not fall back to the default CloudFront certificate', () => {
    expect(dist.ViewerCertificate.ACMCertificateArn).toMatch(
      /^arn:aws:acm:us-east-1:\d+:certificate\//,
    )
  })

  /*
   * CloudFront reads certificates from us-east-1 ONLY, whatever region the
   * origin bucket is in. Ours is in ap-southeast-1, which makes this an easy
   * thing to "correct" wrongly.
   */
  it('takes its certificate from us-east-1, as CloudFront requires', () => {
    expect(dist.ViewerCertificate.ACMCertificateArn).toContain(':us-east-1:')
  })

  it('requires a modern TLS floor', () => {
    expect(dist.ViewerCertificate.MinimumProtocolVersion).toBe('TLSv1.2_2021')
  })

  /*
   * PriceClass_100 is cheaper and would be a tempting cost saving. It excludes
   * the Singapore edge locations entirely, so requests from the actual
   * audience would be served from the US or Europe. That is the wrong trade
   * for a Singapore agency whose LCP budget is 2.5s on mid-range Android.
   */
  it('keeps the price class that includes Singapore edges', () => {
    expect(dist.PriceClass).toBe('PriceClass_200')
  })

  /*
   * A private S3 origin behind OAC answers a missing key with 403, not 404,
   * because CloudFront is granted s3:GetObject but not s3:ListBucket. Without
   * this mapping, src/pages/404.astro never renders and crawlers see an
   * access-denied page instead of a 404.
   */
  it('maps 403 and 404 to the built 404 page with a 404 status', () => {
    const byCode = Object.fromEntries(
      dist.CustomErrorResponses.Items.map((e: any) => [e.ErrorCode, e]),
    )
    for (const code of [403, 404]) {
      expect(byCode[code]).toBeDefined()
      expect(byCode[code].ResponsePagePath).toBe('/404.html')
      expect(byCode[code].ResponseCode).toBe('404')
    }
  })

  it('serves both hostnames', () => {
    expect(dist.Aliases.Items.sort()).toEqual(['directhired.com', 'www.directhired.com'])
  })
})
