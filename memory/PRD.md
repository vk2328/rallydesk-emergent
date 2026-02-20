# RallyDesk - Multi-Sport Tournament Operations Platform

## Original Problem Statement
Build a multi-sport tournament operations platform named **RallyDesk** supporting sports like table tennis, badminton, volleyball, tennis, and pickleball.

## User Personas
- **Admin**: Manages all aspects of tournaments
- **Scorekeeper**: Manages control desk and match scores
- **Viewer**: Views tournament data
- **Public**: Read-only access to live match information (no login required)

## Core Requirements
- User Roles: Admin, Scorekeeper, Viewer
- Authentication: Username/password + Social logins (Google - DONE, Facebook - PENDING)
- Core Entities: Tournaments, Players, Resources, Divisions, Competitions, Teams, Matches
- Competition Formats: Round-robin, Single Elimination, Groups then Knockout

---

## What's Been Implemented

### Core Features (COMPLETE)
- [x] User Registration & Login (JWT authentication)
- [x] Dashboard with statistics
- [x] Tournament CRUD operations
- [x] Competition CRUD with different formats
- [x] Player & Resource Management within tournaments
- [x] Teams Management
- [x] Draw Generation (bracket display for different formats)
- [x] Match Scoreboard for live scoring
- [x] Control Desk for scorekeepers to assign matches
- [x] Public Board for tournament-specific live info
- [x] Live Match Center (public dashboard, no login required)
- [x] Google OAuth Integration

### Draw Management (COMPLETE - Dec 2024)
- [x] Automatic Draw Generation with seeding options:
  - Random seeding (default)
  - Rating-based seeding (seeds by player rating)
  - Manual seeding (drag-to-reorder seed positions)
- [x] Edit Bracket Mode for manual adjustments:
  - Click matches to select and swap participants
  - Checkmark buttons to manually advance winners
  - Visual indicators for selected matches
- [x] Bracket progression from round 1 through finals
- [x] Auto-advance for bye matches
- [x] Proper seeded bracket order (1 vs last, 2 vs second-last, etc.)

### Division Management (COMPLETE - Dec 2024)
- [x] Division CRUD - Create, list, delete custom divisions (Open, Men's, Women's, Mixed, U18, etc.)
- [x] Players assigned to divisions (division_id field)
- [x] Division filter on Players tab
- [x] Division selection when adding players manually
- [x] Division badge displayed on player cards

### CSV Player Import (COMPLETE - Dec 2024)
- [x] Enhanced CSV template with team, division, sports columns
- [x] Default division selector on import page
- [x] **Team Auto-Creation**: If CSV has 'team' column, teams are automatically created
- [x] **Division Auto-Creation**: If CSV has 'division' column, divisions are auto-created
- [x] Import result shows: players created, teams created, divisions created
- [x] Format guide explaining all columns and auto-creation behavior

### Landing Page (COMPLETE - Dec 2024)
- [x] Hero section with main value proposition
- [x] 5-step flow diagram showing tournament workflow
- [x] Three role cards (Organizers, Scorekeepers, Spectators)
- [x] 6 feature cards highlighting key capabilities
- [x] Call-to-action section with gradient styling
- [x] Footer with branding and sport icons
- [x] Theme toggle in navigation
- [x] Responsive design

### UI/UX Enhancements (COMPLETE - Dec 2024)
- [x] Dark/Light Theme Toggle
  - ThemeContext.js with localStorage persistence
  - Theme toggle button in header (Sun/Moon icons)
  - Light mode CSS variables in index.css
  - System preference detection

### Global Views (COMPLETE)
- [x] Global Players page (/players)
- [x] Global Resources page (/resources)
- [x] Global Teams page (/teams)

---

## Prioritized Backlog

### P1 - High Priority
1. **Facebook Login Integration**
   - Required by PRD
   - Needs `integration_playbook_expert_v2` subagent

### P2 - Medium Priority
2. **Data Export Functionality**
   - Export tournament results to CSV/JSON
   - Export player data

3. **Player Profiles & Match History**
   - Public player profile pages
   - Stats and match history across tournaments

---

## Technical Architecture

### Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, Pydantic, Python
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth

### Key API Endpoints
- `/api/tournaments/{id}/divisions` - Division CRUD
- `/api/tournaments/{id}/players?division_id={id}` - Filter players by division
- `/api/tournaments/{id}/players/csv/upload?division_id={id}` - CSV import with default division
- `/api/leaderboard/{sport}` - Sport-specific leaderboard rankings (added Feb 2025)

