from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import math
import random
import csv
import io
from enum import Enum
import qrcode
import base64
from services.email_service import send_verification_email, is_email_configured
from services.turnstile_service import verify_turnstile_token, is_turnstile_enabled
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'rallydesk-secret-key-2026')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer(auto_error=False)

app = FastAPI(title="RallyDesk - Multi-Sport Tournament Platform")

# CORS Middleware - MUST be added immediately after app creation
origins = os.environ.get('CORS_ORIGINS', '*')
if origins == '*':
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in origins.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== HEALTH CHECK ==============

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "RallyDesk API"}

@app.get("/api/health")
async def api_health_check():
    """API health check with database connectivity test"""
    try:
        # Test database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "service": "RallyDesk API",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "RallyDesk API",
            "database": "disconnected",
            "error": str(e)
        }

# ============== ENUMS ==============

SPORTS = ["table_tennis", "badminton", "volleyball", "tennis", "pickleball"]
ROLES = ["viewer", "scorekeeper", "admin"]
FORMATS = ["round_robin", "single_elimination", "double_elimination", "groups_knockout"]
PARTICIPANT_TYPES = ["single", "pair", "team"]
MATCH_STATUSES = ["pending", "scheduled", "live", "completed", "cancelled"]
RESOURCE_TYPES = ["table", "court", "field"]

# ============== MODELS ==============

# Auth Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    display_name: Optional[str] = None
    turnstile_token: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    turnstile_token: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    display_name: Optional[str] = None
    role: str
    email_verified: bool = False
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Tournament Models
class SportScoringRules(BaseModel):
    """Scoring rules for a specific sport"""
    sets_to_win: int = 2  # Best of 3 = 2, Best of 5 = 3
    points_to_win_set: int = 21  # Points needed to win a set
    points_must_win_by: int = 2  # Must win by this margin
    max_points_per_set: Optional[int] = None  # Cap at this score (e.g., 30-29), None = no cap
    tie_break_points: Optional[int] = None  # Points for tie-break set (if different)
    tie_break_at_set: Optional[int] = None  # When tie-break kicks in (e.g., 1-1 in best of 3)

class DefaultScoringRules(BaseModel):
    """Default scoring rules for all sports"""
    table_tennis: SportScoringRules = Field(default_factory=lambda: SportScoringRules(
        sets_to_win=3, points_to_win_set=11, points_must_win_by=2, max_points_per_set=None
    ))
    badminton: SportScoringRules = Field(default_factory=lambda: SportScoringRules(
        sets_to_win=2, points_to_win_set=21, points_must_win_by=2, max_points_per_set=30
    ))
    volleyball: SportScoringRules = Field(default_factory=lambda: SportScoringRules(
        sets_to_win=3, points_to_win_set=25, points_must_win_by=2, max_points_per_set=None,
        tie_break_points=15, tie_break_at_set=2
    ))
    tennis: SportScoringRules = Field(default_factory=lambda: SportScoringRules(
        sets_to_win=2, points_to_win_set=6, points_must_win_by=2, max_points_per_set=7,
        tie_break_points=7, tie_break_at_set=6
    ))
    pickleball: SportScoringRules = Field(default_factory=lambda: SportScoringRules(
        sets_to_win=2, points_to_win_set=11, points_must_win_by=2, max_points_per_set=None
    ))

class TournamentSettings(BaseModel):
    min_rest_minutes: int = 10
    buffer_minutes: int = 5
    default_duration_minutes: Dict[str, int] = Field(default_factory=lambda: {
        "table_tennis": 20, "badminton": 30, "volleyball": 45, "tennis": 60, "pickleball": 25
    })
    scorekeeper_can_assign: bool = True
    scoring_rules: Optional[DefaultScoringRules] = Field(default_factory=DefaultScoringRules)

class TournamentCreate(BaseModel):
    name: str
    venue: Optional[str] = None
    timezone: str = "UTC"
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[TournamentSettings] = None

class TournamentResponse(BaseModel):
    id: str
    name: str
    venue: Optional[str] = None
    timezone: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None
    settings: dict
    status: str
    created_by: str
    created_at: str

# Player Models
class PlayerCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    skill_level: Optional[str] = "intermediate"
    sports: List[str] = Field(default_factory=list)
    rating: Optional[int] = None
    team_name: Optional[str] = None
    club: Optional[str] = None
    division_id: Optional[str] = None

class PlayerResponse(BaseModel):
    id: str
    tournament_id: str
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    skill_level: Optional[str] = None
    sports: List[str] = []
    rating: Optional[int] = None
    team_name: Optional[str] = None
    club: Optional[str] = None
    division_id: Optional[str] = None
    division_name: Optional[str] = None
    wins: int = 0
    losses: int = 0
    matches_played: int = 0
    created_at: str

# Resource Models
class ResourceCreate(BaseModel):
    sport: str
    label: str
    location: Optional[str] = None
    resource_type: str = "table"
    enabled: bool = True

class ResourceResponse(BaseModel):
    id: str
    tournament_id: str
    sport: str
    label: str
    location: Optional[str] = None
    resource_type: str
    enabled: bool
    current_match_id: Optional[str] = None
    locked: bool = False
    created_at: str

# Division Models
class DivisionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    eligibility: Optional[Dict[str, Any]] = None

class DivisionResponse(BaseModel):
    id: str
    tournament_id: str
    name: str
    description: Optional[str] = None
    eligibility: Optional[dict] = None
    created_at: str

# Team Models (for pairs/teams)
class TeamCreate(BaseModel):
    name: str
    player_ids: List[str]
    sport: Optional[str] = None

class TeamResponse(BaseModel):
    id: str
    tournament_id: str
    name: str
    player_ids: List[str]
    players: Optional[List[dict]] = None
    sport: Optional[str] = None
    wins: int = 0
    losses: int = 0
    created_at: str

# Competition Models (merged Contest/Event/Competition)
class ScoringRules(BaseModel):
    sets_to_win: int = 3
    points_per_set: int = 11
    win_by_two: bool = True
    point_cap: Optional[int] = None
    deuce_rules: Optional[str] = None

class CompetitionCreate(BaseModel):
    name: str
    division_id: Optional[str] = None
    sport: str
    discipline: Optional[str] = None  # singles, doubles, mixed_doubles, team
    format: str  # round_robin, single_elimination, groups_knockout
    participant_type: str = "single"  # single, pair, team
    num_groups: int = 1
    advance_per_group: int = 2
    scoring_rules: Optional[ScoringRules] = None

class CompetitionResponse(BaseModel):
    id: str
    tournament_id: str
    division_id: Optional[str] = None
    name: str
    sport: str
    discipline: Optional[str] = None
    format: str
    participant_type: str
    num_groups: int
    advance_per_group: int
    scoring_rules: dict
    status: str  # draft, draw_generated, in_progress, completed
    participant_ids: List[str] = []
    created_at: str

# Match Models
class SetScore(BaseModel):
    set_number: int
    score1: int
    score2: int

class RefereeAccess(BaseModel):
    """Access credentials for referee/umpire to update match scores"""
    access_code: str  # 6-digit OTP
    expires_at: str
    referee_name: Optional[str] = None

class MatchCreate(BaseModel):
    competition_id: str
    round_number: int
    match_number: int
    group_number: Optional[int] = None
    participant1_id: Optional[str] = None
    participant2_id: Optional[str] = None

class MatchUpdate(BaseModel):
    status: Optional[str] = None
    scores: Optional[List[SetScore]] = None
    winner_id: Optional[str] = None
    resource_id: Optional[str] = None
    scheduled_time: Optional[str] = None

class RefereeScoreUpdate(BaseModel):
    """Score update from referee - requires access code"""
    access_code: str
    scores: List[SetScore]
    winner_id: Optional[str] = None
    notes: Optional[str] = None

class MatchResponse(BaseModel):
    id: str
    tournament_id: str
    competition_id: str
    round_number: int
    match_number: int
    group_number: Optional[int] = None
    participant1_id: Optional[str] = None
    participant2_id: Optional[str] = None
    participant1: Optional[dict] = None
    participant2: Optional[dict] = None
    winner_id: Optional[str] = None
    resource_id: Optional[str] = None
    resource: Optional[dict] = None
    scheduled_time: Optional[str] = None
    status: str
    scores: List[dict] = []
    score_status: str = "pending"  # pending, confirmed, disputed
    bracket_position: Optional[str] = None
    next_match_id: Optional[str] = None
    referee_access: Optional[dict] = None  # Contains access info if generated
    created_at: str

# Standings Models
class StandingsEntry(BaseModel):
    participant_id: str
    participant_name: str
    group_number: Optional[int] = None
    played: int = 0
    wins: int = 0
    losses: int = 0
    sets_for: int = 0
    sets_against: int = 0
    points_for: int = 0
    points_against: int = 0
    rank: int = 0

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
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_role(required_roles: List[str], user: dict):
    if user["role"] not in required_roles:
        raise HTTPException(status_code=403, detail=f"Requires role: {required_roles}")
    return user

def require_admin(user: dict):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def require_scorekeeper_or_admin(user: dict):
    if user["role"] not in ["admin", "scorekeeper"]:
        raise HTTPException(status_code=403, detail="Scorekeeper or Admin access required")
    return user

async def get_user_tournaments_filter(user_id: str):
    """Get MongoDB filter for tournaments user can access (owns or is moderator of)"""
    return {
        "$or": [
            {"created_by": user_id},
            {"moderators": user_id}
        ]
    }

async def require_tournament_access(tournament_id: str, user: dict, require_owner: bool = False):
    """Check if user has access to tournament (owner or moderator)"""
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    is_owner = tournament.get("created_by") == user["id"]
    is_moderator = user["id"] in tournament.get("moderators", [])
    
    if require_owner and not is_owner:
        raise HTTPException(status_code=403, detail="Only tournament owner can perform this action")
    
    if not is_owner and not is_moderator:
        raise HTTPException(status_code=403, detail="You don't have access to this tournament")
    
    return tournament, is_owner

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, request: Request):
    # Verify Turnstile token only if both backend secret is configured AND frontend sent a token
    if user_data.turnstile_token and is_turnstile_enabled():
        client_ip = request.client.host if request.client else None
        if not await verify_turnstile_token(user_data.turnstile_token, client_ip):
            raise HTTPException(status_code=400, detail="Security verification failed. Please try again.")
    
    existing = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already registered")
    
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Check if this is the first user - make them admin
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "viewer"
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate email verification code
    verification_code = str(uuid.uuid4())[:6].upper()
    
    display_name = user_data.display_name or f"{user_data.first_name} {user_data.last_name}"
    
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "phone_number": user_data.phone_number,
        "display_name": display_name,
        "password_hash": hash_password(user_data.password),
        "role": role,
        "email_verified": False,
        "verification_code": verification_code,
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    # Send verification email via Mailjet
    email_sent = send_verification_email(
        recipient_email=user_data.email,
        verification_code=verification_code,
        recipient_name=f"{user_data.first_name} {user_data.last_name}".strip() or None
    )
    
    if not email_sent:
        # Log verification code as fallback (only if email service fails)
        logger.info(f"Email service unavailable. Verification code for {user_data.email}: {verification_code}")
    
    token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id, 
            username=user_data.username, 
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone_number=user_data.phone_number,
            display_name=display_name, 
            role=role, 
            email_verified=False,
            created_at=now
        )
    )

class EmailVerification(BaseModel):
    code: str

@api_router.post("/auth/verify-email")
async def verify_email(verification: EmailVerification, current_user: dict = Depends(require_auth)):
    """Verify user's email with the verification code"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    if user.get("verification_code") != verification.code.upper():
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    await db.users.update_one(
        {"id": current_user["id"]}, 
        {"$set": {"email_verified": True}, "$unset": {"verification_code": ""}}
    )
    
    return {"message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(current_user: dict = Depends(require_auth)):
    """Resend email verification code"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    # Generate new verification code
    verification_code = str(uuid.uuid4())[:6].upper()
    
    await db.users.update_one(
        {"id": current_user["id"]}, 
        {"$set": {"verification_code": verification_code}}
    )
    
    # Send verification email via Mailjet
    email_sent = send_verification_email(
        recipient_email=user["email"],
        verification_code=verification_code,
        recipient_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or None
    )
    
    if email_sent:
        return {"message": "Verification code sent to your email"}
    else:
        # Fallback - log and return code (for dev environments without email config)
        logger.info(f"Email service unavailable. Verification code for {user['email']}: {verification_code}")
        return {"message": "Verification code sent", "code": verification_code}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    # Verify Turnstile token only if both backend secret is configured AND frontend sent a token
    if credentials.turnstile_token and is_turnstile_enabled():
        client_ip = request.client.host if request.client else None
        if not await verify_turnstile_token(credentials.turnstile_token, client_ip):
            raise HTTPException(status_code=400, detail="Security verification failed. Please try again.")
    
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"], 
            username=user["username"], 
            email=user["email"],
            first_name=user.get("first_name"),
            last_name=user.get("last_name"),
            phone_number=user.get("phone_number"),
            display_name=user.get("display_name"), 
            role=user["role"], 
            email_verified=user.get("email_verified", False),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(require_auth)):
    return UserResponse(
        id=current_user["id"], 
        username=current_user["username"], 
        email=current_user["email"],
        first_name=current_user.get("first_name"),
        last_name=current_user.get("last_name"),
        phone_number=current_user.get("phone_number"),
        display_name=current_user.get("display_name"), 
        role=current_user["role"], 
        email_verified=current_user.get("email_verified", False),
        created_at=current_user["created_at"]
    )

