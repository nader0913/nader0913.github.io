# Multi-User Article Platform

A simple, elegant multi-user blogging platform where each user gets their own subdomain to publish articles.

## 🎯 Features

- **Multi-User Support**: Each user gets a subdomain (e.g., `alex.domain.com`)
- **Authentication**: Simple login/signup system
- **Article Builder**: Rich markdown editor with live preview
- **Public/Private Modes**: View articles publicly, edit when logged in
- **Flexible Storage**: Works with localStorage (offline) OR server (multi-user)
- **No Database Required**: Uses simple JSON file storage

## 🚀 Quick Start

### Option 1: LocalStorage Mode (Single User, No Server)

Perfect for testing or single-user offline use.

1. Open `js/config.js` and ensure:
   ```javascript
   storage: 'localStorage'
   ```

2. Open `index.html` in your browser or serve with:
   ```bash
   python -m http.server 8080
   ```

3. Navigate to `http://localhost:8080`

### Option 2: Server Mode (Multi-User)

For multi-user support with persistent storage.

1. **Start the server**:
   ```bash
   cd server
   node server.js
   ```
   Server runs on `http://localhost:3000`

2. **Configure the app**:
   Open `js/config.js` and set:
   ```javascript
   storage: 'server'
   api: {
     endpoint: 'http://localhost:3000/api'
   }
   ```

3. **Serve the frontend**:
   ```bash
   # In project root
   python -m http.server 8080
   ```

4. **Access the app**:
   - Landing page: `http://localhost:8080`
   - After login, you'll be redirected to your "subdomain"

## 📁 Project Structure

```
├── index.html              # Router (redirects based on subdomain)
├── landing.html            # Login/Signup page
├── viewer.html             # Article viewer (public)
├── article.html            # Individual article page
├── builder.html            # Article list for builder
├── builder-article.html    # Article editor
│
├── js/
│   ├── config.js          # Configuration (storage mode, API endpoint)
│   ├── api.js             # API abstraction layer
│   ├── auth.js            # Authentication & routing
│   ├── viewer.js          # Article viewer logic
│   ├── builder.js         # Article builder logic
│   └── markdown-converter.js
│
├── css/
│   ├── auth.css           # Login/signup styles
│   └── ... (other styles)
│
└── server/
    ├── server.js          # Node.js API server
    ├── package.json
    └── users/             # User data storage
        └── {username}/
            ├── auth.json  # User credentials
            └── data.json  # User articles
```

## 🔄 How It Works

### Authentication Flow

1. User visits main domain → sees login/signup
2. User signs up → creates account
3. User logs in → redirected to `{username}.domain.com` (simulated locally)
4. Articles are publicly viewable, "Go to Builder" button appears if logged in

### Subdomain Simulation (Local Development)

Since you can't easily create real subdomains on localhost, the app uses client-side routing:

```javascript
// SubdomainUtils.getUsername() extracts username from URL
// On localhost, this returns null (main site)
// In production, alex.domain.com → returns 'alex'
```

### Storage Modes

#### LocalStorage Mode
- Articles stored in browser's localStorage
- No server needed
- Great for testing/single user
- Data persists per browser

#### Server Mode
- Articles stored in `server/users/{username}/data.json`
- Multi-user support
- Persistent across devices
- Requires Node.js server running

## 🎨 User Flow

```
┌─────────────┐
│ Visit Site  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Landing Page    │ ← Login/Signup
│ (landing.html)  │
└──────┬──────────┘
       │ Login
       ▼
┌──────────────────┐
│ Viewer Page      │ ← Public articles
│ (viewer.html)    │   [Go to Builder] button if logged in
└──────┬───────────┘
       │ Click "Go to Builder"
       ▼
┌──────────────────┐
│ Builder Homepage │ ← List of user's articles
│ (builder.html)   │   [New Article] [Import MD]
└──────┬───────────┘
       │ Create/Edit article
       ▼
┌──────────────────────┐
│ Article Editor       │ ← Rich markdown editor
│ (builder-article.html)│  Auto-save, export, preview
└──────────────────────┘
```

## 🔧 Configuration

Edit `js/config.js`:

```javascript
const CONFIG = {
  // API Configuration
  api: {
    endpoint: 'http://localhost:3000/api',
    // For production: 'https://api.yourdomain.com'
  },

  // Storage Strategy
  storage: 'localStorage', // 'localStorage' | 'server'

  // Feature Flags
  features: {
    multiUser: true,
    authentication: true,
    subdomains: true
  },

  // App Settings
  app: {
    defaultDomain: 'localhost:8080',
    // For production: 'yourdomain.com'
  }
};
```

## 🌐 Production Deployment

### Prerequisites

1. Domain with wildcard DNS (*.yourdomain.com)
2. Server with Node.js
3. SSL certificate (for HTTPS)

### Steps

1. **Update config.js**:
   ```javascript
   storage: 'server'
   api: {
     endpoint: 'https://api.yourdomain.com'
   }
   app: {
     defaultDomain: 'yourdomain.com'
   }
   ```

2. **Setup DNS**:
   - Point `*.yourdomain.com` to your server IP
   - Point `yourdomain.com` to your server IP

3. **Deploy server**:
   ```bash
   cd server
   npm start
   # Use PM2 or similar for production
   ```

4. **Serve frontend**:
   - Use Nginx, Apache, or any static hosting
   - Ensure all `*.yourdomain.com` requests serve the same files

5. **SSL**: Use Let's Encrypt for free SSL certificates

### Sample Nginx Config

```nginx
server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    root /path/to/nader0913.github.io;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

## 🔐 Security Considerations

⚠️ **This is a simple development setup. For production**:

1. **Use a real database** (MongoDB, PostgreSQL)
2. **Hash passwords properly** (bcrypt, not SHA256)
3. **Use proper JWT** with secret keys from env variables
4. **Add rate limiting** to prevent abuse
5. **Validate all inputs** (sanitize markdown, usernames)
6. **Use HTTPS** everywhere
7. **Implement CSRF protection**
8. **Add email verification** for signups

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/signup` - Create new account

### Articles
- `GET /api/articles/:username` - Get user's articles (public)
- `POST /api/articles/:username` - Save article (auth required)
- `DELETE /api/articles/:username/:id` - Delete article (auth required)

## 🐛 Troubleshooting

### "Storage is not defined"
- Make sure `js/config.js` is loaded before `js/api.js`

### "Cannot read subdomain"
- This is normal on localhost without subdomains
- The app falls back to main site behavior

### Articles not saving
- Check browser console for errors
- If using server mode, ensure server is running
- Check `server/users/{username}/data.json` exists

### Builder page redirects to login
- Ensure you're logged in
- Check sessionStorage has `auth_token`
- Verify subdomain matches logged-in user

## 📚 Extending the Platform

### Add a New Page

1. Create HTML file (e.g., `profile.html`)
2. Add route in `js/auth.js` → `PageRouter`
3. Update navigation links

### Change Storage Backend

1. Modify `js/api.js` → `API.Articles` methods
2. Update server endpoints if needed
3. Test both modes (localStorage + server)

### Add New Article Fields

1. Update `StorageManager.saveArticle()` in `builder.js`
2. Update article schema in `server/server.js`
3. Update viewer to display new fields

## 📄 License

MIT

## 🙋 Support

For issues or questions, check:
- Browser console for errors
- Server logs (`server/server.js`)
- User data files (`server/users/`)

---

**Built with simplicity in mind** ✨
