# Local Development Setup

## Quick Start

### Option 1: Run Both Servers (Recommended)

```bash
./run-local.sh
```

This starts:
- API server on `http://localhost:3000`
- Dev server on `http://localhost:8080`

### Option 2: Run Servers Separately

**Terminal 1 - API Server:**
```bash
npm run api
```

**Terminal 2 - Dev Server:**
```bash
npm run dev
```

## Access Your Local Site

- **Landing Page:** http://localhost:8080
- **Login/Signup:** http://localhost:8080/login.html
- **User Articles (subdomain):** http://username.localhost:8080

## How It Works

### Dev Server (Port 8080)
- Serves all static files (HTML, CSS, JS)
- Handles subdomain routing (username.localhost:8080)
- Proxies `/api/*` requests to API server

### API Server (Port 3000)
- Handles authentication
- Manages database operations
- Provides REST API endpoints

## Environment Variables

Create a `.env` file in the project root:

```env
# Database (Vercel Postgres)
POSTGRES_URL=your_postgres_url_here

# JWT Secret
JWT_SECRET=your_secret_key_here
```

## Testing Subdomains Locally

Browsers support `*.localhost` subdomains automatically:
- http://localhost:8080 → Main landing page
- http://nader.localhost:8080 → User "nader"'s articles
- http://john.localhost:8080 → User "john"'s articles

No `/etc/hosts` configuration needed!

## Stopping Servers

Press `Ctrl+C` in the terminal where servers are running.

## Troubleshooting

**API requests failing?**
- Make sure API server is running on port 3000
- Check console for error messages

**Subdomain not working?**
- Use Chrome/Firefox (Safari sometimes has issues with .localhost)
- Try http://username.localhost:8080 (not https)

**Database errors?**
- Check your `.env` file has correct POSTGRES_URL
- Run `node scripts/init-db.js` to initialize database
