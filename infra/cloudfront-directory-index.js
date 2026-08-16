/*
 * CloudFront Function (viewer-request) — directory index rewriting.
 *
 * The bucket is private and served through Origin Access Control, so
 * CloudFront asks S3 for the object key literally. S3 has no notion of a
 * directory index: a request for `/pricing/` becomes a GET for the key
 * `pricing/`, which does not exist, and OAC turns that into a 403 rather
 * than a 404.
 *
 * `DefaultRootObject: index.html` does NOT cover this. It applies only to
 * the distribution root, which is why the homepage worked and every other
 * page 403'd — the bug was invisible for as long as the site had one page.
 *
 * Astro builds with `build.format: 'directory'`, so every route is a
 * directory holding an index.html, and every internal link points at the
 * extensionless form. Both shapes are rewritten here:
 *
 *   /pricing/  -> /pricing/index.html
 *   /pricing   -> /pricing/index.html
 *   /          -> /index.html
 *
 * Anything with a file extension is passed through untouched, so
 * /_astro/*.css, the fonts, the images, sitemap-index.xml and robots.txt
 * are unaffected.
 *
 * APEX REDIRECT. The production distribution carries BOTH hostnames, and
 * company.siteUrl makes www the canonical one, so directhired.com has to
 * 301 to www.directhired.com. It lives in this function rather than in a
 * second one because CloudFront allows exactly ONE function per event type
 * per cache behaviour — there was never an option to keep it separate.
 *
 * The host test is an EXACT equality match, deliberately. A suffix or
 * substring test ("ends with directhired.com") would also match
 * www.directhired.com and redirect the canonical host to itself, forever.
 * It would match the preview distribution's own hostname too, and this one
 * function is shared with preview, which must keep behaving exactly as it
 * always has.
 *
 * The redirect returns EARLY, above everything below, so it sits upstream
 * of the rewrite logic and could break it without the redirect's own tests
 * noticing. tests/infra.test.ts therefore covers both halves, asserts the
 * negative cases (www and the preview host must NOT redirect), and asserts
 * that the target here still agrees with company.siteUrl.
 *
 * Deployed by scripts/deploy-cloudfront-function.sh. The published copy on
 * the distribution is the one that runs; this file is the source of truth
 * for what it should contain.
 */
function handler(event) {
  var request = event.request
  var host = request.headers.host ? request.headers.host.value : ''

  // EXACT match. Read the note above before loosening this to anything else.
  if (host === 'directhired.com') {
    // Rebuild the query string by hand. Dropping it would silently strip
    // utm_* parameters at the redirect, which nobody notices until someone
    // tries to measure a campaign and the traffic is already unattributed.
    var keys = Object.keys(request.querystring || {})
    var qs = ''
    if (keys.length > 0) {
      var parts = []
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        var param = request.querystring[key]
        if (param.multiValue) {
          for (var j = 0; j < param.multiValue.length; j++) {
            parts.push(key + '=' + param.multiValue[j].value)
          }
        } else if (param.value === '') {
          parts.push(key)
        } else {
          parts.push(key + '=' + param.value)
        }
      }
      qs = '?' + parts.join('&')
    }
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://www.directhired.com' + request.uri + qs } },
    }
  }

  var uri = request.uri

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html'
    return request
  }

  // No extension in the last path segment => a page route, not an asset.
  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1)
  if (lastSegment.indexOf('.') === -1) {
    request.uri = uri + '/index.html'
  }

  return request
}
