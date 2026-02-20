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

### UI/UX Enhancements (COMPLETE - Dec 2024)
- [x] Dark/Light Theme Toggle - Added Dec 2024
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
   
2. **CSV Player Import Frontend**
   - Backend API exists
   - UI page exists (PlayerImport.jsx)
   - Needs file upload form integration

### P2 - Medium Priority
3. **Data Export Functionality**
   - Export tournament results to CSV/JSON
   - Export player data

4. **Player Profiles & Match History**
   - Public player profile pages
   - Stats and match history across tournaments

---

## Technical Architecture

### Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, Pydantic, Python
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth

### Key Files
- `/app/frontend/src/context/ThemeContext.js` - Theme management
- `/app/frontend/src/components/Layout.jsx` - Main layout with theme toggle
- `/app/frontend/src/index.css` - CSS variables for dark/light modes
- `/app/backend/server.py` - Main API server
- `/app/backend/routers/auth.py` - Authentication routes

### API Endpoints
- `/api/auth/*` - Authentication
- `/api/tournaments/*` - Tournament management
- `/api/players/` - Global players
- `/api/resources/` - Global resources
- `/api/teams/` - Global teams
- `/api/stats/live-match-center` - Public live match data

---

## Test Reports
- `/app/test_reports/iteration_1.json`
- `/app/test_reports/iteration_2.json`

## Project Health
Application is stable with all core features working. Theme toggle verified working on Dec 2024.
