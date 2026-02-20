# RallyDesk - Multi-Sport Tournament Platform

## Original Problem Statement
Build a multi-sport tournament operations platform named **RallyDesk** supporting:
- Sports: Table Tennis, Badminton, Volleyball, Tennis, Pickleball
- User Roles: Admin, Scorekeeper, Viewer
- Core Features: Tournament management, Players, Resources (courts/tables), Divisions, Competitions, Teams, Matches

## User Personas
1. **Admin** - Full access: Create tournaments, manage all data, assign roles
2. **Scorekeeper** - Can manage control desk, start/stop matches, enter scores
3. **Viewer** - Read-only access to tournament data, results, can manage own profile

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: JWT with bcrypt password hashing

## What's Been Implemented (February 2026)

### Core Infrastructure
- ✅ JWT Authentication (register, login, profile management)
- ✅ Role-based access control (viewer, scorekeeper, admin)
- ✅ MongoDB async integration with proper ObjectId handling

### Tournament Management
- ✅ Tournament CRUD with multi-sport support
- ✅ Tournament settings (rest time, buffer, match durations)
- ✅ Status tracking (draft, draw_generated, in_progress, completed)

### Player Management
- ✅ Player CRUD within tournaments
- ✅ CSV import/export for bulk player management
- ✅ Player stats (wins, losses, matches_played)

### Resource Management
- ✅ Resource CRUD (tables/courts)
- ✅ Bulk resource creation
- ✅ Resource locking/availability status

### Competition System
- ✅ Competition CRUD within tournaments
- ✅ Multiple formats: Round Robin, Single/Double Elimination, Groups+Knockout
- ✅ Participant management (singles, pairs, teams)
- ✅ Scoring rules configuration

### Draw Generation
- ✅ Round Robin draw generation
- ✅ Single Elimination bracket generation
- ✅ Double Elimination bracket generation
- ✅ Groups then Knockout format

### Match System
- ✅ Match creation from draws
- ✅ Match status tracking (pending, scheduled, live, completed)
- ✅ Set-based scoring
- ✅ Winner determination and bracket advancement

### Dashboard & Stats
- ✅ Global dashboard with tournament stats
- ✅ Tournament-specific statistics
- ✅ Control desk view for scorekeepers

### Frontend Pages
- ✅ Login/Register page
- ✅ Dashboard with stats cards
- ✅ Tournament listing with filters
- ✅ Tournament creation form
- ✅ Tournament detail with tabs (Competitions, Players, Resources, Settings)
- ✅ Players page
- ✅ Teams page
- ✅ Resources page
- ✅ Match scoreboard

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/admin/users/{user_id}/role` - Update user role (admin only)

### Tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments` - List tournaments
- `GET /api/tournaments/{id}` - Get tournament
- `PUT /api/tournaments/{id}` - Update tournament
- `DELETE /api/tournaments/{id}` - Delete tournament

### Players (scoped to tournament)
- `POST /api/tournaments/{id}/players` - Create player
- `GET /api/tournaments/{id}/players` - List players
- `GET /api/tournaments/{id}/players/{player_id}` - Get player
- `PUT /api/tournaments/{id}/players/{player_id}` - Update player
- `DELETE /api/tournaments/{id}/players/{player_id}` - Delete player
- `POST /api/tournaments/{id}/players/bulk-add` - Bulk add players
- `POST /api/tournaments/{id}/players/csv/upload` - CSV import

### Resources
- `POST /api/tournaments/{id}/resources` - Create resource
- `POST /api/tournaments/{id}/resources/bulk-add` - Bulk add resources
- `GET /api/tournaments/{id}/resources` - List resources
- `PUT /api/tournaments/{id}/resources/{rid}` - Update resource
- `DELETE /api/tournaments/{id}/resources/{rid}` - Delete resource

### Competitions
- `POST /api/tournaments/{id}/competitions` - Create competition
- `GET /api/tournaments/{id}/competitions` - List competitions
- `GET /api/tournaments/{id}/competitions/{cid}` - Get competition
- `PUT /api/tournaments/{id}/competitions/{cid}` - Update competition
- `DELETE /api/tournaments/{id}/competitions/{cid}` - Delete competition
- `POST /api/tournaments/{id}/competitions/{cid}/generate-draw` - Generate draw

### Dashboard
- `GET /api/stats/dashboard` - Global dashboard stats
- `GET /api/tournaments/{id}/stats` - Tournament stats

## Database Schema

### users
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string",
  "password_hash": "string",
  "role": "viewer|scorekeeper|admin",
  "created_at": "ISO datetime"
}
```

### tournaments
```json
{
  "id": "uuid",
  "name": "string",
  "venue": "string",
  "timezone": "string",
  "start_date": "ISO datetime",
  "end_date": "ISO datetime",
  "description": "string",
  "settings": {
    "min_rest_minutes": 10,
    "buffer_minutes": 5,
    "default_duration_minutes": {},
    "scorekeeper_can_assign": true
  },
  "status": "draft|draw_generated|in_progress|completed",
  "created_by": "user_id",
  "created_at": "ISO datetime"
}
```

### players
```json
{
  "id": "uuid",
  "tournament_id": "tournament_id",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "sports": ["table_tennis", "badminton"],
  "skill_level": "beginner|intermediate|advanced",
  "wins": 0,
  "losses": 0,
  "matches_played": 0
}
```

### competitions
```json
{
  "id": "uuid",
  "tournament_id": "tournament_id",
  "name": "string",
  "sport": "table_tennis",
  "format": "single_elimination",
  "participant_type": "single|pair|team",
  "scoring_rules": {},
  "status": "draft|draw_generated|in_progress|completed",
  "participant_ids": []
}
```

## Prioritized Backlog

### P0 (Critical) - COMPLETED ✅
- Core tournament CRUD
- Player management
- Resource management
- Competition system with draw generation
- Authentication and roles

### P1 (High Priority) - NEXT
- Social Logins (Google/Facebook) via `integration_playbook_expert_v2`
- Competition detail page with bracket visualization
- Match scoreboard for live scoring
- Control desk for scorekeepers

### P2 (Medium Priority)
- Standings calculation and display
- Data export (CSV/JSON)
- Tournament templates
- Player profile pages with match history

### P3 (Low Priority)
- Email notifications
- Public board (read-only live view)
- Advanced scheduling algorithms
- Tournament seeding options

## Test Reports
- Backend tests: `/app/backend/tests/test_rallydesk_api.py`
- Test results: `/app/test_reports/iteration_1.json`
- All 24 backend tests passing
- All frontend UI flows working

## Credentials
- Admin user: `admin` / `admin123`