@api_router.put("/auth/profile")
async def update_profile(display_name: Optional[str] = None, current_user: dict = Depends(require_auth)):
    update_data = {}
    if display_name:
        update_data["display_name"] = display_name
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    return {"message": "Profile updated"}

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(require_auth)):
    # This endpoint is deprecated in SaaS mode - use tournament moderators instead
    raise HTTPException(status_code=403, detail="Global role changes are not allowed in SaaS mode. Use tournament moderators instead.")

# ============== GOOGLE OAUTH ROUTES ==============

@api_router.post("/auth/google/session")
async def google_session(session_id: str, response: Response):
    """Exchange session_id for user data and create local session"""
    import httpx
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            google_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Failed to verify session: {str(e)}")
    
    email = google_data.get("email")
    name = google_data.get("name", "")
    picture = google_data.get("picture", "")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["id"]
        # Update user data
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"display_name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        username = email.split("@")[0] + "_" + str(uuid.uuid4())[:6]
        
        user_doc = {
            "id": user_id,
            "username": username,
            "email": email,
            "display_name": name,
            "picture": picture,
            "password_hash": "",  # OAuth user - no password
            "role": "viewer",
            "auth_provider": "google",
            "created_at": now
        }
        await db.users.insert_one(user_doc)
    
    # Create JWT token
    token = create_access_token({"sub": user_id})
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Get full user data
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "display_name": user.get("display_name"),
            "role": user["role"],
            "picture": user.get("picture"),
            "created_at": user["created_at"]
        }
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    """Clear session cookie"""
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============== FACEBOOK OAUTH ROUTES ==============

class FacebookTokenRequest(BaseModel):
    access_token: str

@api_router.post("/auth/facebook/callback")
async def facebook_callback(request: FacebookTokenRequest, response: Response):
    """Exchange Facebook access token for local JWT session"""
    import httpx
    
    # Verify the token with Facebook Graph API
    async with httpx.AsyncClient() as client:
        try:
            fb_response = await client.get(
                "https://graph.facebook.com/me",
                params={
                    "access_token": request.access_token,
                    "fields": "id,email,name,picture"
                }
            )
            if fb_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Facebook token")
            
            fb_user_data = fb_response.json()
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Failed to verify Facebook token: {str(e)}")
    
    facebook_id = fb_user_data.get("id")
    email = fb_user_data.get("email")
    name = fb_user_data.get("name", "")
    picture_data = fb_user_data.get("picture", {})
    picture = picture_data.get("data", {}).get("url", "") if isinstance(picture_data, dict) else ""
    
    # If no email provided by Facebook, create a placeholder
    if not email:
        email = f"fb_{facebook_id}@facebook.placeholder"
    
    # Check if user exists by facebook_id first, then by email
    existing_user = await db.users.find_one({"facebook_id": facebook_id}, {"_id": 0})
    
    if not existing_user:
        # Check by email
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["id"]
        # Update user data with Facebook info
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "display_name": name or existing_user.get("display_name"),
                "picture": picture or existing_user.get("picture"),
                "facebook_id": facebook_id,
                "email_verified": True  # Facebook verified the email
            }}
        )
    else:
        # Create new user
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        username = f"fb_{facebook_id[:8]}_{str(uuid.uuid4())[:4]}"
        
        # Split name into first/last
        name_parts = name.split(" ", 1) if name else ["User", ""]
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        user_doc = {
            "id": user_id,
            "username": username,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "display_name": name,
            "picture": picture,
            "password_hash": "",  # OAuth user - no password
            "role": "viewer",
            "auth_provider": "facebook",
            "facebook_id": facebook_id,
            "email_verified": True,  # Facebook verified the email
            "created_at": now
        }
        await db.users.insert_one(user_doc)
    
    # Create JWT token
    token = create_access_token({"sub": user_id})
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Get full user data
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "display_name": user.get("display_name"),
            "role": user["role"],
            "picture": user.get("picture"),
            "email_verified": user.get("email_verified", True),
            "created_at": user["created_at"]
        }
    }

# ============== TOURNAMENT ROUTES ==============

class ModeratorUpdate(BaseModel):
    user_id: str
    action: str  # "add" or "remove"

@api_router.post("/tournaments", response_model=TournamentResponse)
async def create_tournament(tournament: TournamentCreate, current_user: dict = Depends(require_auth)):
    # Anyone can create a tournament (they become the owner/organizer)
    tournament_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    settings = tournament.settings.model_dump() if tournament.settings else TournamentSettings().model_dump()
    
    tournament_doc = {
        "id": tournament_id,
        "name": tournament.name,
        "venue": tournament.venue,
        "timezone": tournament.timezone,
        "start_date": tournament.start_date,
        "end_date": tournament.end_date,
        "description": tournament.description,
        "settings": settings,
        "status": "draft",
        "created_by": current_user["id"],
        "moderators": [],  # Users who can help manage this tournament
        "created_at": now
    }
    await db.tournaments.insert_one(tournament_doc)
    return TournamentResponse(**{k: v for k, v in tournament_doc.items() if k not in ["_id", "moderators"]})

