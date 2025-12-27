/**
 * Cloudflare Worker for *.pluma.ink wildcard subdomain routing
 * Handles ALL routing - subdomains, builder, 404s, etc.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const path = url.pathname;

    // Extract subdomain
    const parts = hostname.split('.');
    let subdomain = null;

    if (parts.length === 3 && parts[2] === 'ink') {
      // nader0913.pluma.ink
      subdomain = parts[0];
      if (subdomain === 'www' || subdomain === 'pluma') {
        subdomain = null;
      }
    }

    // Create Pages URL
    const pagesUrl = new URL(request.url);
    pagesUrl.hostname = 'pluma.pages.dev';

    // ROUTING LOGIC
    if (!subdomain) {
      // Main domain (pluma.ink)
      // Just proxy to Pages as-is
      pagesUrl.pathname = path;
    } else {
      // User subdomain (username.pluma.ink)
      if (path === '/') {
        // Root → viewer.html
        pagesUrl.pathname = '/viewer.html';
      } else if (path === '/builder' || path === '/builder.html') {
        // Builder page
        pagesUrl.pathname = '/builder.html';
      } else if (path === '/article.html') {
        // Article page
        pagesUrl.pathname = '/article.html';
      } else {
        // Everything else → let Pages serve it (will 404 if doesn't exist)
        pagesUrl.pathname = path;
      }
    }

    // Forward request to Pages
    const pagesRequest = new Request(pagesUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual'
    });

    return fetch(pagesRequest);
  }
}
