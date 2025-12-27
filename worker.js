/**
 * Cloudflare Worker for Wildcard Subdomain Routing
 * Handles *.pluma.ink routing since Pages doesn't support wildcard domains
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const pathname = url.pathname;

    // Extract subdomain
    const parts = hostname.split('.');
    let subdomain = null;

    if (parts.length >= 3 && parts[parts.length - 2] === 'pluma' && parts[parts.length - 1] === 'ink') {
      subdomain = parts[0];
      if (subdomain === 'www' || subdomain === 'api') {
        subdomain = null;
      }
    }

    // If it's a subdomain (username.pluma.ink)
    if (subdomain) {
      // For static assets (CSS, JS, images, etc.), proxy directly from Pages
      if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)) {
        const pagesUrl = `https://pluma.ink${pathname}${url.search}`;
        return fetch(pagesUrl);
      }

      // For HTML pages, serve viewer.html (it will detect the subdomain via JS)
      const pagesUrl = `https://pluma.ink/viewer.html`;
      const response = await fetch(pagesUrl);

      if (!response.ok) {
        return new Response('Error loading page', { status: 500 });
      }

      // Return the index.html
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    // For main domain or API routes, proxy to Pages
    const pagesUrl = `https://pluma-a6y.pages.dev${pathname}${url.search}`;

    // Forward the request to Pages
    const modifiedRequest = new Request(pagesUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual'
    });

    const response = await fetch(modifiedRequest);

    // Return response with CORS headers preserved
    return response;
  }
};
