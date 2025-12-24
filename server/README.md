# Article Platform Server

Simple Node.js server for the multi-user article platform.

## Features

- JWT-based authentication
- File-based JSON storage (no database needed)
- Each user gets their own directory with `data.json` and `auth.json`
- CORS enabled for local development

## Setup

```bash
cd server
npm start
```

Server will run on `http://localhost:3000`

## Configuration

Edit `js/config.js` to switch between storage modes:

```javascript
const CONFIG = {
  storage: 'server',  // Use 'localStorage' for offline mode
  api: {
    endpoint: 'http://localhost:3000/api'
  }
}
```

## Storage Structure

```
server/
└── users/
    ├── alice/
    │   ├── auth.json      # Login credentials
    │   └── data.json      # User's articles
    └── bob/
        ├── auth.json
        └── data.json
```

## API Endpoints

- `POST /api/auth/login` - Login user
- `POST /api/auth/signup` - Create new user
- `GET /api/articles/:username` - Get user's articles (public)
- `POST /api/articles/:username` - Save article (requires auth)
- `DELETE /api/articles/:username/:id` - Delete article (requires auth)

## Security Notes

⚠️ This is a simple development server. For production:

1. Use a proper database (MongoDB, PostgreSQL, etc.)
2. Use environment variables for secrets
3. Implement rate limiting
4. Add input validation/sanitization
5. Use HTTPS
6. Implement proper session management
