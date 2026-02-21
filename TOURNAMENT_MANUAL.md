# RallyDesk Tournament Instruction Manual

## Quick Start Guide

This guide walks you through running a complete tournament from setup to final results.

---

## Phase 1: Tournament Setup

### Step 1: Create Tournament
1. Click **"New Tournament"** from the Dashboard
2. Enter tournament details:
   - **Name**: e.g., "Spring Championship 2025"
   - **Start Date**: When the tournament begins
   - **Venue** (optional): Location name
   - **Description** (optional): Additional details
3. Click **"Create Tournament"**

### Step 2: Configure Scoring Rules (Optional)
1. Go to your tournament → **Settings** tab
2. Click **"Edit Scoring Rules"**
3. For each sport, configure:
   - **Sets to Win**: Best of 3 = 2, Best of 5 = 3
   - **Points to Win Set**: e.g., 21 for badminton, 11 for table tennis
   - **Points Must Win By**: Usually 2
   - **Max Points Per Set**: Cap score (e.g., 30-29 max)
4. Click **"Save Scoring Rules"**

### Step 3: Add Resources (Courts/Tables)
1. Go to **Resources** tab
2. Click **"Add Resource"**
3. Select sport type and enter count
4. Resources are auto-named (Table 1, Table 2, etc.)
5. You can edit names later (e.g., "Court A", "Main Arena")

### Step 4: Create Divisions
1. Go to **Divisions** tab
2. Click **"Add Division"**
3. Create divisions like:
   - Men's Open
   - Women's Open
   - Mixed Doubles
   - Under 18
   - Veterans (40+)

### Step 5: Add Players
**Option A: Manual Entry**
1. Go to **Players** tab
2. Click **"Add Player"**
3. Enter player details and assign to a division

**Option B: CSV Import (Bulk)**
1. Go to **Players** tab
2. Click **"Import CSV"**
3. Upload a CSV file with columns:
   - `first_name`, `last_name`, `email`, `division` (optional), `team` (optional)
4. The system will auto-create divisions and teams from the CSV

---

## Phase 2: Create Competitions

### Step 1: Add Competition
1. Go to **Competitions** tab
2. Click **"Add Competition"**
3. Configure:
   - **Name**: e.g., "Men's Singles"
   - **Sport**: Select the sport
   - **Division**: Assign to a division
   - **Format**: 
     - Single Elimination (knockout)
     - Double Elimination
     - Round Robin
   - **Participant Type**:
     - Single (1v1)
     - Pair (doubles)
     - Team

### Step 2: Add Participants to Competition
1. Click **"Manage"** on your competition
2. Add players/teams from the available pool
3. Set **seed numbers** for top players (1 = highest seed)

### Step 3: Generate Draw
1. In the competition, click **"Generate Draw"**
2. Choose seeding method:
   - **Random**: Shuffles all participants
   - **By Rating**: Uses player ratings
   - **Manual Seeding**: Respects your seed numbers
3. Review the bracket
4. **Optional**: Swap participants by clicking and dragging

---

## Phase 3: Running the Tournament

### Control Desk (Recommended)
The Control Desk is your central hub for managing live matches.

1. Click **"Control Desk"** from tournament page
2. You'll see:
   - **Resources Panel**: Shows all courts/tables and their status
   - **Match Queue**: Pending matches waiting to be played
   - **Live Matches**: Currently ongoing matches

### Match Flow:

#### 1. Assign Match to Resource
- In the Match Queue, find the next match
- Select a resource from the dropdown
- Match status changes to **"Ready"**

#### 2. Start Match
- On the resource card, click **"Start Match"**
- Match status changes to **"Live"**
- The match appears in Live Matches section

#### 3. Enter Scores
- Click **"View Scoreboard"** on the live match
- Enter scores for each set using +/- buttons
- Or use the quick score buttons

#### 4. Complete Match
- Once all sets are played, click **"Complete Match"**
- System automatically:
  - Calculates the winner
  - Advances winner to next round
  - Frees up the resource

### Alternative: Digital Referee Scoring
For referees/umpires without system access:

1. From the match card, click **"Get Referee Code"**
2. A 6-digit code is generated
3. Referee visits `/referee` page and enters the code
4. Referee can update scores in real-time
5. Scores are marked as "Unofficial" until organizer approves

---

## Phase 4: Monitoring Progress

### Live Match Center (Public)
- URL: `/live` - No login required
- Shows all live matches across tournaments
- Auto-refreshes every 10 seconds
- Share this with spectators

### Public Board
- Click **"Public Board"** from tournament page
- Shows bracket/standings for spectators
- Displays on big screens at venue

### Standings
- Click **"Standings"** to see:
  - Current bracket visualization
  - Match results
  - Winner progression

---

## Phase 5: Completing Tournament

### Mark Competition Complete
1. Once all matches are played, competition auto-completes
2. Final standings are locked

### Export Results
- Download PDF score sheets from competition page
- Export player data as CSV

### Announce Winners
- Use the Standings page to display final results
- Public Board shows championship bracket

---

## Tips for Smooth Operations

### Before Tournament Day
- [ ] All players registered and assigned to divisions
- [ ] All competitions created with participants added
- [ ] Draws generated and reviewed
- [ ] Resources (courts/tables) set up in system
- [ ] Test the Control Desk workflow

### During Tournament
- [ ] Use Control Desk for match management
- [ ] Keep resources panel visible on a dedicated screen
- [ ] Assign matches as resources become available
- [ ] Monitor Live Match Center for progress

### Common Issues

**"No available resources"**
- Ensure resources are created for the correct sport
- Check if resources are locked or already in use

**Match won't start**
- Match must be assigned to a resource first
- Check that both participants are set

**Wrong score entered**
- Edit scores from the match scoreboard before completing
- Contact admin if match is already completed

---

## Role Permissions

| Action | Organizer | Moderator | Viewer |
|--------|-----------|-----------|--------|
| Create Tournament | ✅ Own | ❌ | ❌ |
| Edit Tournament | ✅ Own | ✅ Assigned | ❌ |
| Manage Players | ✅ | ✅ | ❌ |
| Assign Matches | ✅ | ✅ | ❌ |
| Enter Scores | ✅ | ✅ | ❌ |
| View Results | ✅ | ✅ | ✅ |

---

## Quick Reference

### Match Statuses
- **Pending**: Waiting for resource assignment
- **Scheduled**: Assigned to resource, ready to start
- **Live**: Match in progress
- **Completed**: Match finished, winner determined

### Resource Statuses
- **Available**: Ready for a match
- **Ready**: Match assigned, waiting to start
- **Live**: Match in progress
- **Locked**: Temporarily unavailable

### Keyboard Shortcuts (Scoreboard)
- `1` / `2`: Add point to Player 1 / Player 2
- `Space`: Swap service
- `Enter`: Complete set (if valid score)

---

## Support

For issues or questions:
1. Check the troubleshooting section in the deployment guide
2. Contact your tournament administrator
3. Visit the RallyDesk documentation

---

*RallyDesk - Professional Tournament Management Made Simple*
