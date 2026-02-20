# RallyDesk - Multi-Sport Tournament Operations Platform

🌐 **Live at:** [https://rallydesk.app](https://rallydesk.app)

A comprehensive tournament management platform supporting Table Tennis, Badminton, Volleyball, Tennis, and Pickleball.

## Features

### Core Features
- **Multi-Sport Support**: 5 racquet/net sports in one platform
- **Division Management**: Create custom divisions (Open, Men's, Women's, Mixed, U18, etc.)
- **Player Management**: Manual entry or CSV bulk import with automatic team creation
- **Draw Generation**: Random, rating-based, or manual seeding with bracket editing
- **Live Scoring**: Real-time match scoreboard with public display
- **Public Live Match Center**: No login required for spectators

### Tournament Management
- **Configurable Scoring Rules**: Customize sets and points per sport
- **Digital Referee Scoring**: Referees can update scores via QR code/OTP access
- **PDF Score Sheets**: Generate printable score sheets for all matches
- **Moderator Management**: Assign co-organizers to help manage tournaments

### Authentication & User Management
- **Multiple Login Options**: Email/password, Google OAuth, Facebook OAuth
- **Email Verification**: Mailjet-powered verification with professional emails
- **Role-Based Access**: Organizers manage their own tournaments
- **Dark/Light Theme**: User-selectable theme

## Tech Stack

- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth + Facebook OAuth
- **Email**: Mailjet (for verification emails)

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=rallydesk
JWT_SECRET=your-secret-key-here-minimum-32-characters
CORS_ORIGINS=http://localhost:3000

# Optional: Mailjet for email verification
MJ_APIKEY_PUBLIC=your-mailjet-public-key
MJ_APIKEY_PRIVATE=your-mailjet-private-key
MJ_FROM_EMAIL=noreply@yourdomain.com
EMAIL_FROM_NAME=Rally Desk
EOF

# Run server
uvicorn server:app --reload --port 8001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001

# Optional: Facebook OAuth
REACT_APP_FACEBOOK_APP_ID=your-facebook-app-id
EOF

# Run development server
yarn start
```

### Access the App
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

## Project Structure

```
/app
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   │   └── ui/       # Shadcn UI components
│   │   ├── context/       # React contexts
│   │   └── lib/          # Utilities
│   ├── package.json
│   └── .env
├── render.yaml            # Render deployment config
├── RENDER_DEPLOYMENT.md   # Deployment guide
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Verify email with code
- `POST /api/auth/resend-verification` - Resend verification code
- `POST /api/auth/google/session` - Google OAuth session
- `POST /api/auth/facebook/callback` - Facebook OAuth callback

### Tournaments
- `GET /api/tournaments` - List tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/{id}` - Get tournament
- `PUT /api/tournaments/{id}` - Update tournament
- `DELETE /api/tournaments/{id}` - Delete tournament
- `PUT /api/tournaments/{id}/scoring-rules` - Update scoring rules
- `GET /api/tournaments/{id}/moderators` - List moderators
- `POST /api/tournaments/{id}/moderators` - Add/remove moderator

### Divisions
- `GET /api/tournaments/{id}/divisions` - List divisions
- `POST /api/tournaments/{id}/divisions` - Create division
- `DELETE /api/tournaments/{id}/divisions/{divId}` - Delete division

### Players
- `GET /api/tournaments/{id}/players` - List players
- `POST /api/tournaments/{id}/players` - Add player
- `POST /api/tournaments/{id}/players/csv/upload` - CSV import

### Competitions
- `GET /api/tournaments/{id}/competitions` - List competitions
- `POST /api/tournaments/{id}/competitions` - Create competition
- `POST /api/tournaments/{id}/competitions/{cid}/generate-draw-advanced` - Generate draw
- `GET /api/tournaments/{id}/competitions/{cid}/score-sheet-pdf` - Download PDF score sheet

### Matches & Referee Scoring
- `GET /api/tournaments/{id}/matches` - List matches
- `PUT /api/tournaments/{id}/matches/{mid}/update-score` - Update score
- `POST /api/tournaments/{id}/matches/{mid}/generate-referee-access` - Generate referee access code
- `POST /api/referee/verify-access` - Verify referee code
- `GET /api/referee/{tournamentId}/{matchId}` - Get match info for referee
- `POST /api/referee/{tournamentId}/{matchId}/update-score` - Submit referee score

### Public (No Auth)
- `GET /api/stats/live-match-center` - Live matches data
- `GET /api/health` - Health check

## Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| MONGO_URL | MongoDB connection string | Yes |
| DB_NAME | Database name | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| CORS_ORIGINS | Allowed origins | Yes |
| GOOGLE_CLIENT_ID | Google OAuth client ID | No |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | No |
| MJ_APIKEY_PUBLIC | Mailjet public API key | No |
| MJ_APIKEY_PRIVATE | Mailjet private API key | No |
| MJ_FROM_EMAIL | Sender email address | No |
| EMAIL_FROM_NAME | Sender display name | No |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| REACT_APP_BACKEND_URL | Backend API URL | Yes |
| REACT_APP_FACEBOOK_APP_ID | Facebook App ID for OAuth | No |

## Deployment

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed deployment instructions on Render.

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://rallydesk.app |
| Frontend (www) | https://www.rallydesk.app |
| Backend API | https://api.rallydesk.app |

### Quick Deploy (Free)
1. Push to GitHub
2. Create MongoDB Atlas free cluster
3. Deploy backend on Render (Web Service)
4. Deploy frontend on Render (Static Site)
5. Configure environment variables
6. Add custom domain (see RENDER_DEPLOYMENT.md)

## User Roles

| Role | Permissions |
|------|-------------|
| Admin | Full access - manage tournaments, players, draws |
| Scorekeeper | Update match scores, manage control desk |
| Viewer | View tournaments, matches, standings |
| Public | View live match center (no login) |

## CSV Import Format

```csv
firstName,lastName,email,phone,gender,skillLevel,sports,rating,team,division,club
John,Smith,john@example.com,+1234567890,male,intermediate,table_tennis,1500,Team Alpha,Open,City Club
```

- **team**: Auto-creates team if not exists
- **division**: Auto-creates division if not exists

## License

MIT License

## Support

For issues or questions, please open a GitHub issue.
