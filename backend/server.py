from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import csv
import io
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import math
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'arena-sports-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

# Create the main app
app = FastAPI(title="RallyDesk - Sports Tournament Management")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PlayerCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None  # male, female, other
    age: Optional[int] = None
    skill_level: Optional[str] = "intermediate"  # beginner, intermediate, advanced, pro
    sport: str  # table_tennis, badminton
    team: Optional[str] = None

class PlayerResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    skill_level: str
    sport: str
    team: Optional[str] = None
    wins: int = 0
    losses: int = 0
    matches_played: int = 0
    created_at: str

class TeamCreate(BaseModel):
    name: str
    sport: str
    player_ids: List[str]

class TeamResponse(BaseModel):
    id: str
    name: str
    sport: str
    player_ids: List[str]
    players: Optional[List[dict]] = None
    wins: int = 0
    losses: int = 0
    created_at: str

class ResourceCreate(BaseModel):
    name: str
    resource_type: str  # table, court
    sport: str  # table_tennis, badminton
    location: Optional[str] = None
    status: str = "available"  # available, in_use, maintenance

class ResourceResponse(BaseModel):
    id: str
    name: str
    resource_type: str
    sport: str
    location: Optional[str] = None
    status: str
    created_at: str

class TournamentCreate(BaseModel):
    name: str
    sport: str  # table_tennis, badminton
    format: str  # single_elimination, double_elimination, round_robin
    match_type: str  # singles, doubles
    start_date: str
    end_date: Optional[str] = None
    max_participants: int = 32
    description: Optional[str] = None
    sets_to_win: int = 3
    points_per_set: int = 11

class TournamentResponse(BaseModel):
    id: str
    name: str
    sport: str
    format: str
    match_type: str
    start_date: str
    end_date: Optional[str] = None
    max_participants: int
    description: Optional[str] = None
    status: str  # draft, registration, in_progress, completed
    participant_ids: List[str] = []
    sets_to_win: int
    points_per_set: int
    created_at: str

class MatchCreate(BaseModel):
    tournament_id: str
    round_number: int
    match_number: int
    participant1_id: Optional[str] = None
    participant2_id: Optional[str] = None
    resource_id: Optional[str] = None
    scheduled_time: Optional[str] = None

class SetScore(BaseModel):
    set_number: int
    participant1_score: int
    participant2_score: int

class MatchUpdate(BaseModel):
    winner_id: Optional[str] = None
    status: Optional[str] = None
    scores: Optional[List[SetScore]] = None
    current_set: Optional[int] = None

class MatchResponse(BaseModel):
    id: str
    tournament_id: str
    round_number: int
    match_number: int
    participant1_id: Optional[str] = None
    participant2_id: Optional[str] = None
    participant1: Optional[dict] = None
    participant2: Optional[dict] = None
    winner_id: Optional[str] = None
    resource_id: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: str  # pending, in_progress, completed
    scores: List[dict] = []
    current_set: int = 1
    bracket_position: Optional[str] = None
    next_match_id: Optional[str] = None
    created_at: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ============== PLAYER ROUTES ==============