@api_router.get("/tournaments", response_model=List[TournamentResponse])
async def list_tournaments(current_user: dict = Depends(require_auth)):
    # Only return tournaments user owns or is a moderator of
    filter_query = await get_user_tournaments_filter(current_user["id"])
    tournaments = await db.tournaments.find(filter_query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [TournamentResponse(**t) for t in tournaments]

@api_router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(tournament_id: str, current_user: dict = Depends(require_auth)):
    tournament, _ = await require_tournament_access(tournament_id, current_user)
    return TournamentResponse(**tournament)

@api_router.put("/tournaments/{tournament_id}")
async def update_tournament(tournament_id: str, tournament: TournamentCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    update_data = tournament.model_dump(exclude_unset=True)
    if tournament.settings:
        update_data["settings"] = tournament.settings.model_dump()
    await db.tournaments.update_one({"id": tournament_id}, {"$set": update_data})
    return {"message": "Tournament updated"}

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, current_user: dict = Depends(require_auth)):
    # Only owner can delete tournament
    await require_tournament_access(tournament_id, current_user, require_owner=True)
    
    # Delete all related data
    await db.players.delete_many({"tournament_id": tournament_id})
    await db.resources.delete_many({"tournament_id": tournament_id})
    await db.divisions.delete_many({"tournament_id": tournament_id})
    await db.competitions.delete_many({"tournament_id": tournament_id})
    await db.matches.delete_many({"tournament_id": tournament_id})
    await db.teams.delete_many({"tournament_id": tournament_id})
    await db.tournaments.delete_one({"id": tournament_id})
    return {"message": "Tournament deleted"}

@api_router.post("/tournaments/{tournament_id}/moderators")
async def manage_moderator(tournament_id: str, update: ModeratorUpdate, current_user: dict = Depends(require_auth)):
    """Add or remove moderators from a tournament (owner only)"""
    await require_tournament_access(tournament_id, current_user, require_owner=True)
    
    # Verify the user to add/remove exists
    target_user = await db.users.find_one({"id": update.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update.action == "add":
        await db.tournaments.update_one(
            {"id": tournament_id},
            {"$addToSet": {"moderators": update.user_id}}
        )
        return {"message": f"Added {target_user.get('display_name', target_user['username'])} as moderator"}
    elif update.action == "remove":
        await db.tournaments.update_one(
            {"id": tournament_id},
            {"$pull": {"moderators": update.user_id}}
        )
        return {"message": f"Removed {target_user.get('display_name', target_user['username'])} as moderator"}
    else:
        raise HTTPException(status_code=400, detail="Action must be 'add' or 'remove'")

@api_router.get("/tournaments/{tournament_id}/moderators")
async def list_moderators(tournament_id: str, current_user: dict = Depends(require_auth)):
    """List all moderators for a tournament"""
    tournament, _ = await require_tournament_access(tournament_id, current_user)
    
    moderator_ids = tournament.get("moderators", [])
    moderators = []
    for mod_id in moderator_ids:
        user = await db.users.find_one({"id": mod_id}, {"_id": 0, "password_hash": 0, "verification_code": 0})
        if user:
            moderators.append({
                "id": user["id"],
                "username": user["username"],
                "display_name": user.get("display_name"),
                "email": user["email"]
            })
    
    return {"moderators": moderators, "owner_id": tournament.get("created_by")}

@api_router.get("/tournaments/{tournament_id}/scoring-rules")
async def get_scoring_rules(tournament_id: str, current_user: dict = Depends(require_auth)):
    """Get scoring rules for a tournament"""
    tournament, _ = await require_tournament_access(tournament_id, current_user)
    settings = tournament.get("settings", {})
    scoring_rules = settings.get("scoring_rules", DefaultScoringRules().model_dump())
    return {"scoring_rules": scoring_rules}

@api_router.put("/tournaments/{tournament_id}/scoring-rules/{sport}")
async def update_sport_scoring_rules(
    tournament_id: str, 
    sport: str, 
    rules: SportScoringRules, 
    current_user: dict = Depends(require_auth)
):
    """Update scoring rules for a specific sport in a tournament"""
    await require_tournament_access(tournament_id, current_user)
    
    if sport not in SPORTS:
        raise HTTPException(status_code=400, detail=f"Invalid sport. Must be one of: {SPORTS}")
    
    # Update the specific sport's scoring rules
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$set": {f"settings.scoring_rules.{sport}": rules.model_dump()}}
    )
    
    return {"message": f"Scoring rules updated for {sport.replace('_', ' ').title()}"}

@api_router.get("/default-scoring-rules")
async def get_default_scoring_rules():
    """Get default scoring rules for all sports (no auth required)"""
    return DefaultScoringRules().model_dump()

@api_router.get("/users/search")
async def search_users(q: str, current_user: dict = Depends(require_auth)):
    """Search users by username or email (for adding moderators)"""
    if len(q) < 2:
        return []
    
    users = await db.users.find(
        {"$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"display_name": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "password_hash": 0, "verification_code": 0}
    ).limit(10).to_list(10)
    
    return [{
        "id": u["id"],
        "username": u["username"],
        "display_name": u.get("display_name"),
        "email": u["email"]
    } for u in users]

# ============== PLAYER ROUTES ==============

@api_router.post("/tournaments/{tournament_id}/players", response_model=PlayerResponse)
async def create_player(tournament_id: str, player: PlayerCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    player_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    player_doc = {
        "id": player_id,
        "tournament_id": tournament_id,
        "first_name": player.first_name,
        "last_name": player.last_name,
        "email": player.email,
        "phone": player.phone,
        "gender": player.gender,
        "age": player.age,
        "skill_level": player.skill_level,
        "sports": player.sports if player.sports else [],
        "rating": player.rating,
        "team_name": player.team_name,
        "club": player.club,
        "division_id": player.division_id,
        "wins": 0,
        "losses": 0,
        "matches_played": 0,
        "created_at": now
    }
    await db.players.insert_one(player_doc)
    
    # Get division name if division_id is set
    division_name = None
    if player.division_id:
        division = await db.divisions.find_one({"id": player.division_id}, {"_id": 0, "name": 1})
        if division:
            division_name = division.get("name")
    
    return PlayerResponse(**player_doc, division_name=division_name)

@api_router.get("/tournaments/{tournament_id}/players", response_model=List[PlayerResponse])
async def list_players(
    tournament_id: str, 
    sport: Optional[str] = None,
    division_id: Optional[str] = None,
    sort_by: Optional[str] = "first_name",
    current_user: dict = Depends(require_auth)
):
    query = {"tournament_id": tournament_id}
    if sport and sport != "all":
        query["sports"] = sport
    if division_id and division_id != "all":
        query["division_id"] = division_id
    
    sort_field = sort_by if sort_by in ["first_name", "last_name", "email", "team_name", "rating"] else "first_name"
    players = await db.players.find(query, {"_id": 0}).sort(sort_field, 1).to_list(1000)
    
    # Get all divisions for name mapping
    divisions = await db.divisions.find({"tournament_id": tournament_id}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    division_map = {d["id"]: d["name"] for d in divisions}
    
    result = []
    for p in players:
        division_name = division_map.get(p.get("division_id")) if p.get("division_id") else None
        result.append(PlayerResponse(**p, division_name=division_name))
    return result

@api_router.get("/tournaments/{tournament_id}/players/{player_id}", response_model=PlayerResponse)
async def get_player(tournament_id: str, player_id: str, current_user: dict = Depends(require_auth)):
    player = await db.players.find_one({"id": player_id, "tournament_id": tournament_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    division_name = None
    if player.get("division_id"):
        division = await db.divisions.find_one({"id": player["division_id"]}, {"_id": 0, "name": 1})
        if division:
            division_name = division.get("name")
    return PlayerResponse(**player, division_name=division_name)

@api_router.put("/tournaments/{tournament_id}/players/{player_id}")
async def update_player(tournament_id: str, player_id: str, player: PlayerCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    update_data = player.model_dump(exclude_unset=True)
    await db.players.update_one({"id": player_id, "tournament_id": tournament_id}, {"$set": update_data})
    return {"message": "Player updated"}

@api_router.delete("/tournaments/{tournament_id}/players/{player_id}")
async def delete_player(tournament_id: str, player_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.players.delete_one({"id": player_id, "tournament_id": tournament_id})
    return {"message": "Player deleted"}

@api_router.post("/tournaments/{tournament_id}/players/bulk-delete")
async def bulk_delete_players(tournament_id: str, player_ids: List[str], current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    result = await db.players.delete_many({"id": {"$in": player_ids}, "tournament_id": tournament_id})
    return {"message": f"Deleted {result.deleted_count} players"}

@api_router.post("/tournaments/{tournament_id}/players/bulk-add")
async def bulk_add_players(tournament_id: str, players: List[PlayerCreate], current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    
    for player in players:
        player_id = str(uuid.uuid4())
        player_doc = {
            "id": player_id,
            "tournament_id": tournament_id,
            "first_name": player.first_name,
            "last_name": player.last_name,
            "email": player.email,
            "phone": player.phone,
            "gender": player.gender,
            "age": player.age,
            "skill_level": player.skill_level,
            "sports": player.sports if player.sports else [],
            "rating": player.rating,
            "team_name": player.team_name,
            "club": player.club,
            "wins": 0,
            "losses": 0,
            "matches_played": 0,
            "created_at": now
        }
        await db.players.insert_one(player_doc)
        created += 1
    
    return {"message": f"Created {created} players", "created": created}

@api_router.get("/tournaments/{tournament_id}/players/csv/sample")
async def download_players_csv_sample(tournament_id: str, current_user: dict = Depends(require_auth)):
    sample_data = [
        ["firstName", "lastName", "email", "phone", "gender", "age", "skillLevel", "sports", "rating", "team", "division", "club"],
        ["John", "Smith", "john@example.com", "+1234567890", "male", "25", "intermediate", "table_tennis", "1500", "Team Alpha", "Open", "City Club"],
        ["Jane", "Doe", "jane@example.com", "", "female", "28", "advanced", "badminton", "1800", "Team Alpha", "Open", "Metro Club"],
        ["Mike", "Johnson", "", "", "male", "22", "beginner", "volleyball", "", "", "Men's", ""],
        ["Sarah", "Wilson", "sarah@example.com", "", "female", "30", "advanced", "table_tennis", "1700", "Team Beta", "Women's", ""],
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

@api_router.post("/tournaments/{tournament_id}/players/csv/upload")
async def upload_players_csv(
    tournament_id: str, 
    file: UploadFile = File(...), 
    division_id: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    await require_tournament_access(tournament_id, current_user)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    skipped_count = 0
    teams_created = 0
    divisions_created = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    # Cache for divisions and teams
    division_cache = {}  # name -> id
    team_cache = {}  # name -> {id, player_ids}
    
    # Pre-load existing divisions
    existing_divisions = await db.divisions.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(100)
    for d in existing_divisions:
        division_cache[d["name"].lower()] = d["id"]
    
    # Pre-load existing teams
    existing_teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(500)
    for t in existing_teams:
        team_cache[t["name"].lower()] = {"id": t["id"], "player_ids": t.get("player_ids", [])}
    
    for row_num, row in enumerate(reader, start=2):
        try:
            first_name = row.get('firstName', row.get('first_name', row.get('name', ''))).strip()
            last_name = row.get('lastName', row.get('last_name', '')).strip()
            
            # Handle single "name" field
            if not first_name and 'name' in row:
                parts = row['name'].strip().split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ''
            
            if not first_name and not last_name:
                errors.append(f"Row {row_num}: Name is required")
                skipped_count += 1
                continue
            
            sports_str = row.get('sports', row.get('sport', '')).strip()
            sports_list = [s.strip().lower().replace(' ', '_') for s in sports_str.split(',') if s.strip()]
            
            # Handle division - from CSV or query param
            player_division_id = division_id  # Default to query param
            division_name = row.get('division', row.get('division_name', '')).strip()
            
            if division_name:
                division_key = division_name.lower()
                if division_key in division_cache:
                    player_division_id = division_cache[division_key]
                else:
                    # Create new division
                    new_division_id = str(uuid.uuid4())
                    division_doc = {
                        "id": new_division_id,
                        "tournament_id": tournament_id,
                        "name": division_name,
                        "description": "Auto-created from CSV import",
                        "eligibility": None,
                        "created_at": now
                    }
                    await db.divisions.insert_one(division_doc)
                    division_cache[division_key] = new_division_id
                    player_division_id = new_division_id
                    divisions_created += 1
            
            # Handle team from CSV
            team_name = row.get('team', row.get('teamName', row.get('team_name', ''))).strip()
            
            # Create player
            player_id = str(uuid.uuid4())
            player_doc = {
                "id": player_id,
                "tournament_id": tournament_id,
                "first_name": first_name,
                "last_name": last_name,
                "email": row.get('email', '').strip() or None,
                "phone": row.get('phone', '').strip() or None,
                "gender": row.get('gender', '').strip().lower() or None,
                "age": int(row.get('age', 0)) if row.get('age', '').strip() else None,
                "skill_level": row.get('skillLevel', row.get('skill_level', 'intermediate')).strip().lower(),
                "sports": sports_list if sports_list else [],
                "rating": int(row.get('rating', 0)) if row.get('rating', '').strip() else None,
                "team_name": team_name or None,
                "club": row.get('club', '').strip() or None,
                "division_id": player_division_id,
                "wins": 0,
                "losses": 0,
                "matches_played": 0,
                "created_at": now
            }
            await db.players.insert_one(player_doc)
            created_count += 1
            
            # Handle team creation/association
            if team_name:
                team_key = team_name.lower()
                if team_key in team_cache:
                    # Add player to existing team
                    team_data = team_cache[team_key]
                    if player_id not in team_data["player_ids"]:
                        team_data["player_ids"].append(player_id)
                        await db.teams.update_one(
                            {"id": team_data["id"]},
                            {"$push": {"player_ids": player_id}}
                        )
                else:
                    # Create new team
                    new_team_id = str(uuid.uuid4())
                    team_doc = {
                        "id": new_team_id,
                        "tournament_id": tournament_id,
                        "name": team_name,
                        "player_ids": [player_id],
                        "sport": sports_list[0] if sports_list else None,
                        "wins": 0,
                        "losses": 0,
                        "created_at": now
                    }
                    await db.teams.insert_one(team_doc)
                    team_cache[team_key] = {"id": new_team_id, "player_ids": [player_id]}
                    teams_created += 1
                
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped_count += 1
    
    return {
        "message": "CSV import completed",
        "created": created_count,
        "skipped": skipped_count,
        "teams_created": teams_created,
        "divisions_created": divisions_created,
        "errors": errors[:10]
    }

# ============== RESOURCE ROUTES ==============

@api_router.post("/tournaments/{tournament_id}/resources", response_model=ResourceResponse)
async def create_resource(tournament_id: str, resource: ResourceCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    if resource.sport not in SPORTS:
        raise HTTPException(status_code=400, detail=f"Invalid sport. Must be one of: {SPORTS}")
    
    resource_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    resource_doc = {
        "id": resource_id,
        "tournament_id": tournament_id,
        "sport": resource.sport,
        "label": resource.label,
        "location": resource.location,
        "resource_type": resource.resource_type,
        "enabled": resource.enabled,
        "current_match_id": None,
        "locked": False,
        "created_at": now
    }
    await db.resources.insert_one(resource_doc)
    return ResourceResponse(**resource_doc)

@api_router.post("/tournaments/{tournament_id}/resources/bulk-add")
async def bulk_add_resources(tournament_id: str, sport: str, count: int, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    if sport not in SPORTS:
        raise HTTPException(status_code=400, detail="Invalid sport")
    
    now = datetime.now(timezone.utc).isoformat()
    sport_name = sport.replace('_', ' ').title()
    resource_type = "table" if sport == "table_tennis" else "court"
    
    # Get existing count for numbering
    existing_count = await db.resources.count_documents({"tournament_id": tournament_id, "sport": sport})
    
    created = 0
    for i in range(count):
        resource_id = str(uuid.uuid4())
        label = f"{sport_name} {existing_count + i + 1}"
        resource_doc = {
            "id": resource_id,
            "tournament_id": tournament_id,
            "sport": sport,
            "label": label,
            "location": None,
            "resource_type": resource_type,
            "enabled": True,
            "current_match_id": None,
            "locked": False,
            "created_at": now
        }
        await db.resources.insert_one(resource_doc)
        created += 1
    
    return {"message": f"Created {created} resources", "created": created}

@api_router.get("/tournaments/{tournament_id}/resources", response_model=List[ResourceResponse])
async def list_resources(tournament_id: str, sport: Optional[str] = None, current_user: dict = Depends(require_auth)):
    query = {"tournament_id": tournament_id}
    if sport and sport != "all":
        query["sport"] = sport
    resources = await db.resources.find(query, {"_id": 0}).sort("label", 1).to_list(100)
    return [ResourceResponse(**r) for r in resources]

@api_router.put("/tournaments/{tournament_id}/resources/{resource_id}")
async def update_resource(tournament_id: str, resource_id: str, resource: ResourceCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    update_data = resource.model_dump(exclude_unset=True)
    await db.resources.update_one({"id": resource_id, "tournament_id": tournament_id}, {"$set": update_data})
    return {"message": "Resource updated"}

@api_router.delete("/tournaments/{tournament_id}/resources/{resource_id}")
async def delete_resource(tournament_id: str, resource_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.resources.delete_one({"id": resource_id, "tournament_id": tournament_id})
    return {"message": "Resource deleted"}

@api_router.post("/tournaments/{tournament_id}/resources/{resource_id}/lock")
async def lock_resource(tournament_id: str, resource_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.resources.update_one({"id": resource_id}, {"$set": {"locked": True}})
    return {"message": "Resource locked"}

@api_router.post("/tournaments/{tournament_id}/resources/{resource_id}/unlock")
async def unlock_resource(tournament_id: str, resource_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.resources.update_one({"id": resource_id}, {"$set": {"locked": False}})
    return {"message": "Resource unlocked"}

# ============== DIVISION ROUTES ==============

@api_router.post("/tournaments/{tournament_id}/divisions", response_model=DivisionResponse)
async def create_division(tournament_id: str, division: DivisionCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    division_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    division_doc = {
        "id": division_id,
        "tournament_id": tournament_id,
        "name": division.name,
        "description": division.description,
        "eligibility": division.eligibility,
        "created_at": now
    }
    await db.divisions.insert_one(division_doc)
    return DivisionResponse(**division_doc)

@api_router.get("/tournaments/{tournament_id}/divisions", response_model=List[DivisionResponse])
async def list_divisions(tournament_id: str, current_user: dict = Depends(require_auth)):
    divisions = await db.divisions.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(100)
    return [DivisionResponse(**d) for d in divisions]

@api_router.get("/tournaments/{tournament_id}/divisions/{division_id}", response_model=DivisionResponse)
async def get_division(tournament_id: str, division_id: str, current_user: dict = Depends(require_auth)):
    division = await db.divisions.find_one({"id": division_id, "tournament_id": tournament_id}, {"_id": 0})
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    return DivisionResponse(**division)

@api_router.put("/tournaments/{tournament_id}/divisions/{division_id}")
async def update_division(tournament_id: str, division_id: str, division: DivisionCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    update_data = division.model_dump(exclude_unset=True)
    await db.divisions.update_one({"id": division_id}, {"$set": update_data})
    return {"message": "Division updated"}

@api_router.delete("/tournaments/{tournament_id}/divisions/{division_id}")
async def delete_division(tournament_id: str, division_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.divisions.delete_one({"id": division_id})
    return {"message": "Division deleted"}

# ============== TEAM ROUTES ==============

@api_router.post("/tournaments/{tournament_id}/teams", response_model=TeamResponse)
async def create_team(tournament_id: str, team: TeamCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    team_doc = {
        "id": team_id,
        "tournament_id": tournament_id,
        "name": team.name,
        "player_ids": team.player_ids,
        "sport": team.sport,
        "wins": 0,
        "losses": 0,
        "created_at": now
    }
    await db.teams.insert_one(team_doc)
    
    # Fetch player names
    players = await db.players.find({"id": {"$in": team.player_ids}}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1}).to_list(10)
    players_formatted = [{"id": p["id"], "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()} for p in players]
    
    return TeamResponse(**team_doc, players=players_formatted)

@api_router.get("/tournaments/{tournament_id}/teams", response_model=List[TeamResponse])
async def list_teams(tournament_id: str, sport: Optional[str] = None, current_user: dict = Depends(require_auth)):
    query = {"tournament_id": tournament_id}
    if sport:
        query["sport"] = sport
    teams = await db.teams.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for team in teams:
        players = await db.players.find({"id": {"$in": team.get("player_ids", [])}}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1}).to_list(10)
        team["players"] = [{"id": p["id"], "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()} for p in players]
        result.append(TeamResponse(**team))
    return result

@api_router.delete("/tournaments/{tournament_id}/teams/{team_id}")
async def delete_team(tournament_id: str, team_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.teams.delete_one({"id": team_id})
    return {"message": "Team deleted"}

@api_router.post("/tournaments/{tournament_id}/teams/auto-pair")
async def auto_pair_players(
    tournament_id: str, 
    sport: str, 
    max_teams: int = 16,
    strategy: str = "random",  # random, balanced, avoid_same_club
    current_user: dict = Depends(require_auth)
):
    await require_tournament_access(tournament_id, current_user)
    
    # Get available players for the sport
    players = await db.players.find({"tournament_id": tournament_id, "sports": sport}, {"_id": 0}).to_list(1000)
    
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players")
    
    random.shuffle(players)
    
    if strategy == "balanced":
        players.sort(key=lambda p: p.get("rating", 0) or 0, reverse=True)
    
    teams_created = []
    now = datetime.now(timezone.utc).isoformat()
    used_player_ids = set()
    
    for i in range(0, min(len(players) - 1, max_teams * 2), 2):
        if len(teams_created) >= max_teams:
            break
            
        p1, p2 = players[i], players[i + 1]
        
        if strategy == "avoid_same_club" and p1.get("club") and p1.get("club") == p2.get("club"):
            # Try to find a different partner
            for j in range(i + 2, len(players)):
                if players[j]["id"] not in used_player_ids and players[j].get("club") != p1.get("club"):
                    p2 = players[j]
                    break
        
        if p1["id"] in used_player_ids or p2["id"] in used_player_ids:
            continue
            
        team_id = str(uuid.uuid4())
        name1 = f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip()
        name2 = f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip()
        team_name = f"{name1} / {name2}"
        
        team_doc = {
            "id": team_id,
            "tournament_id": tournament_id,
            "name": team_name,
            "player_ids": [p1["id"], p2["id"]],
            "sport": sport,
            "wins": 0,
            "losses": 0,
            "created_at": now
        }
        await db.teams.insert_one(team_doc)
        teams_created.append(team_doc)
        used_player_ids.add(p1["id"])
        used_player_ids.add(p2["id"])
    
    return {"message": f"Created {len(teams_created)} teams", "teams": len(teams_created)}

@api_router.post("/tournaments/{tournament_id}/teams/swap")
async def swap_team_players(
    tournament_id: str,
    team1_id: str,
    player1_id: str,
    team2_id: str,
    player2_id: str,
    current_user: dict = Depends(require_auth)
):
    await require_tournament_access(tournament_id, current_user)
    
    team1 = await db.teams.find_one({"id": team1_id}, {"_id": 0})
    team2 = await db.teams.find_one({"id": team2_id}, {"_id": 0})
    
    if not team1 or not team2:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Swap players
    team1_players = [p if p != player1_id else player2_id for p in team1["player_ids"]]
    team2_players = [p if p != player2_id else player1_id for p in team2["player_ids"]]
    
    await db.teams.update_one({"id": team1_id}, {"$set": {"player_ids": team1_players}})
    await db.teams.update_one({"id": team2_id}, {"$set": {"player_ids": team2_players}})
    
    return {"message": "Players swapped"}

# ============== COMPETITION ROUTES ==============

@api_router.post("/tournaments/{tournament_id}/competitions", response_model=CompetitionResponse)
async def create_competition(tournament_id: str, competition: CompetitionCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    if competition.sport not in SPORTS:
        raise HTTPException(status_code=400, detail="Invalid sport")
    if competition.format not in FORMATS:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    competition_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    scoring = competition.scoring_rules.model_dump() if competition.scoring_rules else ScoringRules().model_dump()
    
    competition_doc = {
        "id": competition_id,
        "tournament_id": tournament_id,
        "division_id": competition.division_id,
        "name": competition.name,
        "sport": competition.sport,
        "discipline": competition.discipline,
        "format": competition.format,
        "participant_type": competition.participant_type,
        "num_groups": competition.num_groups,
        "advance_per_group": competition.advance_per_group,
        "scoring_rules": scoring,
        "status": "draft",
        "participant_ids": [],
        "created_at": now
    }
    await db.competitions.insert_one(competition_doc)
    return CompetitionResponse(**competition_doc)

@api_router.get("/tournaments/{tournament_id}/competitions", response_model=List[CompetitionResponse])
async def list_competitions(tournament_id: str, division_id: Optional[str] = None, current_user: dict = Depends(require_auth)):
    query = {"tournament_id": tournament_id}
    if division_id:
        query["division_id"] = division_id
    competitions = await db.competitions.find(query, {"_id": 0}).to_list(100)
    return [CompetitionResponse(**c) for c in competitions]

@api_router.get("/tournaments/{tournament_id}/competitions/{competition_id}", response_model=CompetitionResponse)
async def get_competition(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    return CompetitionResponse(**competition)

@api_router.put("/tournaments/{tournament_id}/competitions/{competition_id}")
async def update_competition(tournament_id: str, competition_id: str, competition: CompetitionCreate, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    update_data = competition.model_dump(exclude_unset=True)
    if competition.scoring_rules:
        update_data["scoring_rules"] = competition.scoring_rules.model_dump()
    await db.competitions.update_one({"id": competition_id}, {"$set": update_data})
    return {"message": "Competition updated"}

@api_router.delete("/tournaments/{tournament_id}/competitions/{competition_id}")
async def delete_competition(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.matches.delete_many({"competition_id": competition_id})
    await db.competitions.delete_one({"id": competition_id})
    return {"message": "Competition deleted"}

# Participant management
@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/participants")
async def add_participant(tournament_id: str, competition_id: str, participant_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    if participant_id in competition.get("participant_ids", []):
        raise HTTPException(status_code=400, detail="Participant already added")
    
    await db.competitions.update_one({"id": competition_id}, {"$push": {"participant_ids": participant_id}})
    return {"message": "Participant added"}

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/participants/bulk")
async def bulk_add_participants(tournament_id: str, competition_id: str, participant_ids: List[str], current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    existing = set(competition.get("participant_ids", []))
    new_ids = [p for p in participant_ids if p not in existing]
    
    if new_ids:
        await db.competitions.update_one({"id": competition_id}, {"$push": {"participant_ids": {"$each": new_ids}}})
    
    return {"message": f"Added {len(new_ids)} participants"}

@api_router.delete("/tournaments/{tournament_id}/competitions/{competition_id}/participants/{participant_id}")
async def remove_participant(tournament_id: str, competition_id: str, participant_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.competitions.update_one({"id": competition_id}, {"$pull": {"participant_ids": participant_id}})
    return {"message": "Participant removed"}

@api_router.get("/tournaments/{tournament_id}/competitions/{competition_id}/participants")
async def get_participants(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    participant_ids = competition.get("participant_ids", [])
    participant_type = competition.get("participant_type", "single")
    
    if participant_type == "single":
        participants = await db.players.find({"id": {"$in": participant_ids}}, {"_id": 0}).to_list(100)
        for p in participants:
            p["name"] = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
    else:
        participants = await db.teams.find({"id": {"$in": participant_ids}}, {"_id": 0}).to_list(100)
    
    return participants

# Draw generation
@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/generate-draw")
async def generate_draw(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    participant_ids = competition.get("participant_ids", [])
    if len(participant_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 participants")
    
    # Delete existing matches
    await db.matches.delete_many({"competition_id": competition_id})
    
    format_type = competition.get("format", "round_robin")
    num_groups = competition.get("num_groups", 1)
    
    matches = []
    now = datetime.now(timezone.utc).isoformat()
    
    if format_type == "round_robin":
        matches = generate_round_robin_matches(participant_ids, competition_id, tournament_id, now)
    elif format_type == "single_elimination":
        matches = generate_single_elimination_matches(participant_ids, competition_id, tournament_id, now)
    elif format_type == "double_elimination":
        matches = generate_double_elimination_matches(participant_ids, competition_id, tournament_id, now)
    elif format_type == "groups_knockout":
        matches = generate_groups_knockout_matches(participant_ids, competition_id, tournament_id, num_groups, now)
    
    if matches:
        await db.matches.insert_many(matches)
    
    await db.competitions.update_one({"id": competition_id}, {"$set": {"status": "draw_generated"}})
    
    # Update tournament status to "draw_generated" if still in draft
    await db.tournaments.update_one(
        {"id": tournament_id, "status": "draft"}, 
        {"$set": {"status": "draw_generated"}}
    )
    
    return {"message": f"Generated {len(matches)} matches", "match_count": len(matches)}

# Pydantic models for draw adjustments
class DrawOptions(BaseModel):
    seeding: str = "random"  # random, rating, manual
    seed_order: Optional[List[str]] = None  # For manual seeding

class SwapParticipantsRequest(BaseModel):
    match1_id: str
    match2_id: str
    swap_type: str = "participant1"  # participant1, participant2, or both

class MoveParticipantRequest(BaseModel):
    source_match_id: str
    target_match_id: str
    source_slot: str  # participant1 or participant2
    target_slot: str  # participant1 or participant2

class AdvanceWinnerRequest(BaseModel):
    match_id: str
    winner_id: str

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/generate-draw-advanced")
async def generate_draw_advanced(
    tournament_id: str, 
    competition_id: str, 
    options: DrawOptions,
    current_user: dict = Depends(require_auth)
):
    """Generate draw with seeding options: random, rating-based, or manual order"""
    await require_tournament_access(tournament_id, current_user)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    participant_ids = competition.get("participant_ids", [])
    if len(participant_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 participants")
    
    # Delete existing matches
    await db.matches.delete_many({"competition_id": competition_id})
    
    # Order participants based on seeding option
    if options.seeding == "manual" and options.seed_order:
        # Use manual order, validate all participants are included
        if set(options.seed_order) != set(participant_ids):
            raise HTTPException(status_code=400, detail="Seed order must include all participants")
        ordered_participants = options.seed_order
    elif options.seeding == "rating":
        # Fetch players/teams and sort by rating
        players = await db.players.find({"id": {"$in": participant_ids}}, {"_id": 0}).to_list(500)
        teams = await db.teams.find({"id": {"$in": participant_ids}}, {"_id": 0}).to_list(500)
        all_entities = {p["id"]: p.get("rating", 0) or 0 for p in players}
        all_entities.update({t["id"]: t.get("rating", 0) or 0 for t in teams})
        ordered_participants = sorted(participant_ids, key=lambda x: all_entities.get(x, 0), reverse=True)
    else:
        # Random seeding
        ordered_participants = participant_ids.copy()
        random.shuffle(ordered_participants)
    
    format_type = competition.get("format", "round_robin")
    num_groups = competition.get("num_groups", 1)
    now = datetime.now(timezone.utc).isoformat()
    
    matches = []
    if format_type == "round_robin":
        matches = generate_round_robin_matches(ordered_participants, competition_id, tournament_id, now)
    elif format_type == "single_elimination":
        matches = generate_single_elimination_seeded(ordered_participants, competition_id, tournament_id, now)
    elif format_type == "double_elimination":
        matches = generate_double_elimination_matches(ordered_participants, competition_id, tournament_id, now)
    elif format_type == "groups_knockout":
        matches = generate_groups_knockout_seeded(ordered_participants, competition_id, tournament_id, num_groups, now)
    
    if matches:
        await db.matches.insert_many(matches)
    
    await db.competitions.update_one({"id": competition_id}, {"$set": {"status": "draw_generated"}})
    
    return {
        "message": f"Generated {len(matches)} matches with {options.seeding} seeding",
        "match_count": len(matches),
        "seeding": options.seeding
    }

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/swap-participants")
async def swap_participants(
    tournament_id: str,
    competition_id: str,
    request: SwapParticipantsRequest,
    current_user: dict = Depends(require_auth)
):
    """Swap participants between two matches for manual bracket adjustment"""
    await require_tournament_access(tournament_id, current_user)
    
    match1 = await db.matches.find_one({"id": request.match1_id, "competition_id": competition_id}, {"_id": 0})
    match2 = await db.matches.find_one({"id": request.match2_id, "competition_id": competition_id}, {"_id": 0})
    
    if not match1 or not match2:
        raise HTTPException(status_code=404, detail="One or both matches not found")
    
    # Don't allow swapping in completed matches
    if match1.get("status") == "completed" or match2.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot swap participants in completed matches")
    
    if request.swap_type == "participant1":
        # Swap participant1 between matches
        await db.matches.update_one(
            {"id": request.match1_id},
            {"$set": {"participant1_id": match2["participant1_id"]}}
        )
        await db.matches.update_one(
            {"id": request.match2_id},
            {"$set": {"participant1_id": match1["participant1_id"]}}
        )
    elif request.swap_type == "participant2":
        # Swap participant2 between matches
        await db.matches.update_one(
            {"id": request.match1_id},
            {"$set": {"participant2_id": match2["participant2_id"]}}
        )
        await db.matches.update_one(
            {"id": request.match2_id},
            {"$set": {"participant2_id": match1["participant2_id"]}}
        )
    elif request.swap_type == "both":
        # Swap both participants (entire match swap)
        await db.matches.update_one(
            {"id": request.match1_id},
            {"$set": {
                "participant1_id": match2["participant1_id"],
                "participant2_id": match2["participant2_id"]
            }}
        )
        await db.matches.update_one(
            {"id": request.match2_id},
            {"$set": {
                "participant1_id": match1["participant1_id"],
                "participant2_id": match1["participant2_id"]
            }}
        )
    
    return {"message": "Participants swapped successfully"}

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/move-participant")
async def move_participant(
    tournament_id: str,
    competition_id: str,
    request: MoveParticipantRequest,
    current_user: dict = Depends(require_auth)
):
    """Move a participant from one match slot to another"""
    await require_tournament_access(tournament_id, current_user)
    
    source_match = await db.matches.find_one({"id": request.source_match_id, "competition_id": competition_id}, {"_id": 0})
    target_match = await db.matches.find_one({"id": request.target_match_id, "competition_id": competition_id}, {"_id": 0})
    
    if not source_match or not target_match:
        raise HTTPException(status_code=404, detail="One or both matches not found")
    
    if source_match.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot move participant from completed match")
    
    # Get the participant to move
    participant_id = source_match.get(f"{request.source_slot}_id")
    
    # Clear source slot
    await db.matches.update_one(
        {"id": request.source_match_id},
        {"$set": {f"{request.source_slot}_id": None}}
    )
    
    # Set target slot
    await db.matches.update_one(
        {"id": request.target_match_id},
        {"$set": {f"{request.target_slot}_id": participant_id}}
    )
    
    return {"message": "Participant moved successfully"}

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/advance-winner")
async def advance_winner(
    tournament_id: str,
    competition_id: str,
    request: AdvanceWinnerRequest,
    current_user: dict = Depends(require_auth)
):
    """Manually advance a winner to the next round match"""
    await require_tournament_access(tournament_id, current_user)
    
    match = await db.matches.find_one({"id": request.match_id, "competition_id": competition_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Verify winner is one of the participants
    if request.winner_id not in [match.get("participant1_id"), match.get("participant2_id")]:
        raise HTTPException(status_code=400, detail="Winner must be one of the match participants")
    
    # Update match with winner
    await db.matches.update_one(
        {"id": request.match_id},
        {"$set": {"winner_id": request.winner_id, "status": "completed"}}
    )
    
    # If there's a next match, advance the winner
    next_match_id = match.get("next_match_id")
    if next_match_id:
        next_match = await db.matches.find_one({"id": next_match_id}, {"_id": 0})
        if next_match:
            # Determine which slot to fill
            if next_match.get("participant1_id") is None:
                await db.matches.update_one(
                    {"id": next_match_id},
                    {"$set": {"participant1_id": request.winner_id}}
                )
            elif next_match.get("participant2_id") is None:
                await db.matches.update_one(
                    {"id": next_match_id},
                    {"$set": {"participant2_id": request.winner_id}}
                )
    
    return {"message": "Winner advanced", "next_match_id": next_match_id}

@api_router.get("/tournaments/{tournament_id}/competitions/{competition_id}/bracket")
async def get_bracket(
    tournament_id: str,
    competition_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get full bracket structure with rounds and matches"""
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    matches = await db.matches.find(
        {"competition_id": competition_id}, 
        {"_id": 0}
    ).sort("round_number", 1).to_list(500)
    
    # Get participant details
    participant_ids = set()
    for m in matches:
        if m.get("participant1_id"):
            participant_ids.add(m["participant1_id"])
        if m.get("participant2_id"):
            participant_ids.add(m["participant2_id"])
    
    players = await db.players.find({"id": {"$in": list(participant_ids)}}, {"_id": 0}).to_list(500)
    teams = await db.teams.find({"id": {"$in": list(participant_ids)}}, {"_id": 0}).to_list(500)
    
    participant_map = {}
    for p in players:
        participant_map[p["id"]] = {"id": p["id"], "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(), "type": "player"}
    for t in teams:
        participant_map[t["id"]] = {"id": t["id"], "name": t.get("name", ""), "type": "team"}
    
    # Structure by round
    rounds = {}
    for match in matches:
        round_num = match.get("round_number", 1)
        if round_num not in rounds:
            rounds[round_num] = []
        
        match_data = {
            **match,
            "participant1": participant_map.get(match.get("participant1_id")),
            "participant2": participant_map.get(match.get("participant2_id")),
            "winner": participant_map.get(match.get("winner_id"))
        }
        rounds[round_num].append(match_data)
    
    # Calculate round names
    total_rounds = len(rounds)
    round_names = {}
    for r in sorted(rounds.keys()):
        if r >= 100:  # Knockout stage
            remaining = total_rounds - (r - 100)
            if remaining == 1:
                round_names[r] = "Final"
            elif remaining == 2:
                round_names[r] = "Semi-Final"
            elif remaining == 3:
                round_names[r] = "Quarter-Final"
            else:
                round_names[r] = f"Round {r - 99}"
        elif r == 999:
            round_names[r] = "Grand Final"
        else:
            remaining = total_rounds - r + 1
            if remaining == 1 and competition.get("format") == "single_elimination":
                round_names[r] = "Final"
            elif remaining == 2 and competition.get("format") == "single_elimination":
                round_names[r] = "Semi-Final"
            elif remaining == 3 and competition.get("format") == "single_elimination":
                round_names[r] = "Quarter-Final"
            else:
                round_names[r] = f"Round {r}"
    
    return {
        "competition": competition,
        "rounds": rounds,
        "round_names": round_names,
        "total_matches": len(matches),
        "completed_matches": len([m for m in matches if m.get("status") == "completed"]),
        "participants": participant_map
    }

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/reset-draw")
async def reset_draw(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    await db.matches.delete_many({"competition_id": competition_id})
    await db.competitions.update_one({"id": competition_id}, {"$set": {"status": "draft"}})
    return {"message": "Draw reset"}

@api_router.post("/tournaments/{tournament_id}/competitions/{competition_id}/generate-knockout")
async def generate_knockout(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    await require_tournament_access(tournament_id, current_user)
    
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Get standings from group stage
    standings = await calculate_standings(competition_id, competition.get("num_groups", 1))
    
    # Get top N from each group
    advance_per_group = competition.get("advance_per_group", 2)
    qualifiers = []
    
    for group_num in range(1, competition.get("num_groups", 1) + 1):
        group_standings = [s for s in standings if s.get("group_number") == group_num]
        group_standings.sort(key=lambda x: (-x.get("wins", 0), -(x.get("points_for", 0) - x.get("points_against", 0))))
        qualifiers.extend([s["participant_id"] for s in group_standings[:advance_per_group]])
    
    # Generate knockout bracket
    now = datetime.now(timezone.utc).isoformat()
    knockout_matches = generate_single_elimination_matches(qualifiers, competition_id, tournament_id, now, round_offset=100)
    
    if knockout_matches:
        await db.matches.insert_many(knockout_matches)
    
    return {"message": f"Generated {len(knockout_matches)} knockout matches", "qualifiers": len(qualifiers)}

# ============== DRAW GENERATION ALGORITHMS ==============

def generate_round_robin_matches(participant_ids: List[str], competition_id: str, tournament_id: str, now: str) -> List[dict]:
    matches = []
    participants = participant_ids.copy()
    n = len(participants)
    match_number = 1
    
    # Round-robin scheduling
    for i in range(n):
        for j in range(i + 1, n):
            match_id = str(uuid.uuid4())
            match = {
                "id": match_id,
                "tournament_id": tournament_id,
                "competition_id": competition_id,
                "round_number": 1,
                "match_number": match_number,
                "group_number": 1,
                "participant1_id": participants[i],
                "participant2_id": participants[j],
                "winner_id": None,
                "resource_id": None,
                "scheduled_time": None,
                "status": "pending",
                "scores": [],
                "bracket_position": f"RR-M{match_number}",
                "next_match_id": None,
                "created_at": now
            }
            matches.append(match)
            match_number += 1
    
    return matches

def generate_single_elimination_seeded(participant_ids: List[str], competition_id: str, tournament_id: str, now: str, round_offset: int = 0) -> List[dict]:
    """Generate single elimination bracket with proper seeding (1 vs last, 2 vs second-last, etc.)"""
    participants = participant_ids.copy()  # Already ordered by seed
    
    n = len(participants)
    rounds = math.ceil(math.log2(n)) if n > 1 else 1
    bracket_size = 2 ** rounds
    
    # Add byes at the end
    byes_needed = bracket_size - n
    participants.extend([None] * byes_needed)
    
    # Create seeded bracket order (1 vs 16, 8 vs 9, 5 vs 12, 4 vs 13, etc. for 16 players)
    seeded_order = create_seeded_bracket_order(len(participants))
    ordered_participants = [participants[i] if i < len(participants) else None for i in seeded_order]
    
    match_number = 1
    current_round_matches = []
    all_matches = []
    
    # First round
    for i in range(0, len(ordered_participants), 2):
        match_id = str(uuid.uuid4())
        match = {
            "id": match_id,
            "tournament_id": tournament_id,
            "competition_id": competition_id,
            "round_number": 1 + round_offset,
            "match_number": match_number,
            "group_number": None,
            "participant1_id": ordered_participants[i],
            "participant2_id": ordered_participants[i+1] if i+1 < len(ordered_participants) else None,
            "seed1": seeded_order[i] + 1 if seeded_order[i] < n else None,
            "seed2": seeded_order[i+1] + 1 if i+1 < len(seeded_order) and seeded_order[i+1] < n else None,
            "winner_id": None,
            "resource_id": None,
            "scheduled_time": None,
            "status": "pending",
            "scores": [],
            "bracket_position": f"R{1 + round_offset}-M{match_number}",
            "next_match_id": None,
            "created_at": now
        }
        
        # Auto-advance byes
        if match["participant2_id"] is None and match["participant1_id"]:
            match["winner_id"] = match["participant1_id"]
            match["status"] = "completed"
        elif match["participant1_id"] is None and match["participant2_id"]:
            match["winner_id"] = match["participant2_id"]
            match["status"] = "completed"
        
        all_matches.append(match)
        current_round_matches.append(match)
        match_number += 1
    
    # Subsequent rounds
    for round_num in range(2, rounds + 1):
        prev_round_matches = current_round_matches
        current_round_matches = []
        
        for i in range(0, len(prev_round_matches), 2):
            match_id = str(uuid.uuid4())
            match = {
                "id": match_id,
                "tournament_id": tournament_id,
                "competition_id": competition_id,
                "round_number": round_num + round_offset,
                "match_number": match_number,
                "group_number": None,
                "participant1_id": None,
                "participant2_id": None,
                "winner_id": None,
                "resource_id": None,
                "scheduled_time": None,
                "status": "pending",
                "scores": [],
                "bracket_position": f"R{round_num + round_offset}-M{match_number}",
                "next_match_id": None,
                "created_at": now
            }
            
            # Link previous matches and auto-advance winners from byes
            if i < len(prev_round_matches):
                prev_round_matches[i]["next_match_id"] = match_id
                if prev_round_matches[i]["winner_id"]:
                    match["participant1_id"] = prev_round_matches[i]["winner_id"]
            if i + 1 < len(prev_round_matches):
                prev_round_matches[i + 1]["next_match_id"] = match_id
                if prev_round_matches[i + 1]["winner_id"]:
                    match["participant2_id"] = prev_round_matches[i + 1]["winner_id"]
            
            all_matches.append(match)
            current_round_matches.append(match)
            match_number += 1
    
    return all_matches

def create_seeded_bracket_order(size: int) -> List[int]:
    """Create bracket order that puts 1 vs last, 2 vs second-last, etc."""
    if size <= 1:
        return [0]
    if size == 2:
        return [0, 1]
    
    # Recursively build bracket
    half = size // 2
    top_half = create_seeded_bracket_order(half)
    bottom_half = [size - 1 - i for i in top_half]
    
    result = []
    for i in range(half):
        result.append(top_half[i])
        result.append(bottom_half[i])
    
    return result

def generate_groups_knockout_seeded(participant_ids: List[str], competition_id: str, tournament_id: str, num_groups: int, now: str) -> List[dict]:
    """Generate group stage with seeded distribution (snake draft style)"""
    matches = []
    participants = participant_ids.copy()  # Already ordered by seed
    
    # Distribute participants to groups using snake draft
    groups = [[] for _ in range(num_groups)]
    direction = 1
    group_idx = 0
    
    for participant in participants:
        groups[group_idx].append(participant)
        
        # Snake draft
        group_idx += direction
        if group_idx >= num_groups:
            group_idx = num_groups - 1
            direction = -1
        elif group_idx < 0:
            group_idx = 0
            direction = 1
    
    match_number = 1
    
    # Generate round-robin matches within each group
    for group_num, group_participants in enumerate(groups, 1):
        n = len(group_participants)
        for i in range(n):
            for j in range(i + 1, n):
                match_id = str(uuid.uuid4())
                match = {
                    "id": match_id,
                    "tournament_id": tournament_id,
                    "competition_id": competition_id,
                    "round_number": 1,
                    "match_number": match_number,
                    "group_number": group_num,
                    "participant1_id": group_participants[i],
                    "participant2_id": group_participants[j],
                    "winner_id": None,
                    "resource_id": None,
                    "scheduled_time": None,
                    "status": "pending",
                    "scores": [],
                    "bracket_position": f"G{group_num}-M{match_number}",
                    "bracket_type": "group",
                    "next_match_id": None,
                    "created_at": now
                }
                matches.append(match)
                match_number += 1
    
    return matches

def generate_single_elimination_matches(participant_ids: List[str], competition_id: str, tournament_id: str, now: str, round_offset: int = 0) -> List[dict]:
    matches = []
    participants = participant_ids.copy()
    random.shuffle(participants)
    
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
        match = {
            "id": match_id,
            "tournament_id": tournament_id,
            "competition_id": competition_id,
            "round_number": 1 + round_offset,
            "match_number": match_number,
            "group_number": None,
            "participant1_id": participants[i],
            "participant2_id": participants[i+1] if i+1 < len(participants) else None,
            "winner_id": None,
            "resource_id": None,
            "scheduled_time": None,
            "status": "pending",
            "scores": [],
            "bracket_position": f"R{1 + round_offset}-M{match_number}",
            "next_match_id": None,
            "created_at": now
        }
        
        # Auto-advance byes
        if match["participant2_id"] is None and match["participant1_id"]:
            match["winner_id"] = match["participant1_id"]
            match["status"] = "completed"
        elif match["participant1_id"] is None and match["participant2_id"]:
            match["winner_id"] = match["participant2_id"]
            match["status"] = "completed"
        
        matches.append(match)
        current_round_matches.append(match)
        match_number += 1
    
    # Subsequent rounds
    for round_num in range(2, rounds + 1):
        prev_round_matches = current_round_matches
        current_round_matches = []
        
        for i in range(0, len(prev_round_matches), 2):
            match_id = str(uuid.uuid4())
            match = {
                "id": match_id,
                "tournament_id": tournament_id,
                "competition_id": competition_id,
                "round_number": round_num + round_offset,
                "match_number": match_number,
                "group_number": None,
                "participant1_id": None,
                "participant2_id": None,
                "winner_id": None,
                "resource_id": None,
                "scheduled_time": None,
                "status": "pending",
                "scores": [],
                "bracket_position": f"R{round_num + round_offset}-M{match_number}",
                "next_match_id": None,
                "created_at": now
            }
            
            if i < len(prev_round_matches):
                prev_round_matches[i]["next_match_id"] = match_id
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

def generate_double_elimination_matches(participant_ids: List[str], competition_id: str, tournament_id: str, now: str) -> List[dict]:
    # Similar to single elimination but with losers bracket
    # Simplified implementation - just generate winners bracket + placeholder losers matches
    winners_matches = generate_single_elimination_matches(participant_ids, competition_id, tournament_id, now)
    
    # Add losers bracket placeholder
    match_number = len(winners_matches) + 1
    losers_matches = []
    
    num_losers_rounds = max(1, len(participant_ids) // 4)
    for r in range(num_losers_rounds):
        match_id = str(uuid.uuid4())
        losers_matches.append({
            "id": match_id,
            "tournament_id": tournament_id,
            "competition_id": competition_id,
            "round_number": r + 1,
            "match_number": match_number,
            "group_number": None,
            "participant1_id": None,
            "participant2_id": None,
            "winner_id": None,
            "resource_id": None,
            "scheduled_time": None,
            "status": "pending",
            "scores": [],
            "bracket_position": f"L-R{r+1}-M{match_number}",
            "bracket_type": "losers",
            "next_match_id": None,
            "created_at": now
        })
        match_number += 1
    
    # Grand final
    grand_final_id = str(uuid.uuid4())
    losers_matches.append({
        "id": grand_final_id,
        "tournament_id": tournament_id,
        "competition_id": competition_id,
        "round_number": 999,
        "match_number": match_number,
        "group_number": None,
        "participant1_id": None,
        "participant2_id": None,
        "winner_id": None,
        "resource_id": None,
        "scheduled_time": None,
        "status": "pending",
        "scores": [],
        "bracket_position": "Grand-Final",
        "bracket_type": "final",
        "next_match_id": None,
        "created_at": now
    })
    
    return winners_matches + losers_matches

def generate_groups_knockout_matches(participant_ids: List[str], competition_id: str, tournament_id: str, num_groups: int, now: str) -> List[dict]:
    matches = []
    participants = participant_ids.copy()
    random.shuffle(participants)
    
    # Distribute to groups
    groups = [[] for _ in range(num_groups)]
    for i, p in enumerate(participants):
        groups[i % num_groups].append(p)
    
    match_number = 1
    
    # Generate round-robin within each group
    for group_num, group_participants in enumerate(groups, start=1):
        n = len(group_participants)
        for i in range(n):
            for j in range(i + 1, n):
                match_id = str(uuid.uuid4())
                match = {
                    "id": match_id,
                    "tournament_id": tournament_id,
                    "competition_id": competition_id,
                    "round_number": 1,
                    "match_number": match_number,
                    "group_number": group_num,
                    "participant1_id": group_participants[i],
                    "participant2_id": group_participants[j],
                    "winner_id": None,
                    "resource_id": None,
                    "scheduled_time": None,
                    "status": "pending",
                    "scores": [],
                    "bracket_position": f"G{group_num}-M{match_number}",
                    "next_match_id": None,
                    "created_at": now
                }
                matches.append(match)
                match_number += 1
    
    return matches

async def calculate_standings(competition_id: str, num_groups: int) -> List[dict]:
    matches = await db.matches.find({"competition_id": competition_id, "status": "completed"}, {"_id": 0}).to_list(1000)
    
    standings = {}
    
    for match in matches:
        p1_id = match.get("participant1_id")
        p2_id = match.get("participant2_id")
        winner_id = match.get("winner_id")
        group_num = match.get("group_number", 1)
        
        for pid in [p1_id, p2_id]:
            if pid and pid not in standings:
                standings[pid] = {
                    "participant_id": pid,
                    "group_number": group_num,
                    "played": 0,
                    "wins": 0,
                    "losses": 0,
                    "sets_for": 0,
                    "sets_against": 0,
                    "points_for": 0,
                    "points_against": 0
                }
        
        if p1_id and p2_id:
            standings[p1_id]["played"] += 1
            standings[p2_id]["played"] += 1
            
            if winner_id == p1_id:
                standings[p1_id]["wins"] += 1
                standings[p2_id]["losses"] += 1
            elif winner_id == p2_id:
                standings[p2_id]["wins"] += 1
                standings[p1_id]["losses"] += 1
            
            # Calculate sets/points from scores
            for score in match.get("scores", []):
                s1 = score.get("score1", 0)
                s2 = score.get("score2", 0)
                standings[p1_id]["points_for"] += s1
                standings[p1_id]["points_against"] += s2
                standings[p2_id]["points_for"] += s2
                standings[p2_id]["points_against"] += s1
                
                if s1 > s2:
                    standings[p1_id]["sets_for"] += 1
                    standings[p2_id]["sets_against"] += 1
                elif s2 > s1:
                    standings[p2_id]["sets_for"] += 1
                    standings[p1_id]["sets_against"] += 1
    
    return list(standings.values())

# ============== MATCH ROUTES ==============

@api_router.get("/tournaments/{tournament_id}/competitions/{competition_id}/matches", response_model=List[MatchResponse])
async def list_matches(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    matches = await db.matches.find({"competition_id": competition_id}, {"_id": 0}).to_list(1000)
    
    participant_type = competition.get("participant_type", "single")
    collection = "players" if participant_type == "single" else "teams"
    
    result = []
    for match in matches:
        if match.get("participant1_id"):
            p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0})
            if p1:
                p1["name"] = p1.get("name") or f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip()
            match["participant1"] = p1
        if match.get("participant2_id"):
            p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0})
            if p2:
                p2["name"] = p2.get("name") or f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip()
            match["participant2"] = p2
        if match.get("resource_id"):
            resource = await db.resources.find_one({"id": match["resource_id"]}, {"_id": 0, "id": 1, "label": 1, "sport": 1})
            match["resource"] = resource
        result.append(MatchResponse(**match))
    
    return result

@api_router.get("/tournaments/{tournament_id}/matches/{match_id}", response_model=MatchResponse)
async def get_match(tournament_id: str, match_id: str, current_user: dict = Depends(require_auth)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    competition = await db.competitions.find_one({"id": match["competition_id"]}, {"_id": 0})
    participant_type = competition.get("participant_type", "single") if competition else "single"
    collection = "players" if participant_type == "single" else "teams"
    
    if match.get("participant1_id"):
        p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0})
        if p1:
            p1["name"] = p1.get("name") or f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip()
        match["participant1"] = p1
    if match.get("participant2_id"):
        p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0})
        if p2:
            p2["name"] = p2.get("name") or f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip()
        match["participant2"] = p2
    if match.get("resource_id"):
        resource = await db.resources.find_one({"id": match["resource_id"]}, {"_id": 0})
        match["resource"] = resource
    
    return MatchResponse(**match)

@api_router.put("/tournaments/{tournament_id}/matches/{match_id}")
async def update_match(tournament_id: str, match_id: str, update: MatchUpdate, current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    update_data = {}
    
    if update.status:
        update_data["status"] = update.status
    if update.scores:
        update_data["scores"] = [s.model_dump() for s in update.scores]
    if update.resource_id:
        update_data["resource_id"] = update.resource_id
    if update.scheduled_time:
        update_data["scheduled_time"] = update.scheduled_time
    
    if update.winner_id:
        update_data["winner_id"] = update.winner_id
        update_data["status"] = "completed"
        
        # Update next match
        if match.get("next_match_id"):
            next_match = await db.matches.find_one({"id": match["next_match_id"]}, {"_id": 0})
            if next_match:
                if next_match.get("participant1_id") is None:
                    await db.matches.update_one({"id": match["next_match_id"]}, {"$set": {"participant1_id": update.winner_id}})
                elif next_match.get("participant2_id") is None:
                    await db.matches.update_one({"id": match["next_match_id"]}, {"$set": {"participant2_id": update.winner_id}})
        
        # Update player/team stats
        competition = await db.competitions.find_one({"id": match["competition_id"]}, {"_id": 0})
        participant_type = competition.get("participant_type", "single") if competition else "single"
        collection = "players" if participant_type == "single" else "teams"
        
        loser_id = match["participant1_id"] if update.winner_id == match["participant2_id"] else match["participant2_id"]
        
        if update.winner_id:
            await db[collection].update_one({"id": update.winner_id}, {"$inc": {"wins": 1, "matches_played": 1}})
        if loser_id:
            await db[collection].update_one({"id": loser_id}, {"$inc": {"losses": 1, "matches_played": 1}})
        
        # Clear resource
        if match.get("resource_id"):
            await db.resources.update_one({"id": match["resource_id"]}, {"$set": {"current_match_id": None}})
    
    if update_data:
        await db.matches.update_one({"id": match_id}, {"$set": update_data})
    
    return {"message": "Match updated"}

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/assign")
async def assign_match_to_resource(tournament_id: str, match_id: str, resource_id: str, current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    # Check if scorekeeper can assign
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if current_user["role"] == "scorekeeper" and not tournament.get("settings", {}).get("scorekeeper_can_assign", True):
        raise HTTPException(status_code=403, detail="Scorekeepers cannot assign matches in this tournament")
    
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.get("locked"):
        raise HTTPException(status_code=400, detail="Resource is locked")
    if resource.get("current_match_id"):
        raise HTTPException(status_code=400, detail="Resource already has a match")
    
    await db.matches.update_one({"id": match_id}, {"$set": {"resource_id": resource_id, "status": "scheduled"}})
    await db.resources.update_one({"id": resource_id}, {"$set": {"current_match_id": match_id}})
    
    return {"message": "Match assigned to resource"}

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/start")
async def start_match(tournament_id: str, match_id: str, current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not match.get("resource_id"):
        raise HTTPException(status_code=400, detail="Match must be assigned to a resource first")
    if match.get("status") not in ["pending", "scheduled"]:
        raise HTTPException(status_code=400, detail="Match cannot be started")
    
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "live"}})
    await db.competitions.update_one({"id": match["competition_id"]}, {"$set": {"status": "in_progress"}})
    
    # Update tournament status to "in_progress" 
    await db.tournaments.update_one(
        {"id": tournament_id, "status": {"$in": ["draft", "draw_generated"]}}, 
        {"$set": {"status": "in_progress"}}
    )
    
    return {"message": "Match started"}

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/complete")
async def complete_match(tournament_id: str, match_id: str, scores: List[SetScore], current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.get("status") != "live":
        raise HTTPException(status_code=400, detail="Match must be live to complete")
    
    # Calculate winner from scores
    p1_sets = sum(1 for s in scores if s.score1 > s.score2)
    p2_sets = sum(1 for s in scores if s.score2 > s.score1)
    
    winner_id = match["participant1_id"] if p1_sets > p2_sets else match["participant2_id"]
    
    # Use the update_match function logic
    update = MatchUpdate(scores=scores, winner_id=winner_id)
    return await update_match(tournament_id, match_id, update, current_user)

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/reassign")
async def reassign_match(tournament_id: str, match_id: str, new_resource_id: str, current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Clear old resource
    if match.get("resource_id"):
        await db.resources.update_one({"id": match["resource_id"]}, {"$set": {"current_match_id": None}})
    
    # Assign to new resource
    await db.matches.update_one({"id": match_id}, {"$set": {"resource_id": new_resource_id}})
    await db.resources.update_one({"id": new_resource_id}, {"$set": {"current_match_id": match_id}})
    
    return {"message": "Match reassigned"}

# ============== STANDINGS ==============

@api_router.get("/tournaments/{tournament_id}/competitions/{competition_id}/standings")
async def get_standings(tournament_id: str, competition_id: str, current_user: dict = Depends(require_auth)):
    competition = await db.competitions.find_one({"id": competition_id}, {"_id": 0})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    standings = await calculate_standings(competition_id, competition.get("num_groups", 1))
    
    # Add participant names
    participant_type = competition.get("participant_type", "single")
    collection = "players" if participant_type == "single" else "teams"
    
    for entry in standings:
        participant = await db[collection].find_one({"id": entry["participant_id"]}, {"_id": 0})
        if participant:
            entry["participant_name"] = participant.get("name") or f"{participant.get('first_name', '')} {participant.get('last_name', '')}".strip()
    
    # Sort by wins, then point difference
    standings.sort(key=lambda x: (-x.get("wins", 0), -(x.get("points_for", 0) - x.get("points_against", 0))))
    
    # Add ranks
    for i, entry in enumerate(standings):
        entry["rank"] = i + 1
    
    return standings

# ============== CONTROL DESK ==============

@api_router.get("/tournaments/{tournament_id}/control-desk")
async def get_control_desk(tournament_id: str, current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    # Get all resources
    resources = await db.resources.find({"tournament_id": tournament_id, "enabled": True}, {"_id": 0}).to_list(100)
    
    # Enrich with current match info
    for resource in resources:
        if resource.get("current_match_id"):
            match = await db.matches.find_one({"id": resource["current_match_id"]}, {"_id": 0})
            if match:
                # Get participant names
                competition = await db.competitions.find_one({"id": match["competition_id"]}, {"_id": 0})
                participant_type = competition.get("participant_type", "single") if competition else "single"
                collection = "players" if participant_type == "single" else "teams"
                
                if match.get("participant1_id"):
                    p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0})
                    match["participant1"] = {"id": p1["id"], "name": p1.get("name") or f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip()} if p1 else None
                if match.get("participant2_id"):
                    p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0})
                    match["participant2"] = {"id": p2["id"], "name": p2.get("name") or f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip()} if p2 else None
                
                resource["current_match"] = match
    
    # Get pending matches that can be assigned
    pending_matches = await db.matches.find({
        "tournament_id": tournament_id,
        "status": "pending",
        "resource_id": None,
        "participant1_id": {"$ne": None},
        "participant2_id": {"$ne": None}
    }, {"_id": 0}).to_list(50)
    
    # Get live matches
    live_matches = await db.matches.find({
        "tournament_id": tournament_id,
        "status": "live"
    }, {"_id": 0}).to_list(50)
    
    # Get recent completed matches
    recent_completed = await db.matches.find({
        "tournament_id": tournament_id,
        "status": "completed"
    }, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    return {
        "resources": resources,
        "pending_matches": pending_matches,
        "live_matches": live_matches,
        "recent_completed": recent_completed
    }

@api_router.post("/tournaments/{tournament_id}/control-desk/assign-next")
async def assign_next_match(tournament_id: str, resource_id: str, current_user: dict = Depends(require_auth)):
    require_scorekeeper_or_admin(current_user)
    
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.get("locked"):
        raise HTTPException(status_code=400, detail="Resource is locked")
    if resource.get("current_match_id"):
        raise HTTPException(status_code=400, detail="Resource already has a match")
    
    # Find next pending match for this sport
    next_match = await db.matches.find_one({
        "tournament_id": tournament_id,
        "status": "pending",
        "resource_id": None,
        "participant1_id": {"$ne": None},
        "participant2_id": {"$ne": None}
    }, {"_id": 0})
    
    if not next_match:
        raise HTTPException(status_code=404, detail="No pending matches available")
    
    await db.matches.update_one({"id": next_match["id"]}, {"$set": {"resource_id": resource_id, "status": "scheduled"}})
    await db.resources.update_one({"id": resource_id}, {"$set": {"current_match_id": next_match["id"]}})
    
    return {"message": "Next match assigned", "match_id": next_match["id"]}

# ============== PUBLIC BOARD (No auth required) ==============

@api_router.get("/public/tournaments")
async def public_list_tournaments():
    tournaments = await db.tournaments.find({}, {"_id": 0, "id": 1, "name": 1, "venue": 1, "start_date": 1, "status": 1}).to_list(100)
    return tournaments

@api_router.get("/public/tournaments/{tournament_id}/board")
async def public_board(tournament_id: str):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0, "id": 1, "name": 1, "venue": 1})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Get resources with current matches
    resources = await db.resources.find({"tournament_id": tournament_id, "enabled": True}, {"_id": 0}).to_list(100)
    
    for resource in resources:
        if resource.get("current_match_id"):
            match = await db.matches.find_one({"id": resource["current_match_id"]}, {"_id": 0})
            if match:
                competition = await db.competitions.find_one({"id": match["competition_id"]}, {"_id": 0})
                participant_type = competition.get("participant_type", "single") if competition else "single"
                collection = "players" if participant_type == "single" else "teams"
                
                if match.get("participant1_id"):
                    p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0})
                    match["participant1_name"] = (p1.get("name") or f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip()) if p1 else "TBD"
                if match.get("participant2_id"):
                    p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0})
                    match["participant2_name"] = (p2.get("name") or f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip()) if p2 else "TBD"
                
                resource["current_match"] = match
    
    # Get recent results
    recent_results = await db.matches.find({
        "tournament_id": tournament_id,
        "status": "completed"
    }, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    for match in recent_results:
        competition = await db.competitions.find_one({"id": match["competition_id"]}, {"_id": 0})
        participant_type = competition.get("participant_type", "single") if competition else "single"
        collection = "players" if participant_type == "single" else "teams"
        
        if match.get("participant1_id"):
            p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0})
            match["participant1_name"] = (p1.get("name") or f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip()) if p1 else "TBD"
        if match.get("participant2_id"):
            p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0})
            match["participant2_name"] = (p2.get("name") or f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip()) if p2 else "TBD"
    
    return {
        "tournament": tournament,
        "resources": resources,
        "recent_results": recent_results
    }

# ============== DASHBOARD STATS ==============

@api_router.get("/tournaments/{tournament_id}/stats")
async def get_tournament_stats(tournament_id: str, current_user: dict = Depends(require_auth)):
    total_players = await db.players.count_documents({"tournament_id": tournament_id})
    total_teams = await db.teams.count_documents({"tournament_id": tournament_id})
    total_resources = await db.resources.count_documents({"tournament_id": tournament_id})
    total_divisions = await db.divisions.count_documents({"tournament_id": tournament_id})
    total_competitions = await db.competitions.count_documents({"tournament_id": tournament_id})
    total_matches = await db.matches.count_documents({"tournament_id": tournament_id})
    completed_matches = await db.matches.count_documents({"tournament_id": tournament_id, "status": "completed"})
    live_matches = await db.matches.count_documents({"tournament_id": tournament_id, "status": "live"})
    
    # Players by sport
    pipeline = [
        {"$match": {"tournament_id": tournament_id}},
        {"$unwind": "$sports"},
        {"$group": {"_id": "$sports", "count": {"$sum": 1}}}
    ]
    sport_breakdown = await db.players.aggregate(pipeline).to_list(10)
    sport_breakdown_dict = {s["_id"]: s["count"] for s in sport_breakdown}
    
    return {
        "total_players": total_players,
        "total_teams": total_teams,
        "total_resources": total_resources,
        "total_divisions": total_divisions,
        "total_competitions": total_competitions,
        "total_matches": total_matches,
        "completed_matches": completed_matches,
        "live_matches": live_matches,
        "sport_breakdown": sport_breakdown_dict
    }

# ============== GLOBAL DASHBOARD STATS ==============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(require_auth)):
    """Get overall dashboard stats across all tournaments"""
    total_tournaments = await db.tournaments.count_documents({})
    active_tournaments = await db.tournaments.count_documents({"status": {"$in": ["in_progress", "draw_generated"]}})
    total_players = await db.players.count_documents({})
    total_teams = await db.teams.count_documents({})
    total_matches = await db.matches.count_documents({})
    completed_matches = await db.matches.count_documents({"status": "completed"})
    
    # Players by sport
    pipeline = [
        {"$unwind": {"path": "$sports", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$sports", "count": {"$sum": 1}}}
    ]
    sport_results = await db.players.aggregate(pipeline).to_list(20)
    sport_breakdown = {r["_id"]: r["count"] for r in sport_results if r["_id"]}
    
    # Recent tournaments
    recent_tournaments = await db.tournaments.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    
    return {
        "total_tournaments": total_tournaments,
        "active_tournaments": active_tournaments,
        "total_players": total_players,
        "total_teams": total_teams,
        "total_matches": total_matches,
        "completed_matches": completed_matches,
        "sport_breakdown": sport_breakdown,
        "recent_tournaments": recent_tournaments
    }

# ============== REFEREE DIGITAL SCORING ==============

def generate_access_code():
    """Generate 6-digit access code"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

def generate_qr_code_base64(data: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/referee-access")
async def generate_referee_access(
    tournament_id: str, 
    match_id: str, 
    referee_name: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Generate QR code and OTP for referee to access match scoring"""
    await require_tournament_access(tournament_id, current_user)
    
    match = await db.matches.find_one({"id": match_id, "tournament_id": tournament_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Generate access credentials
    access_code = generate_access_code()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    # Create scoring URL (will be embedded in QR)
    base_url = os.environ.get("FRONTEND_URL", "https://rallydesk.app")
    scoring_url = f"{base_url}/referee/{tournament_id}/{match_id}?code={access_code}"
    
    # Generate QR code
    qr_code_base64 = generate_qr_code_base64(scoring_url)
    
    referee_access = {
        "access_code": access_code,
        "expires_at": expires_at,
        "referee_name": referee_name,
        "scoring_url": scoring_url,
        "qr_code": qr_code_base64,
        "generated_by": current_user["id"],
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update match with referee access
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {"referee_access": referee_access, "score_status": "pending"}}
    )
    
    return {
        "access_code": access_code,
        "scoring_url": scoring_url,
        "qr_code": f"data:image/png;base64,{qr_code_base64}",
        "expires_at": expires_at,
        "message": "Share the QR code or access code with the referee"
    }

@api_router.post("/referee/score/{tournament_id}/{match_id}")
async def referee_update_score(
    tournament_id: str,
    match_id: str,
    score_update: RefereeScoreUpdate
):
    """Referee updates match score using access code - NO AUTH REQUIRED"""
    match = await db.matches.find_one({"id": match_id, "tournament_id": tournament_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    referee_access = match.get("referee_access")
    if not referee_access:
        raise HTTPException(status_code=403, detail="No referee access configured for this match")
    
    # Verify access code
    if referee_access.get("access_code") != score_update.access_code:
        raise HTTPException(status_code=403, detail="Invalid access code")
    
    # Check expiration
    expires_at = datetime.fromisoformat(referee_access["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=403, detail="Access code has expired")
    
    # Update scores
    scores_data = [s.model_dump() for s in score_update.scores]
    
    update_data = {
        "scores": scores_data,
        "score_status": "pending",  # Needs organizer confirmation
        "referee_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if score_update.winner_id:
        update_data["winner_id"] = score_update.winner_id
        update_data["status"] = "completed"
    
    if score_update.notes:
        update_data["referee_notes"] = score_update.notes
    
    await db.matches.update_one({"id": match_id}, {"$set": update_data})
    
    return {"message": "Score updated successfully. Awaiting organizer confirmation."}

@api_router.get("/referee/match/{tournament_id}/{match_id}")
async def get_referee_match_info(
    tournament_id: str,
    match_id: str,
    code: str
):
    """Get match info for referee scoring page - validates access code"""
    match = await db.matches.find_one({"id": match_id, "tournament_id": tournament_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    referee_access = match.get("referee_access")
    if not referee_access or referee_access.get("access_code") != code:
        raise HTTPException(status_code=403, detail="Invalid access code")
    
    # Check expiration
    expires_at = datetime.fromisoformat(referee_access["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=403, detail="Access code has expired")
    
    # Get competition for scoring rules
    competition = await db.competitions.find_one({"id": match["competition_id"]}, {"_id": 0})
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0, "name": 1, "settings": 1})
    
    # Get participant names
    participant_type = competition.get("participant_type", "single") if competition else "single"
    collection = "players" if participant_type == "single" else "teams"
    
    p1_name, p2_name = "TBD", "TBD"
    if match.get("participant1_id"):
        p1 = await db[collection].find_one({"id": match["participant1_id"]}, {"_id": 0})
        p1_name = p1.get("name") or f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip() if p1 else "TBD"
    if match.get("participant2_id"):
        p2 = await db[collection].find_one({"id": match["participant2_id"]}, {"_id": 0})
        p2_name = p2.get("name") or f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip() if p2 else "TBD"
    
    # Get scoring rules for this sport
    sport = competition.get("sport", "table_tennis") if competition else "table_tennis"
    scoring_rules = tournament.get("settings", {}).get("scoring_rules", {}).get(sport, {})
    
    return {
        "match_id": match_id,
        "tournament_name": tournament.get("name") if tournament else "",
        "competition_name": competition.get("name") if competition else "",
        "sport": sport,
        "participant1": {"id": match.get("participant1_id"), "name": p1_name},
        "participant2": {"id": match.get("participant2_id"), "name": p2_name},
        "round_number": match.get("round_number"),
        "match_number": match.get("match_number"),
        "current_scores": match.get("scores", []),
        "scoring_rules": scoring_rules,
        "status": match.get("status")
    }

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/confirm-score")
async def confirm_match_score(
    tournament_id: str,
    match_id: str,
    current_user: dict = Depends(require_auth)
):
    """Organizer confirms the score submitted by referee"""
    await require_tournament_access(tournament_id, current_user)
    
    match = await db.matches.find_one({"id": match_id, "tournament_id": tournament_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "score_status": "confirmed",
            "confirmed_by": current_user["id"],
            "confirmed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Score confirmed"}

@api_router.post("/tournaments/{tournament_id}/matches/{match_id}/dispute-score")
async def dispute_match_score(
    tournament_id: str,
    match_id: str,
    reason: str,
    current_user: dict = Depends(require_auth)
):
    """Organizer disputes the score submitted by referee"""
    await require_tournament_access(tournament_id, current_user)
    
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "score_status": "disputed",
            "dispute_reason": reason,
            "disputed_by": current_user["id"],
            "disputed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Score disputed"}

# ============== PDF SCORE SHEET GENERATION ==============

@api_router.get("/tournaments/{tournament_id}/competitions/{competition_id}/score-sheet-pdf")
async def generate_score_sheet_pdf(
    tournament_id: str,
    competition_id: str,
    current_user: dict = Depends(require_auth)
):
    """Generate PDF score sheet for all matches in a competition"""
    await require_tournament_access(tournament_id, current_user)
    
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    competition = await db.competitions.find_one({"id": competition_id, "tournament_id": tournament_id}, {"_id": 0})
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    matches = await db.matches.find(
        {"competition_id": competition_id},
        {"_id": 0}
    ).sort([("round_number", 1), ("match_number", 1)]).to_list(500)
    
    # Get participant names
    participant_type = competition.get("participant_type", "single")
    collection = "players" if participant_type == "single" else "teams"
    
    participant_names = {}
    for match in matches:
        for pid in [match.get("participant1_id"), match.get("participant2_id")]:
            if pid and pid not in participant_names:
                p = await db[collection].find_one({"id": pid}, {"_id": 0})
                if p:
                    participant_names[pid] = p.get("name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
    
    # Get scoring rules
    sport = competition.get("sport", "table_tennis")
    scoring_rules = tournament.get("settings", {}).get("scoring_rules", {}).get(sport, {})
    sets_to_win = scoring_rules.get("sets_to_win", 3)
    total_sets = (sets_to_win * 2) - 1  # Best of 3 = 5 sets max, Best of 2 = 3 sets max
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), topMargin=1*cm, bottomMargin=1*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, alignment=1)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=12, alignment=1)
    
    elements = []
    
    # Title
    elements.append(Paragraph(f"{tournament.get('name', 'Tournament')} - {competition.get('name', 'Competition')}", title_style))
    elements.append(Paragraph(f"Score Sheet - {sport.replace('_', ' ').title()}", subtitle_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Group matches by round
    rounds = {}
    for match in matches:
        round_num = match.get("round_number", 1)
        if round_num not in rounds:
            rounds[round_num] = []
        rounds[round_num].append(match)
    
    # Determine round names based on format
    format_type = competition.get("format", "single_elimination")
    max_round = max(rounds.keys()) if rounds else 1
    
    def get_round_name(round_num, max_round, format_type):
        if format_type == "round_robin":
            return f"Round {round_num}"
        else:
            rounds_from_final = max_round - round_num
            if rounds_from_final == 0:
                return "Final"
            elif rounds_from_final == 1:
                return "Semi-Final"
            elif rounds_from_final == 2:
                return "Quarter-Final"
            else:
                return f"Round {round_num}"
    
    for round_num in sorted(rounds.keys()):
        round_matches = rounds[round_num]
        round_name = get_round_name(round_num, max_round, format_type)
        
        elements.append(Paragraph(f"<b>{round_name}</b>", styles['Heading3']))
        elements.append(Spacer(1, 0.3*cm))
        
        # Create table for matches
        header = ['#', 'Player/Team 1', 'Player/Team 2'] + [f'Set {i+1}' for i in range(total_sets)] + ['Winner', 'Referee Sign']
        table_data = [header]
        
        for match in round_matches:
            p1_name = participant_names.get(match.get("participant1_id"), "TBD / Winner of...")
            p2_name = participant_names.get(match.get("participant2_id"), "TBD / Winner of...")
            
            # Check if this is a playoff match (participants not yet determined)
            if not match.get("participant1_id"):
                p1_name = f"Winner Match {match.get('bracket_position', '?').split('_')[0] if match.get('bracket_position') else '?'}"
            if not match.get("participant2_id"):
                p2_name = f"Winner Match {match.get('bracket_position', '?').split('_')[1] if match.get('bracket_position') else '?'}"
            
            # Set score boxes (empty for filling in)
            set_scores = ['      ' for _ in range(total_sets)]
            if match.get("scores"):
                for i, score in enumerate(match["scores"][:total_sets]):
                    set_scores[i] = f"{score.get('score1', '')}-{score.get('score2', '')}"
            
            winner = participant_names.get(match.get("winner_id"), "")
            
            row = [
                str(match.get("match_number", "")),
                p1_name[:25] + "..." if len(p1_name) > 25 else p1_name,
                p2_name[:25] + "..." if len(p2_name) > 25 else p2_name,
            ] + set_scores + [winner, ""]
            
            table_data.append(row)
        
        # Style the table
        col_widths = [0.5*cm, 5*cm, 5*cm] + [1.5*cm] * total_sets + [4*cm, 3*cm]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWHEIGHT', (0, 1), (-1, -1), 1*cm),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.5*cm))
    
    # Footer
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Paragraph(f"Scoring: Best of {total_sets} sets | Points to win set: {scoring_rules.get('points_to_win_set', 11)}", styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"score_sheet_{competition.get('name', 'competition').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============== LIVE MATCH CENTER (PUBLIC) ==============

@api_router.get("/live-match-center")
async def get_live_match_center():
    """Get live match center data across all tournaments - no auth required"""
    from datetime import datetime, timedelta
    
    # Get all live matches
    live_matches_raw = await db.matches.find(
        {"status": "live"},
        {"_id": 0}
    ).to_list(50)
    
    live_matches = []
    for match in live_matches_raw:
        # Get tournament info
        tournament = await db.tournaments.find_one({"id": match.get("tournament_id")}, {"_id": 0, "name": 1, "id": 1})
        # Get competition info
        competition = await db.competitions.find_one({"id": match.get("competition_id")}, {"_id": 0, "name": 1, "sport": 1})
        # Get resource info
        resource = await db.resources.find_one({"id": match.get("resource_id")}, {"_id": 0, "label": 1})
        # Get participant names
        p1 = await db.players.find_one({"id": match.get("participant1_id")}, {"_id": 0})
        p2 = await db.players.find_one({"id": match.get("participant2_id")}, {"_id": 0})
        
        # Calculate sets won
        scores = match.get("scores", [])
        p1_sets = sum(1 for s in scores if s.get("score1", 0) > s.get("score2", 0))
        p2_sets = sum(1 for s in scores if s.get("score2", 0) > s.get("score1", 0))
        
        # Get current set score if exists
        current_score = None
        if scores:
            last_set = scores[-1]
            current_score = {"p1": last_set.get("score1", 0), "p2": last_set.get("score2", 0)}
        
        live_matches.append({
            "match_id": match["id"],
            "tournament_id": match.get("tournament_id"),
            "tournament_name": tournament.get("name") if tournament else "Unknown",
            "competition_name": competition.get("name") if competition else "Unknown",
            "sport": competition.get("sport") if competition else "table_tennis",
            "resource_label": resource.get("label") if resource else "Unknown",
            "participant1_name": f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip() if p1 else "TBD",
            "participant2_name": f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip() if p2 else "TBD",
            "p1_sets": p1_sets,
            "p2_sets": p2_sets,
            "current_score": current_score,
            "round_number": match.get("round_number", 1)
        })
    
    # Get recent completed matches (last 24 hours)
    today = datetime.now(timezone.utc)
    recent_results_raw = await db.matches.find(
        {"status": "completed"},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(20)
    
    recent_results = []
    for match in recent_results_raw:
        tournament = await db.tournaments.find_one({"id": match.get("tournament_id")}, {"_id": 0, "name": 1})
        competition = await db.competitions.find_one({"id": match.get("competition_id")}, {"_id": 0, "sport": 1})
        p1 = await db.players.find_one({"id": match.get("participant1_id")}, {"_id": 0})
        p2 = await db.players.find_one({"id": match.get("participant2_id")}, {"_id": 0})
        
        scores = match.get("scores", [])
        p1_sets = sum(1 for s in scores if s.get("score1", 0) > s.get("score2", 0))
        p2_sets = sum(1 for s in scores if s.get("score2", 0) > s.get("score1", 0))
        
        recent_results.append({
            "tournament_name": tournament.get("name") if tournament else "Unknown",
            "sport": competition.get("sport") if competition else "table_tennis",
            "participant1_name": f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip() if p1 else "Unknown",
            "participant2_name": f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip() if p2 else "Unknown",
            "participant1_id": match.get("participant1_id"),
            "participant2_id": match.get("participant2_id"),
            "winner_id": match.get("winner_id"),
            "p1_sets": p1_sets,
            "p2_sets": p2_sets
        })
    
    # Get upcoming matches (pending with both participants assigned)
    upcoming_raw = await db.matches.find(
        {
            "status": "pending",
            "participant1_id": {"$ne": None},
            "participant2_id": {"$ne": None}
        },
        {"_id": 0}
    ).limit(20).to_list(20)
    
    upcoming_matches = []
    for match in upcoming_raw:
        tournament = await db.tournaments.find_one({"id": match.get("tournament_id")}, {"_id": 0, "name": 1})
        competition = await db.competitions.find_one({"id": match.get("competition_id")}, {"_id": 0, "name": 1, "sport": 1})
        p1 = await db.players.find_one({"id": match.get("participant1_id")}, {"_id": 0})
        p2 = await db.players.find_one({"id": match.get("participant2_id")}, {"_id": 0})
        
        upcoming_matches.append({
            "tournament_name": tournament.get("name") if tournament else "Unknown",
            "competition_name": competition.get("name") if competition else "Unknown",
            "sport": competition.get("sport") if competition else "table_tennis",
            "participant1_name": f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip() if p1 else "TBD",
            "participant2_name": f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip() if p2 else "TBD",
            "round_number": match.get("round_number", 1)
        })
    
    # Stats
    total_live = len(live_matches)
    total_completed = await db.matches.count_documents({"status": "completed"})
    total_pending = await db.matches.count_documents({
        "status": "pending",
        "participant1_id": {"$ne": None},
        "participant2_id": {"$ne": None}
    })
    active_tournaments = await db.tournaments.count_documents({"status": {"$in": ["in_progress", "draw_generated"]}})
    
    return {
        "live_matches": live_matches,
        "recent_results": recent_results,
        "upcoming_matches": upcoming_matches,
        "stats": {
            "live": total_live,
            "completed": total_completed,
            "pending": total_pending,
            "tournaments": active_tournaments
        }
    }

# ============== PUBLIC BOARD ==============

@api_router.get("/tournaments/{tournament_id}/public-board")
async def get_public_board(tournament_id: str):
    """Get public board data for spectators - no auth required"""
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Get resources with current match info
    resources = await db.resources.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(100)
    
    # Populate current match info for each resource
    for resource in resources:
        if resource.get("current_match_id"):
            match = await db.matches.find_one({"id": resource["current_match_id"]}, {"_id": 0})
            if match:
                # Get participant names
                p1 = await db.players.find_one({"id": match.get("participant1_id")}, {"_id": 0})
                p2 = await db.players.find_one({"id": match.get("participant2_id")}, {"_id": 0})
                match["participant1_name"] = f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip() if p1 else "TBD"
                match["participant2_name"] = f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip() if p2 else "TBD"
                resource["current_match"] = match
    
    # Get recent completed matches
    recent_matches = await db.matches.find(
        {"tournament_id": tournament_id, "status": "completed"},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(10)
    
    # Add participant names to recent results
    for match in recent_matches:
        p1 = await db.players.find_one({"id": match.get("participant1_id")}, {"_id": 0})
        p2 = await db.players.find_one({"id": match.get("participant2_id")}, {"_id": 0})
        match["participant1_name"] = f"{p1.get('first_name', '')} {p1.get('last_name', '')}".strip() if p1 else "Unknown"
        match["participant2_name"] = f"{p2.get('first_name', '')} {p2.get('last_name', '')}".strip() if p2 else "Unknown"
    
    return {
        "tournament": {
            "id": tournament["id"],
            "name": tournament["name"],
            "venue": tournament.get("venue"),
            "status": tournament["status"]
        },
        "resources": resources,
        "recent_results": recent_matches
    }

# ============== LEADERBOARD ROUTES ==============

@api_router.get("/leaderboard/{sport}")
async def get_leaderboard(sport: str, current_user: dict = Depends(get_current_user)):
    """Get player leaderboard for a specific sport across all tournaments"""
    if sport not in SPORTS:
        raise HTTPException(status_code=400, detail=f"Invalid sport. Must be one of: {SPORTS}")
    
    # Get all players who play this sport
    players = await db.players.find(
        {"sports": sport, "matches_played": {"$gt": 0}},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate win rate and prepare leaderboard data
    leaderboard = []
    for player in players:
        wins = player.get("wins", 0)
        losses = player.get("losses", 0)
        matches_played = player.get("matches_played", 0)
        
        win_rate = round((wins / matches_played) * 100) if matches_played > 0 else 0
        
        leaderboard.append({
            "id": player["id"],
            "name": f"{player.get('first_name', '')} {player.get('last_name', '')}".strip(),
            "skill_level": player.get("skill_level", "intermediate"),
            "rating": player.get("rating", 0),
            "wins": wins,
            "losses": losses,
            "matches_played": matches_played,
            "win_rate": win_rate,
            "rank": 0  # Will be set after sorting
        })
    
    # Sort by wins (primary), then win_rate (secondary), then rating (tertiary)
    leaderboard.sort(key=lambda x: (-x["wins"], -x["win_rate"], -x.get("rating", 0)))
    
    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return leaderboard

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "RallyDesk - Multi-Sport Tournament Platform API", "version": "2.0"}

# Include router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
