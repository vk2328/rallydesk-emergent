# RallyDesk - Multi-Sport Tournament Platform

## Original Problem Statement
Build a multi-sport tournament operations platform named **RallyDesk** supporting:
- Sports: Table Tennis, Badminton, Volleyball, Tennis, Pickleball
- User Roles: Admin, Scorekeeper, Viewer
- Core Features: Tournament management, Players, Resources (courts/tables), Divisions, Competitions, Teams, Matches
- Authentication: Standard username/password AND Google OAuth social login
- Public Board: Read-only spectator view

## What's Been Implemented (February 2026)

### ✅ Live Match Center (NEW - Public)
- **No authentication required**
- Real-time scores across ALL tournaments
- Stats: Live Now, Upcoming, Completed Today, Active Tournaments
- **Live Matches Grid** with:
  - Tournament & competition names
  - Player names and set scores
  - Current set score (if in progress)
  - Link to tournament board
- **Coming Up Next** - Pending matches queue
- **Recent Results** - Completed matches
- Auto-refresh every 5 seconds
- Default landing page (`/live`)

### ✅ Core Infrastructure
- JWT Authentication (register, login, profile management)
- **Google OAuth Social Login** via Emergent Auth
- Role-based access control (viewer, scorekeeper, admin)
- MongoDB async integration with proper ObjectId handling

### ✅ Tournament Management
- Tournament CRUD with multi-sport support
- Tournament settings (rest time, buffer, match durations)
- Status tracking (draft, draw_generated, in_progress, completed)
- **Quick Action Buttons**: Control Desk, Standings, Public Board

### ✅ Player Management
- Player CRUD within tournaments
- **CSV Import/Export** for bulk player management
- Player stats (wins, losses, matches_played)

### ✅ Resource Management
- Resource CRUD (tables/courts)
- Bulk resource creation
- Resource locking/availability status
- Real-time status tracking (Available, In Use, Locked)

### ✅ Competition System
- Competition CRUD within tournaments
- Multiple formats: Round Robin, Single/Double Elimination, Groups+Knockout
- **Bracket Visualization** with rounds and match cards
- **Participant Management** - Add/remove participants
- **Draw Generation** with automatic bracket creation
- Scoring rules configuration

### ✅ Match System
- Match creation from draws
- Match status tracking (pending, scheduled, live, completed)
- **Live Match Scoreboard** with:
  - Set-by-set scoring
  - Score increment/decrement buttons
  - Set history tracking
  - Winner determination
  - Bracket advancement

### ✅ Control Desk (Scorekeeper Interface)
- **Real-time Dashboard** showing:
  - Live matches count
  - Pending matches queue
  - Available resources
  - Total matches
- **Match Assignment** - Assign pending matches to available resources
- Sport filter
- Auto-refresh every 30 seconds

### ✅ Public Board (Spectator View)
- **No authentication required**
- Tournament info (name, venue)
- Real-time resource status (Free, In Use, Locked)
- Recent results display
- "No Matches Currently Live" state
- Auto-refresh every 10 seconds

### ✅ Standings & Leaderboard
- Competition standings with:
  - Played, Won, Lost counts
  - Sets Won/Lost
  - Points scored
  - Standing points (2 for win)
- Trophy/Medal icons for top 3
- Competition selector

### ✅ Dashboard & Stats
- Global dashboard with tournament stats
- Tournament-specific statistics
- Sport breakdown
- Recent tournaments

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: JWT + Google OAuth via Emergent Auth

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/google/session` - **Google OAuth callback**
- `POST /api/auth/logout` - Clear session
- `PUT /api/admin/users/{user_id}/role` - Update user role (admin only)

### Tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments` - List tournaments
- `GET /api/tournaments/{id}` - Get tournament
- `PUT /api/tournaments/{id}` - Update tournament
- `DELETE /api/tournaments/{id}` - Delete tournament
- `GET /api/tournaments/{id}/public-board` - **Public board data (no auth)**

