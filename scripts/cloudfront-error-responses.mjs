#!/usr/bin/env node
/**
 * The CustomErrorResponses patch for the CloudFront distribution, as a pure
 * transform with its own self-test.
 *
 * WHY A NODE SCRIPT AND NOT A LINE OF jq IN THE SHELL. A DistributionConfig
 * is the WHOLE configuration of the distribution — origins, behaviours,
 * certificates, the lot — and `update-distribution` replaces all of it.
 * There is no partial update. So the risky part of this change is not the
 * two error responses; it is everything else in that document surviving the
 * round trip untouched. That is a property worth ASSERTING rather than
 * eyeballing, and asserting it needs a program. jq is also not guaranteed to
 * be installed; Node is (package.json requires >= 20.3.0).
 *
 * WHAT IT ADDS, AND WHY EACH PART.
 *
 *   403 -> /404.html with response code 404. THE 403 IS THE WHOLE POINT.
 *   The bucket is private and served through Origin Access Control, so
 *   CloudFront asks S3 for the object key literally; a key that does not
 *   exist comes back as 403 AccessDenied, never 404, because OAC will not
 *   tell an anonymous caller whether an object exists. Combined with
 *   infra/cloudfront-directory-index.js rewriting /whatever to
 *   /whatever/index.html, every mistyped URL on this site currently reaches
 *   the visitor as a bare XML AccessDenied document.
 *
 *   404 -> /404.html with response code 404. Belt and braces: S3 returns a
 *   real 404 for a missing key when the bucket is public or when the request
 *   is signed differently, and a future origin change could put the site in
 *   that position. Mapping only the 403 would then silently stop working.
 *
 *   ResponseCode 404, NOT 200. A "soft 404" — an error page served with a
 *   200 — is a documented SEO defect: search engines index it, and a site
 *   that answers 200 for every URL trains a crawler to treat all of them as
 *   real. The status is the machine-readable half of the answer and the page
 *   is the human half.
 *
 *   ErrorCachingMinTTL 10 seconds. The floor CloudFront will hold an error
 *   at the edge. It has to be SHORT, because the most common reason for a
 *   404 on a growing site is a page that has not been deployed yet: a long
 *   TTL means the page ships and the edge goes on serving the 404 for the
 *   rest of the TTL, from a cache no `create-invalidation` of the missing
 *   path can usefully clear. 10s costs nothing — the origin fetch behind it
 *   is a single small object — and removes the failure mode entirely.
 *
 * SIDE EFFECT, ON THE RECORD BECAUSE IT IS NOT REVERSIBLE BY ACCIDENT:
 * mapping 403 to 404 means EVERY 403 from this origin becomes a 404 page.
 * On a private-bucket static marketing site that is exactly right — there is
 * no legitimate 403 to distinguish, and today every one of them is a missing
 * page. If this distribution ever fronts something with real authorisation
 * (a signed-URL area, an API behaviour), that behaviour needs its own
 * CustomErrorResponse-free cache behaviour, or genuine "you may not see
 * this" answers will be reported to the user as "this does not exist".
 *
 * Usage:
 *   node scripts/cloudfront-error-responses.mjs --self-test
 *   node scripts/cloudfront-error-responses.mjs <config-in.json> <config-out.json>
 *
 * Both are run by scripts/deploy-cloudfront-error-pages.sh, which refuses to
 * publish if either exits non-zero.
 *
 * EXIT CODES, because the caller acts on them:
 *   0 — patched, and the distribution needs updating.
 *   3 — the distribution already carries exactly this mapping; nothing to do.
 *   1 — refused. Either the transform is broken (--self-test) or the patched
 *       config failed verification, in which case NOTHING should be sent to
 *       `update-distribution`.
 *
 * The 3 matters more than it looks: without it the caller would have to
 * decide "has anything changed?" by comparing the AWS CLI's JSON formatting
 * with this script's, which differs in whitespace and would report a change
 * on every run — turning a no-op re-run into a real distribution deploy and
 * a multi-minute wait.
 */
import { readFileSync, writeFileSync } from 'node:fs'

/** The page S3 holds, and the status the visitor's browser must be given. */
export const ERROR_PAGE_PATH = '/404.html'
export const RESPONSE_CODE = '404'
export const ERROR_CACHING_MIN_TTL = 10

