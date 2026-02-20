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

## Bug Fixes (Feb 2025)
- **Leaderboard API Missing**: Added `/api/leaderboard/{sport}` endpoint. The frontend page existed but backend API was missing, causing "Failed to fetch leaderboard" error.

## Project Health
Application is stable. All division features tested and working as of Dec 2024.
Leaderboard bug fixed Feb 2025.