### Players (scoped to tournament)
- `POST /api/tournaments/{id}/players` - Create player
- `GET /api/tournaments/{id}/players` - List players
- `POST /api/tournaments/{id}/players/bulk-add` - Bulk add players
- `POST /api/tournaments/{id}/players/csv/upload` - **CSV import**
- `DELETE /api/tournaments/{id}/players/{player_id}` - Delete player

### Resources
- `POST /api/tournaments/{id}/resources` - Create resource
- `POST /api/tournaments/{id}/resources/bulk-add` - Bulk add resources
- `GET /api/tournaments/{id}/resources` - List resources
- `DELETE /api/tournaments/{id}/resources/{rid}` - Delete resource

### Competitions
- `POST /api/tournaments/{id}/competitions` - Create competition
- `GET /api/tournaments/{id}/competitions` - List competitions
- `GET /api/tournaments/{id}/competitions/{cid}` - Get competition
- `POST /api/tournaments/{id}/competitions/{cid}/generate-draw` - **Generate draw**
- `POST /api/tournaments/{id}/competitions/{cid}/reset-draw` - Reset draw
- `GET /api/tournaments/{id}/competitions/{cid}/participants` - Get participants
- `POST /api/tournaments/{id}/competitions/{cid}/participants/bulk` - Add participants
- `GET /api/tournaments/{id}/competitions/{cid}/matches` - Get matches
- `GET /api/tournaments/{id}/competitions/{cid}/standings` - **Get standings**

### Matches
- `GET /api/tournaments/{id}/matches/{mid}` - Get match
- `PUT /api/tournaments/{id}/matches/{mid}` - **Update match scores**
- `POST /api/tournaments/{id}/matches/{mid}/assign` - Assign to resource
- `POST /api/tournaments/{id}/matches/{mid}/start` - Start match

### Dashboard
- `GET /api/stats/dashboard` - Global dashboard stats
- `GET /api/tournaments/{id}/stats` - Tournament stats

## Frontend Routes

```
/live                                       - LIVE MATCH CENTER (public, no auth)
/login                                      - Login page with Google OAuth
/dashboard                                  - Main dashboard
/tournaments                                - Tournament listing
/tournaments/new                            - Create tournament
/tournaments/:id                            - Tournament detail with tabs
/tournaments/:id/competitions/:cid          - Competition detail (bracket/participants/matches)
/tournaments/:id/matches/:mid               - Match scoreboard
/tournaments/:id/control-desk               - Scorekeeper control desk
/tournaments/:id/standings                  - Competition standings
/tournaments/:id/import-players             - CSV player import
/tournaments/:id/board                      - Public spectator board (no auth)
/players                                    - Global players view
/teams                                      - Teams management
/resources                                  - Resources overview
/leaderboard/:sport                         - Sport leaderboard
```

## Prioritized Backlog

### P0 (Critical) - COMPLETED ✅
- Core tournament CRUD
- Player management with CSV import
- Resource management
- Competition system with draw generation
- Match scoreboard with live scoring
- Control desk for scorekeepers
- Public board for spectators
- Standings & leaderboard
- Authentication (JWT + Google OAuth)

### P1 (High Priority) - FUTURE
- Facebook OAuth login
- Email notifications (match start, results)
- Tournament templates
- Player profile pages with match history
- Advanced scheduling algorithms

### P2 (Medium Priority) - FUTURE
- Data export (CSV/JSON for results)
- Tournament seeding options
- Team management improvements
- Multi-language support

### P3 (Low Priority) - FUTURE
- Mobile-responsive optimization
- Dark/Light theme toggle
- Tournament cloning
- Historical statistics

## Test Reports
- Backend tests: `/app/backend/tests/test_rallydesk_api.py`, `/app/backend/tests/test_rallydesk_new_features.py`
- Test results: `/app/test_reports/iteration_2.json`
- Backend: 16/16 tests passed
- Frontend: 11/11 UI tests passed

## Credentials
- Admin user: `admin` / `admin123`
- Google OAuth: Click "Continue with Google" on login page
