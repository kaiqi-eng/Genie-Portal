# LLM Chat Portal

A web portal for accessing a custom LLM model with Google OAuth authentication and an admin dashboard for user management.

## Features

- **Claude-style Chat Interface**: Clean, modern chat UI with markdown rendering, conversation history, and real-time messaging
- **Google OAuth Authentication**: Secure sign-in with Google accounts
- **Whitelist-based Authorization**: Only approved users can access the chat
- **Admin Dashboard**: Manage users, approve/revoke access, promote/demote admins
- **Persistent Chat History**: Conversations and messages stored in PostgreSQL
- **First User Auto-Admin**: The first user to sign in becomes the administrator

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express, Passport.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: Google OAuth 2.0

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+ (or Docker)
- Google Cloud Console project with OAuth 2.0 credentials

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/llm-chat-portal.git
cd llm-chat-portal
```

### 2. Start PostgreSQL

Using Docker:
```bash
docker-compose up -d
```

Or use your local PostgreSQL installation.

### 3. Configure environment variables

```bash
# Copy the example env file
cp server/.env.example server/.env

# Edit with your values
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `SESSION_SECRET`: A random secret string

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### 5. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 6. Start the application

```bash
# Terminal 1 - Start the server
cd server
npm run dev

# Terminal 2 - Start the client
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
web portal/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Admin/      # Admin dashboard components
│   │   │   ├── Auth/       # Authentication components
│   │   │   └── Chat/       # Chat interface components
│   │   ├── context/        # React context providers
│   │   ├── pages/          # Page components
│   │   └── services/       # API service functions
│   └── ...
├── server/                 # Node.js Backend
│   └── src/
│       ├── config/         # Database and passport config
│       ├── middleware/     # Express middleware
│       ├── models/         # Sequelize models
│       ├── routes/         # API routes
│       └── services/       # Business logic services
└── docker-compose.yml      # PostgreSQL setup
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Chat
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat/conversations/:id/messages` - Send message
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Admin
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/approve` - Approve user
- `PATCH /api/admin/users/:id/revoke` - Revoke access
- `PATCH /api/admin/users/:id/promote` - Promote to admin
- `PATCH /api/admin/users/:id/demote` - Demote from admin
- `DELETE /api/admin/users/:id` - Delete user

## LLM Integration

The application uses placeholder endpoints for the LLM service. To connect your actual LLM:

1. Edit `server/src/services/llmService.js`
2. Update `LLM_PROMPT_URL` and `LLM_RESPONSE_URL` with your endpoints
3. Adjust the request/response format as needed

Expected format:
```javascript
// Request
{
  "user_id": "verified_user_001",
  "message": "Your message here",
  "timestamp": "2026-02-03T00:01:00Z"
}

// Response
{
  "status": "success",
  "reply": "LLM response here",
  "timestamp": "2026-02-03T00:01:01Z",
  "session_id": "abc123xyz"
}
```

## License

MIT
