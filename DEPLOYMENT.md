# Deployment Guide - Vercel

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed (`npm i -g vercel`)

## Step 1: Set Up Vercel Postgres

1. Go to https://vercel.com/dashboard
2. Click on the **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a database name (e.g., `article-platform-db`)
6. Select your preferred region
7. Click **Create**

## Step 2: Deploy to Vercel

Run the following command in your project directory:

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** Y
- **Which scope?** Select your account
- **Link to existing project?** N
- **What's your project's name?** article-platform (or your preferred name)
- **In which directory is your code located?** ./
- **Want to override settings?** N

## Step 3: Link Database to Project

1. Go to your project dashboard on Vercel
2. Click on the **Settings** tab
3. Navigate to **Environment Variables**
4. The Postgres environment variables should already be connected
5. Add your custom environment variable:
   - **Key:** `JWT_SECRET`
   - **Value:** Generate a random secret (e.g., run `openssl rand -base64 32`)
   - **Environments:** Production, Preview, Development

## Step 4: Deploy to Production

```bash
vercel --prod
```

## Step 5: Test Your Deployment

Your app will be available at: `https://your-project-name.vercel.app`

Test the following:
1. Sign up for a new account
2. Log in
3. Create an article
4. View your articles

## Database Management

To view your database:
1. Go to Vercel Dashboard → Storage → Your Database
2. Click on **Data** tab to browse tables
3. Click on **Query** tab to run SQL queries

## Local Development with Database

To test locally with the production database:

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull`
4. Run locally: `cd server && node server.js`
5. Open frontend: `python3 -m http.server 8080` (in project root)

## Troubleshooting

### Database Connection Issues
- Ensure `POSTGRES_URL` environment variable is set in Vercel
- Check database is in the same region as your function deployment

### CORS Issues
- Verify the domain is correctly configured in `vercel.json`
- Check that the API routes are working at `/api/*`

### Migration from File Storage
Your existing user data is in `server/users/`. To migrate:
1. The database will auto-initialize tables on first run
2. Users will need to re-register (passwords were hashed differently)
3. Articles can be manually imported via the API if needed

## Next Steps

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Subdomain Routing (For username.domain.com)
This requires additional Vercel configuration:
1. Add wildcard DNS record: `*.yourdomain.com` → Vercel
2. Update `vercel.json` with rewrites for subdomain routing
3. Modify frontend to detect subdomain and load user content

## Cost
- Vercel Free Tier: Includes hobby projects with generous limits
- Postgres Free Tier: 256 MB storage, 60 hours compute per month
- Scale up as needed for production use