/** The origin statuses that mean "there is no page here". */
export const MAPPED_ERROR_CODES = [403, 404]

/** The CustomErrorResponses block this distribution should carry. */
export function desiredErrorResponses() {
  return {
    Quantity: MAPPED_ERROR_CODES.length,
    Items: MAPPED_ERROR_CODES.map((code) => ({
      ErrorCode: code,
      ResponsePagePath: ERROR_PAGE_PATH,
      ResponseCode: RESPONSE_CODE,
      ErrorCachingMinTTL: ERROR_CACHING_MIN_TTL,
    })),
  }
}

/**
 * A DistributionConfig with the error responses applied, and NOTHING else
 * touched.
 *
 * Returns a new object rather than mutating: the caller compares the two,
 * and a mutating transform makes that comparison compare a thing with
 * itself — the x === x mistake this repo's test suite has caught twice.
 */
export function withErrorResponses(config) {
  return { ...config, CustomErrorResponses: desiredErrorResponses() }
}

/** The same config with the error responses removed, for comparison. */
function withoutErrorResponses(config) {
  const { CustomErrorResponses, ...rest } = config
  return rest
}

/**
 * Everything that must be true of the patched config before it is allowed
 * anywhere near `update-distribution`. Returns a list of problems; empty
 * means safe.
 *
 * The second check is the one that matters. `update-distribution` replaces
 * the ENTIRE configuration, so the failure worth preventing is not "the
 * error responses are wrong" — it is "something else changed and nobody
 * noticed", which is how an origin, a behaviour or a certificate reference
 * gets dropped by a script that meant to add two lines.
 */
export function verify(original, patched) {
  const problems = []
  const responses = patched.CustomErrorResponses

  if (!responses) {
    problems.push('patched config has no CustomErrorResponses at all')
  } else {
    if (responses.Quantity !== MAPPED_ERROR_CODES.length) {
      problems.push(`Quantity is ${responses.Quantity}, expected ${MAPPED_ERROR_CODES.length}`)
    }
    if (!Array.isArray(responses.Items) || responses.Items.length !== responses.Quantity) {
      problems.push('Items does not match Quantity')
    } else {
      const codes = responses.Items.map((item) => item.ErrorCode).sort((a, b) => a - b)
      if (JSON.stringify(codes) !== JSON.stringify([...MAPPED_ERROR_CODES].sort((a, b) => a - b))) {
        problems.push(`mapped error codes are ${codes.join(', ')}`)
      }
      for (const item of responses.Items) {
        if (item.ResponsePagePath !== ERROR_PAGE_PATH) {
          problems.push(`${item.ErrorCode} points at ${item.ResponsePagePath}`)
        }
        if (String(item.ResponseCode) !== RESPONSE_CODE) {
          problems.push(
            `${item.ErrorCode} answers with ${item.ResponseCode}, not ${RESPONSE_CODE} — a soft 404`,
          )
        }
      }
    }
  }

  const before = JSON.stringify(withoutErrorResponses(original))
  const after = JSON.stringify(withoutErrorResponses(patched))
  if (before !== after) {
    problems.push('the patch changed something other than CustomErrorResponses')
  }

  return problems
}

/* ------------------------------------------------------------------------
 * Self-test. Run before anything is fetched, so a broken transform stops
 * the deploy before it has touched AWS at all.
 * --------------------------------------------------------------------- */

