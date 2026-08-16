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
 * Deployed by scripts/deploy-cloudfront-function.sh. The published copy on
 * the distribution is the one that runs; this file is the source of truth
 * for what it should contain.
 */
function handler(event) {
  var request = event.request
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