### Database Schema Updates
- **players** collection: Added `division_id` field
- **divisions** collection: `{id, tournament_id, name, description, eligibility, created_at}`

---

## Test Reports
- `/app/test_reports/iteration_1.json`
- `/app/test_reports/iteration_2.json`
- `/app/test_reports/iteration_3.json` - Division & CSV import tests (100% pass rate)

## Bug Fixes & Enhancements (Feb 2025)
- **Leaderboard API Missing**: Added `/api/leaderboard/{sport}` endpoint.
- **Division Selection for Competitions**: Added division dropdown to "Create Competition" dialog.
- **CORS Fix**: Moved CORS middleware to proper position for production deployment.
- **Enhanced Registration**: Added First Name, Last Name, Phone Number fields.
- **Email Verification with Mailjet**: Full email verification flow implemented.
- **Dashboard Sports Cards**: Added all 5 supported sports to dashboard.
- **Theme Contrast Fix**: Improved button contrast for dark/light themes.

## Email Verification (Feb 2025) - COMPLETE
- **Mailjet Integration**: Professional HTML email templates for verification
- **6-digit verification codes**: Generated on registration and resend
- **Dashboard verification banner**: Prominent amber banner prompts unverified users
- **Verification modal**: Clean UI for entering codes with resend option
- **Fallback for dev**: Codes logged when Mailjet not configured
- API endpoints:
  - `POST /api/auth/register` - Creates user, sends verification email
  - `POST /api/auth/verify-email` - Verifies code and updates user status
  - `POST /api/auth/resend-verification` - Generates and sends new code
- Backend: `/app/backend/services/email_service.py` - Mailjet email service
- Required env vars: `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE`, `MJ_FROM_EMAIL`, `EMAIL_FROM_NAME`

## Facebook OAuth (Feb 2025) - COMPLETE
- **Backend endpoint**: `POST /api/auth/facebook/callback`
- **Validates Facebook tokens with Graph API**
- **Creates/links user accounts automatically**
- **Frontend**: Facebook SDK integration with login button on Login/Register pages
- **Conditional display**: Button only shows when `REACT_APP_FACEBOOK_APP_ID` is configured
- **Required setup**:
  1. Create Facebook App at developers.facebook.com
  2. Configure OAuth redirect URIs
  3. Set `REACT_APP_FACEBOOK_APP_ID` in frontend/.env
- Users who login with Facebook have email_verified set to true automatically

## SaaS Multi-Tenant Model (Feb 2025)
- **Anyone can create tournaments** - no global admin required
- **Tournament isolation** - users only see their own tournaments
- **Moderator system** - tournament owners can assign moderators
- API endpoints: `/api/tournaments/{id}/moderators`, `/api/users/search`
- Removed global role-based permissions in favor of per-tournament access

## Configurable Scoring Rules (Feb 2025)
- **Per-tournament, per-sport scoring rules**
- Configure: Sets to win, Points per set, Win by margin, Max points cap
- Default rules for all 5 sports (can be customized per tournament)
- API endpoints: `/api/tournaments/{id}/scoring-rules`, `/api/tournaments/{id}/scoring-rules/{sport}`
- Frontend UI in Tournament Settings tab with Edit dialog

## Digital Referee Scoring (Feb 2025)
- **QR Code + OTP Access** - Generate referee access codes for matches
- Referees can update scores via mobile-friendly interface (no login required)
- Scores marked as "pending" until organizer confirms
- **Live score indicator** - Shows "UNOFFICIAL" badge when awaiting confirmation
- API endpoints: 
  - `POST /api/tournaments/{id}/matches/{matchId}/referee-access` - Generate QR/OTP
  - `POST /api/referee/score/{tournamentId}/{matchId}` - Referee submits score
  - `POST /api/tournaments/{id}/matches/{matchId}/confirm-score` - Organizer confirms
- Frontend: `/referee/{tournamentId}/{matchId}?code=XXXXXX`

## PDF Score Sheet Generation (Feb 2025)
- **Download printable score sheets** for competitions
- Includes all matches grouped by round
- Empty placeholders for playoff matches (TBD / Winner of...)
- Shows: Match #, Player names, Set score boxes, Winner, Referee signature
- API endpoint: `GET /api/tournaments/{id}/competitions/{compId}/score-sheet-pdf`

## Project Health
Application is stable. SaaS multi-tenant model implemented Feb 2025.
Configurable scoring rules, digital referee scoring, and PDF generation added Feb 2025.
Email verification with Mailjet integration complete Feb 2025.