@api_router.post("/players", response_model=PlayerResponse)
async def create_player(player: PlayerCreate, current_user: dict = Depends(get_current_user)):
    player_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    player_doc = {
        "id": player_id,
        "first_name": player.first_name,
        "last_name": player.last_name,
        "email": player.email,
        "phone": player.phone,
        "gender": player.gender,
        "age": player.age,
        "skill_level": player.skill_level,
        "sport": player.sport,
        "team": player.team,
        "wins": 0,
        "losses": 0,
        "matches_played": 0,
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.players.insert_one(player_doc)
    return PlayerResponse(**{k: v for k, v in player_doc.items() if k != "created_by"})

@api_router.get("/players", response_model=List[PlayerResponse])
async def get_players(sport: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if sport:
        query["sport"] = sport
    players = await db.players.find(query, {"_id": 0, "created_by": 0}).to_list(1000)
    return [PlayerResponse(**p) for p in players]

@api_router.get("/players/{player_id}", response_model=PlayerResponse)
async def get_player(player_id: str, current_user: dict = Depends(get_current_user)):
    player = await db.players.find_one({"id": player_id}, {"_id": 0, "created_by": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return PlayerResponse(**player)

@api_router.put("/players/{player_id}", response_model=PlayerResponse)
async def update_player(player_id: str, player: PlayerCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.players.find_one({"id": player_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Player not found")
    
    update_data = player.model_dump(exclude_unset=True)
    await db.players.update_one({"id": player_id}, {"$set": update_data})
    updated = await db.players.find_one({"id": player_id}, {"_id": 0, "created_by": 0})
    return PlayerResponse(**updated)

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.players.delete_one({"id": player_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"message": "Player deleted"}

@api_router.get("/players/csv/sample")
async def download_sample_csv():
    """Download a sample CSV file for player import"""
    sample_data = [
        ["name", "email", "phone", "sport", "skill_level"],
        ["John Smith", "john@example.com", "+1234567890", "table_tennis", "intermediate"],
        ["Jane Doe", "jane@example.com", "+0987654321", "badminton", "advanced"],
        ["Mike Johnson", "mike@example.com", "", "table_tennis", "beginner"],
        ["Sarah Wilson", "sarah@example.com", "+1122334455", "badminton", "pro"],
    ]
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(sample_data)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=players_sample.csv"}
    )

@api_router.post("/players/csv/upload")
async def upload_players_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload players from a CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    skipped_count = 0
    errors = []
    
    valid_sports = ['table_tennis', 'badminton']
    valid_skills = ['beginner', 'intermediate', 'advanced', 'pro']
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            name = row.get('name', '').strip()
            email = row.get('email', '').strip() or None
            phone = row.get('phone', '').strip() or None
            sport = row.get('sport', '').strip().lower()
            skill_level = row.get('skill_level', 'intermediate').strip().lower()
            
            if not name:
                errors.append(f"Row {row_num}: Name is required")
                skipped_count += 1
                continue
            
            if sport not in valid_sports:
                errors.append(f"Row {row_num}: Invalid sport '{sport}'. Use 'table_tennis' or 'badminton'")
                skipped_count += 1
                continue
            
            if skill_level not in valid_skills:
                skill_level = 'intermediate'
            
            # Check for duplicate by name and sport
            existing = await db.players.find_one({"name": name, "sport": sport})
            if existing:
                errors.append(f"Row {row_num}: Player '{name}' already exists for {sport}")
                skipped_count += 1
                continue
            
            player_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            player_doc = {
                "id": player_id,
                "name": name,
                "email": email,
                "phone": phone,
                "sport": sport,
                "skill_level": skill_level,
                "wins": 0,
                "losses": 0,
                "matches_played": 0,
                "created_by": current_user["id"],
                "created_at": now
            }
            await db.players.insert_one(player_doc)
            created_count += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped_count += 1
    
    return {
        "message": f"CSV import completed",
        "created": created_count,
        "skipped": skipped_count,
        "errors": errors[:10] if errors else []  # Return first 10 errors
    }

# ============== TEAM ROUTES ==============

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(team: TeamCreate, current_user: dict = Depends(get_current_user)):
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    team_doc = {
        "id": team_id,
        "name": team.name,
        "sport": team.sport,
        "player_ids": team.player_ids,
        "wins": 0,
        "losses": 0,
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.teams.insert_one(team_doc)
    
    # Fetch player details
    players = await db.players.find({"id": {"$in": team.player_ids}}, {"_id": 0, "name": 1, "id": 1}).to_list(10)
    
    return TeamResponse(
        id=team_id,
        name=team.name,
        sport=team.sport,
        player_ids=team.player_ids,
        players=players,
        wins=0,
        losses=0,
        created_at=now
    )

@api_router.get("/teams", response_model=List[TeamResponse])
async def get_teams(sport: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if sport:
        query["sport"] = sport
    teams = await db.teams.find(query, {"_id": 0, "created_by": 0}).to_list(1000)
    
    # Fetch player details for each team
    result = []
    for team in teams:
        players = await db.players.find({"id": {"$in": team.get("player_ids", [])}}, {"_id": 0, "name": 1, "id": 1}).to_list(10)
        team["players"] = players
        result.append(TeamResponse(**team))
    return result

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}

# ============== RESOURCE ROUTES ==============

@api_router.post("/resources", response_model=ResourceResponse)
async def create_resource(resource: ResourceCreate, current_user: dict = Depends(get_current_user)):
    resource_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    resource_doc = {
        "id": resource_id,
        "name": resource.name,
        "resource_type": resource.resource_type,
        "sport": resource.sport,
        "location": resource.location,
        "status": resource.status,
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.resources.insert_one(resource_doc)
    return ResourceResponse(**{k: v for k, v in resource_doc.items() if k != "created_by"})

@api_router.get("/resources", response_model=List[ResourceResponse])
async def get_resources(sport: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if sport:
        query["sport"] = sport
    if status:
        query["status"] = status
    resources = await db.resources.find(query, {"_id": 0, "created_by": 0}).to_list(1000)
    return [ResourceResponse(**r) for r in resources]

@api_router.put("/resources/{resource_id}", response_model=ResourceResponse)
async def update_resource(resource_id: str, resource: ResourceCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.resources.find_one({"id": resource_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    update_data = resource.model_dump(exclude_unset=True)
    await db.resources.update_one({"id": resource_id}, {"$set": update_data})
    updated = await db.resources.find_one({"id": resource_id}, {"_id": 0, "created_by": 0})
    return ResourceResponse(**updated)

@api_router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.resources.delete_one({"id": resource_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"message": "Resource deleted"}

# ============== TOURNAMENT ROUTES ==============

@api_router.post("/tournaments", response_model=TournamentResponse)
async def create_tournament(tournament: TournamentCreate, current_user: dict = Depends(get_current_user)):
    tournament_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    tournament_doc = {
        "id": tournament_id,
        "name": tournament.name,
        "sport": tournament.sport,
        "format": tournament.format,
        "match_type": tournament.match_type,
        "start_date": tournament.start_date,
        "end_date": tournament.end_date,
        "max_participants": tournament.max_participants,
        "description": tournament.description,
        "status": "draft",
        "participant_ids": [],
        "sets_to_win": tournament.sets_to_win,
        "points_per_set": tournament.points_per_set,
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.tournaments.insert_one(tournament_doc)
    return TournamentResponse(**{k: v for k, v in tournament_doc.items() if k != "created_by"})

@api_router.get("/tournaments", response_model=List[TournamentResponse])
async def get_tournaments(sport: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if sport:
        query["sport"] = sport
    if status:
        query["status"] = status
    tournaments = await db.tournaments.find(query, {"_id": 0, "created_by": 0}).to_list(1000)
    return [TournamentResponse(**t) for t in tournaments]

@api_router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(tournament_id: str, current_user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0, "created_by": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return TournamentResponse(**tournament)

@api_router.put("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(tournament_id: str, tournament: TournamentCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.tournaments.find_one({"id": tournament_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    update_data = tournament.model_dump(exclude_unset=True)
    await db.tournaments.update_one({"id": tournament_id}, {"$set": update_data})
    updated = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0, "created_by": 0})
    return TournamentResponse(**updated)

@api_router.post("/tournaments/{tournament_id}/participants/{participant_id}")
async def add_participant(tournament_id: str, participant_id: str, current_user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if participant_id in tournament.get("participant_ids", []):
        raise HTTPException(status_code=400, detail="Participant already registered")
    
    if len(tournament.get("participant_ids", [])) >= tournament.get("max_participants", 32):
        raise HTTPException(status_code=400, detail="Tournament is full")
    
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$push": {"participant_ids": participant_id}, "$set": {"status": "registration"}}
    )
    return {"message": "Participant added"}

@api_router.delete("/tournaments/{tournament_id}/participants/{participant_id}")
async def remove_participant(tournament_id: str, participant_id: str, current_user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$pull": {"participant_ids": participant_id}}
    )
    return {"message": "Participant removed"}

@api_router.get("/tournaments/{tournament_id}/participants")
async def get_tournament_participants(tournament_id: str, current_user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    participant_ids = tournament.get("participant_ids", [])
    match_type = tournament.get("match_type", "singles")
    
    if match_type == "singles":
        participants = await db.players.find({"id": {"$in": participant_ids}}, {"_id": 0}).to_list(100)
    else:
        participants = await db.teams.find({"id": {"$in": participant_ids}}, {"_id": 0}).to_list(100)
        for p in participants:
            players = await db.players.find({"id": {"$in": p.get("player_ids", [])}}, {"_id": 0, "name": 1, "id": 1}).to_list(10)
            p["players"] = players
    
    return participants

# ============== BRACKET GENERATION ==============

def generate_single_elimination_bracket(participant_ids: List[str], tournament_id: str) -> List[dict]:
    """Generate single elimination bracket matches"""
    matches = []
    participants = participant_ids.copy()
    random.shuffle(participants)
    
    # Calculate number of rounds
    n = len(participants)
    rounds = math.ceil(math.log2(n)) if n > 1 else 1
    bracket_size = 2 ** rounds
    
    # Add byes
    byes_needed = bracket_size - n
    participants.extend([None] * byes_needed)
    
    match_number = 1
    current_round_matches = []
    
    # First round
    for i in range(0, len(participants), 2):
        match_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        match = {
            "id": match_id,
            "tournament_id": tournament_id,
            "round_number": 1,
            "match_number": match_number,
            "participant1_id": participants[i],
            "participant2_id": participants[i+1] if i+1 < len(participants) else None,
            "winner_id": None,
            "resource_id": None,
            "scheduled_time": None,
            "status": "pending",
            "scores": [],
            "current_set": 1,
            "bracket_position": f"R1-M{match_number}",
            "next_match_id": None,
            "created_at": now
        }
        
        # Auto-advance if bye
        if match["participant2_id"] is None and match["participant1_id"]:
            match["winner_id"] = match["participant1_id"]
            match["status"] = "completed"
        elif match["participant1_id"] is None and match["participant2_id"]:
            match["winner_id"] = match["participant2_id"]
            match["status"] = "completed"
        
        matches.append(match)
        current_round_matches.append(match)
        match_number += 1
    
    # Generate subsequent rounds
    for round_num in range(2, rounds + 1):
        prev_round_matches = current_round_matches
        current_round_matches = []
        
        for i in range(0, len(prev_round_matches), 2):
            match_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            match = {
                "id": match_id,
                "tournament_id": tournament_id,
                "round_number": round_num,
                "match_number": match_number,
                "participant1_id": None,
                "participant2_id": None,
                "winner_id": None,
                "resource_id": None,
                "scheduled_time": None,
                "status": "pending",
                "scores": [],
                "current_set": 1,
                "bracket_position": f"R{round_num}-M{match_number}",
                "next_match_id": None,
                "created_at": now
            }
            
            # Link previous matches
            if i < len(prev_round_matches):
                prev_round_matches[i]["next_match_id"] = match_id
                # If previous match has winner (due to bye), set participant
                if prev_round_matches[i]["winner_id"]:
                    match["participant1_id"] = prev_round_matches[i]["winner_id"]
            if i + 1 < len(prev_round_matches):
                prev_round_matches[i + 1]["next_match_id"] = match_id
                if prev_round_matches[i + 1]["winner_id"]:
                    match["participant2_id"] = prev_round_matches[i + 1]["winner_id"]
            
            matches.append(match)
            current_round_matches.append(match)
            match_number += 1
    
    return matches

def generate_round_robin_bracket(participant_ids: List[str], tournament_id: str) -> List[dict]:
    """Generate round robin matches - everyone plays everyone"""
    matches = []
    participants = participant_ids.copy()
    n = len(participants)
    
    match_number = 1
    round_number = 1
    
    for i in range(n):
        for j in range(i + 1, n):
            match_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            match = {
                "id": match_id,
                "tournament_id": tournament_id,
                "round_number": round_number,
                "match_number": match_number,
                "participant1_id": participants[i],
                "participant2_id": participants[j],
                "winner_id": None,
                "resource_id": None,
                "scheduled_time": None,
                "status": "pending",
                "scores": [],
                "current_set": 1,
                "bracket_position": f"RR-M{match_number}",
                "next_match_id": None,
                "created_at": now
            }
            matches.append(match)
            match_number += 1
            
            # Group into rounds
            if match_number % (n // 2 + 1) == 0:
                round_number += 1
    
    return matches

def generate_double_elimination_bracket(participant_ids: List[str], tournament_id: str) -> List[dict]:
    """Generate double elimination bracket - winners and losers bracket"""
    matches = []
    participants = participant_ids.copy()
    random.shuffle(participants)
    
    n = len(participants)
    rounds = math.ceil(math.log2(n)) if n > 1 else 1
    bracket_size = 2 ** rounds
    
    byes_needed = bracket_size - n
    participants.extend([None] * byes_needed)
    
    match_number = 1
    
    # Winners bracket first round
    winners_r1_matches = []
    for i in range(0, len(participants), 2):
        match_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        match = {
            "id": match_id,
            "tournament_id": tournament_id,
            "round_number": 1,
            "match_number": match_number,
            "participant1_id": participants[i],
            "participant2_id": participants[i+1] if i+1 < len(participants) else None,
            "winner_id": None,
            "resource_id": None,
            "scheduled_time": None,
            "status": "pending",
            "scores": [],
            "current_set": 1,
            "bracket_position": f"W-R1-M{match_number}",
            "bracket_type": "winners",
            "next_match_id": None,
            "loser_next_match_id": None,
            "created_at": now
        }
        
        if match["participant2_id"] is None and match["participant1_id"]:
            match["winner_id"] = match["participant1_id"]
            match["status"] = "completed"
        elif match["participant1_id"] is None and match["participant2_id"]:
            match["winner_id"] = match["participant2_id"]
            match["status"] = "completed"
        
        matches.append(match)
        winners_r1_matches.append(match)
        match_number += 1
    
    # Generate more winners bracket rounds
    current_winners = winners_r1_matches
    for round_num in range(2, rounds + 1):
        next_winners = []
        for i in range(0, len(current_winners), 2):
            match_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            match = {
                "id": match_id,
                "tournament_id": tournament_id,
                "round_number": round_num,
                "match_number": match_number,
                "participant1_id": None,
                "participant2_id": None,
                "winner_id": None,
                "resource_id": None,
                "scheduled_time": None,
                "status": "pending",
                "scores": [],
                "current_set": 1,
                "bracket_position": f"W-R{round_num}-M{match_number}",
                "bracket_type": "winners",
                "next_match_id": None,
                "loser_next_match_id": None,
                "created_at": now
            }
            
            if i < len(current_winners):
                current_winners[i]["next_match_id"] = match_id
                if current_winners[i]["winner_id"]:
                    match["participant1_id"] = current_winners[i]["winner_id"]
            if i + 1 < len(current_winners):
                current_winners[i + 1]["next_match_id"] = match_id
                if current_winners[i + 1]["winner_id"]:
                    match["participant2_id"] = current_winners[i + 1]["winner_id"]
            
            matches.append(match)
            next_winners.append(match)
            match_number += 1
        current_winners = next_winners
    
    # Simplified losers bracket (first round from winners losers)
    losers_matches_count = max(1, len(winners_r1_matches) // 2)
    for i in range(losers_matches_count):
        match_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        match = {
            "id": match_id,
            "tournament_id": tournament_id,
            "round_number": 1,
            "match_number": match_number,
            "participant1_id": None,
            "participant2_id": None,
            "winner_id": None,
            "resource_id": None,
            "scheduled_time": None,
            "status": "pending",
            "scores": [],
            "current_set": 1,
            "bracket_position": f"L-R1-M{match_number}",
            "bracket_type": "losers",
            "next_match_id": None,
            "created_at": now
        }
        matches.append(match)
        match_number += 1
    
    # Grand finals
    match_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    grand_final = {
        "id": match_id,
        "tournament_id": tournament_id,
        "round_number": rounds + 1,
        "match_number": match_number,
        "participant1_id": None,
        "participant2_id": None,
        "winner_id": None,
        "resource_id": None,
        "scheduled_time": None,
        "status": "pending",
        "scores": [],
        "current_set": 1,
        "bracket_position": "Grand-Final",
        "bracket_type": "final",
        "next_match_id": None,
        "created_at": now
    }
    matches.append(grand_final)
    
    return matches

@api_router.post("/tournaments/{tournament_id}/generate-bracket")
async def generate_bracket(tournament_id: str, current_user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    participant_ids = tournament.get("participant_ids", [])
    if len(participant_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 participants")
    
    # Delete existing matches
    await db.matches.delete_many({"tournament_id": tournament_id})
    
    # Generate bracket based on format
    format_type = tournament.get("format", "single_elimination")
    if format_type == "single_elimination":
        matches = generate_single_elimination_bracket(participant_ids, tournament_id)
    elif format_type == "double_elimination":
        matches = generate_double_elimination_bracket(participant_ids, tournament_id)
    elif format_type == "round_robin":
        matches = generate_round_robin_bracket(participant_ids, tournament_id)
    else:
        matches = generate_single_elimination_bracket(participant_ids, tournament_id)
    
    # Insert matches
    if matches:
        await db.matches.insert_many(matches)
    
    # Update tournament status
    await db.tournaments.update_one({"id": tournament_id}, {"$set": {"status": "in_progress"}})
    
    return {"message": f"Generated {len(matches)} matches", "match_count": len(matches)}

# ============== MATCH ROUTES ==============

@api_router.get("/tournaments/{tournament_id}/matches", response_model=List[MatchResponse])
async def get_tournament_matches(tournament_id: str, current_user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    matches = await db.matches.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(1000)
    
    match_type = tournament.get("match_type", "singles")
    collection = "players" if match_type == "singles" else "teams"
    
    # Enrich with participant details
    result = []
    for match in matches:
        if match.get("participant1_id"):
            p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0, "name": 1, "id": 1})
            match["participant1"] = p1
        if match.get("participant2_id"):
            p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0, "name": 1, "id": 1})
            match["participant2"] = p2
        result.append(MatchResponse(**match))
    
    return result

@api_router.get("/matches/{match_id}", response_model=MatchResponse)
async def get_match(match_id: str, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    tournament = await db.tournaments.find_one({"id": match["tournament_id"]}, {"_id": 0})
    match_type = tournament.get("match_type", "singles") if tournament else "singles"
    collection = "players" if match_type == "singles" else "teams"
    
    if match.get("participant1_id"):
        p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0, "name": 1, "id": 1})
        match["participant1"] = p1
    if match.get("participant2_id"):
        p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0, "name": 1, "id": 1})
        match["participant2"] = p2
    
    return MatchResponse(**match)

@api_router.put("/matches/{match_id}", response_model=MatchResponse)
async def update_match(match_id: str, update: MatchUpdate, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    update_data = {}
    if update.status is not None:
        update_data["status"] = update.status
    if update.scores is not None:
        update_data["scores"] = [s.model_dump() for s in update.scores]
    if update.current_set is not None:
        update_data["current_set"] = update.current_set
    if update.winner_id is not None:
        update_data["winner_id"] = update.winner_id
        update_data["status"] = "completed"
        
        # Update next match with winner
        if match.get("next_match_id"):
            next_match = await db.matches.find_one({"id": match["next_match_id"]}, {"_id": 0})
            if next_match:
                if next_match.get("participant1_id") is None:
                    await db.matches.update_one({"id": match["next_match_id"]}, {"$set": {"participant1_id": update.winner_id}})
                elif next_match.get("participant2_id") is None:
                    await db.matches.update_one({"id": match["next_match_id"]}, {"$set": {"participant2_id": update.winner_id}})
        
        # Update player/team stats
        tournament = await db.tournaments.find_one({"id": match["tournament_id"]}, {"_id": 0})
        match_type = tournament.get("match_type", "singles") if tournament else "singles"
        collection = "players" if match_type == "singles" else "teams"
        
        loser_id = match["participant1_id"] if update.winner_id == match["participant2_id"] else match["participant2_id"]
        
        if update.winner_id:
            await db[collection].update_one({"id": update.winner_id}, {"$inc": {"wins": 1, "matches_played": 1}})
        if loser_id:
            await db[collection].update_one({"id": loser_id}, {"$inc": {"losses": 1, "matches_played": 1}})
    
    if update_data:
        await db.matches.update_one({"id": match_id}, {"$set": update_data})
    
    updated_match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    return MatchResponse(**updated_match)

@api_router.post("/matches/{match_id}/score")
async def update_score(match_id: str, set_score: SetScore, current_user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    scores = match.get("scores", [])
    
    # Update or add set score
    existing_set = next((s for s in scores if s["set_number"] == set_score.set_number), None)
    if existing_set:
        existing_set["participant1_score"] = set_score.participant1_score
        existing_set["participant2_score"] = set_score.participant2_score
    else:
        scores.append(set_score.model_dump())
    
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {"scores": scores, "status": "in_progress", "current_set": set_score.set_number}}
    )
    
    return {"message": "Score updated", "scores": scores}

# ============== LEADERBOARD / STATS ==============

@api_router.get("/leaderboard/{sport}")
async def get_leaderboard(sport: str, current_user: dict = Depends(get_current_user)):
    players = await db.players.find(
        {"sport": sport},
        {"_id": 0}
    ).sort([("wins", -1), ("matches_played", -1)]).to_list(50)
    
    # Calculate win rate and rank
    leaderboard = []
    for idx, player in enumerate(players):
        win_rate = (player["wins"] / player["matches_played"] * 100) if player["matches_played"] > 0 else 0
        leaderboard.append({
            "rank": idx + 1,
            "id": player["id"],
            "name": player["name"],
            "wins": player["wins"],
            "losses": player["losses"],
            "matches_played": player["matches_played"],
            "win_rate": round(win_rate, 1),
            "skill_level": player.get("skill_level", "intermediate")
        })
    
    return leaderboard

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_players = await db.players.count_documents({})
    total_teams = await db.teams.count_documents({})
    total_tournaments = await db.tournaments.count_documents({})
    active_tournaments = await db.tournaments.count_documents({"status": "in_progress"})
    total_matches = await db.matches.count_documents({})
    completed_matches = await db.matches.count_documents({"status": "completed"})
    
    tt_players = await db.players.count_documents({"sport": "table_tennis"})
    bd_players = await db.players.count_documents({"sport": "badminton"})
    
    recent_tournaments = await db.tournaments.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    
    return {
        "total_players": total_players,
        "total_teams": total_teams,
        "total_tournaments": total_tournaments,
        "active_tournaments": active_tournaments,
        "total_matches": total_matches,
        "completed_matches": completed_matches,
        "sport_breakdown": {
            "table_tennis": tt_players,
            "badminton": bd_players
        },
        "recent_tournaments": recent_tournaments
    }

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "RallyDesk - Sports Tournament Management API"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
