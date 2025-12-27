# Cloudflare Deployment Guide

## Prerequisites
1. Cloudflare account (free)
2. Domain name (optional - can use .pages.dev subdomain)
3. Wrangler CLI installed

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

## Step 2: Create D1 Database

```bash
# Create database
wrangler d1 create pluma-db

# Copy the database_id from output and update wrangler.toml
# It will look like: database_id = "xxxxx-xxxx-xxxx-xxxx-xxxxxx"

# Initialize database with schema
wrangler d1 execute pluma-db --file=./schema.sql
```

## Step 3: Deploy to Cloudflare Pages

```bash
# First deployment
wrangler pages deploy . --project-name=pluma

# Or use Git integration (recommended):
# 1. Push code to GitHub
# 2. Go to Cloudflare Dashboard → Pages
# 3. Click "Create a project"
# 4. Connect your GitHub repo
# 5. Build settings:
#    - Build command: (leave empty)
#    - Build output directory: /
```

## Step 4: Configure Custom Domain (Optional)

### Option A: Use Cloudflare Registrar
1. Go to Cloudflare Dashboard → Domain Registration
2. Register domain (e.g., pluma.ink)
3. Go to Pages → Your Project → Custom domains
4. Add domain: pluma.ink
5. Add wildcard: *.pluma.ink

### Option B: Transfer Existing Domain
1. Transfer domain to Cloudflare (or use Cloudflare DNS)
2. Go to Pages → Your Project → Custom domains
3. Add domain and wildcard

## Step 5: Set Up Environment Variables

In Cloudflare Dashboard → Pages → Settings → Environment variables:

```
JWT_SECRET=your-secret-key-here (generate a random string)
ENVIRONMENT=production
```

## Step 6: Test Your Deployment

1. Main site: https://pluma.pages.dev (or your custom domain)
2. User subdomain: https://username.pluma.pages.dev
3. API: https://pluma.pages.dev/api/auth/login

## DNS Configuration for Wildcard Subdomains

If using custom domain, add these DNS records in Cloudflare:

```
Type    Name    Content                 Proxy
A       @       <Pages IP>              Proxied
CNAME   *       pluma.pages.dev         Proxied
CNAME   www     pluma.pages.dev         Proxied
```

## Local Development

```bash
# Test Functions locally
npx wrangler pages dev .

# Access at:
# http://localhost:8788
```

## Migration from Vercel

Your current setup will automatically work on Cloudflare because:
- ✅ Static files served directly
- ✅ API routes replaced with Functions
- ✅ D1 database replaces your local SQLite
- ✅ Wildcard subdomains work automatically

## Costs

Everything is FREE with these limits:
- Pages: Unlimited static requests
- Functions: 100,000 requests/day
- D1: 5GB storage, 5 million reads/day
- Bandwidth: Unlimited

## Next Steps

After deployment:
1. Create your first user account
2. Test subdomain routing
3. Verify cookie authentication works
4. Monitor in Cloudflare Dashboard