function selfTest() {
  const failures = []
  const check = (name, condition) => {
    if (!condition) failures.push(name)
  }

  // A config shaped like the real one in the ways that matter: nested
  // objects, an array, and a key whose loss would break the site.
  const base = {
    CallerReference: 'ref-1',
    Origins: { Quantity: 1, Items: [{ Id: 's3', DomainName: 'bucket.s3.amazonaws.com' }] },
    DefaultCacheBehavior: {
      TargetOriginId: 's3',
      FunctionAssociations: {
        Quantity: 1,
        Items: [{ EventType: 'viewer-request', FunctionARN: 'arn:aws:cloudfront::fn' }],
      },
    },
    DefaultRootObject: 'index.html',
    Enabled: true,
  }

  const patched = withErrorResponses(base)

  check('adds the two error responses', verify(base, patched).length === 0)
  check('maps 403', patched.CustomErrorResponses.Items.some((i) => i.ErrorCode === 403))
  check('maps 404', patched.CustomErrorResponses.Items.some((i) => i.ErrorCode === 404))
  check(
    'answers with a 404 status, never a soft 200',
    patched.CustomErrorResponses.Items.every((i) => i.ResponseCode === '404'),
  )
  check(
    'keeps the viewer-request function association',
    patched.DefaultCacheBehavior.FunctionAssociations.Items[0].FunctionARN ===
      'arn:aws:cloudfront::fn',
  )
  check('does not mutate its input', base.CustomErrorResponses === undefined)

  // Idempotent: running it against an already-patched distribution must be a
  // no-op, so re-running the deploy script is safe.
  const twice = withErrorResponses(patched)
  check('is idempotent', JSON.stringify(twice) === JSON.stringify(patched))

  // Replaces a wrong existing mapping rather than appending to it — the
  // shape a half-finished earlier attempt would leave behind.
  const wrong = {
    ...base,
    CustomErrorResponses: {
      Quantity: 1,
      Items: [
        { ErrorCode: 403, ResponsePagePath: '/index.html', ResponseCode: '200', ErrorCachingMinTTL: 300 },
      ],
    },
  }
  check('replaces a soft-404 mapping', verify(wrong, withErrorResponses(wrong)).length === 0)

  // ...and the verifier is not a rubber stamp. Each of these must be
  // REPORTED, or the checks above prove nothing.
  check(
    'rejects a soft 404',
    verify(base, {
      ...base,
      CustomErrorResponses: {
        Quantity: 2,
        Items: desiredErrorResponses().Items.map((i) => ({ ...i, ResponseCode: '200' })),
      },
    }).length > 0,
  )
  check(
    'rejects a page path that is not the 404 page',
    verify(base, {
      ...base,
      CustomErrorResponses: {
        Quantity: 2,
        Items: desiredErrorResponses().Items.map((i) => ({ ...i, ResponsePagePath: '/' })),
      },
    }).length > 0,
  )
  check(
    'rejects a patch that dropped an origin',
    verify(base, { ...withErrorResponses(base), Origins: { Quantity: 0, Items: [] } }).length > 0,
  )
  check('rejects a config with no error responses', verify(base, base).length > 0)

  if (failures.length > 0) {
    console.error('\ncloudfront-error-responses self-test FAILED:')
    for (const failure of failures) console.error(`    ${failure}`)
    console.error('')
    process.exit(1)
  }

  console.log('    self-test ok (11 checks)')
}

/* ------------------------------------------------------------------------
 * CLI
 * --------------------------------------------------------------------- */

const [command, output] = process.argv.slice(2)

if (command === '--self-test') {
  selfTest()
} else if (command && output) {
  const original = JSON.parse(readFileSync(command, 'utf8'))
  const patched = withErrorResponses(original)
  const problems = verify(original, patched)
  if (problems.length > 0) {
    console.error('\nRefusing to write the patched config:')
    for (const problem of problems) console.error(`    ${problem}`)
    console.error('')
    process.exit(1)
  }
  writeFileSync(output, `${JSON.stringify(patched, null, 2)}\n`)
  const before = original.CustomErrorResponses
  console.log(
    `    before: ${before ? `${before.Quantity} custom error response(s)` : 'none'}`,
  )
  console.log(
    `    after:  ${patched.CustomErrorResponses.Items.map(
      (i) => `${i.ErrorCode} -> ${i.ResponsePagePath} (${i.ResponseCode})`,
    ).join(', ')}`,
  )
  // Compared as VALUES, not as formatted text — see the exit-code note in
  // this file's header for why the caller cannot do this itself.
  const unchanged = JSON.stringify(before) === JSON.stringify(desiredErrorResponses())
  if (unchanged) process.exit(3)
} else {
  console.error(
    '\nUsage:\n' +
      '  node scripts/cloudfront-error-responses.mjs --self-test\n' +
      '  node scripts/cloudfront-error-responses.mjs <config-in.json> <config-out.json>\n',
  )
  process.exit(1)
}
