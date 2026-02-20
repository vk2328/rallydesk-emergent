"""
RallyDesk API Tests for New Features (Iteration 2)
Tests for: Google OAuth session, Public Board, Competition Detail, Match Scoreboard, Control Desk, Standings, Player CSV Import
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============== Fixtures ==============

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="session")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_tournament_id():
    """Pre-existing test tournament ID"""
    return "f8eb0a09-6bc3-4735-8a57-55bb48a5c836"


@pytest.fixture(scope="module")
def test_competition_id():
    """Pre-existing test competition ID with draw generated"""
    return "8eedfa49-8fbd-4b2a-a82f-3e4380a7a75a"


# ============== Google OAuth Tests ==============

class TestGoogleOAuth:
    """Google OAuth endpoint tests"""

    def test_google_session_endpoint_exists(self, api_client):
        """Test that /auth/google/session endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/auth/google/session?session_id=invalid")
        # Should return 401 for invalid session, not 404
        assert response.status_code in [401, 422], f"Expected 401 or 422 for invalid session, got {response.status_code}"
        print("✓ Google OAuth session endpoint exists")

    def test_auth_logout_endpoint(self, admin_client):
        """Test logout endpoint"""
        response = admin_client.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Logout endpoint works")


# ============== Public Board Tests ==============

class TestPublicBoard:
    """Public Board endpoint tests (no auth required)"""

    def test_public_board_endpoint(self, api_client, test_tournament_id):
        """Test /tournaments/{id}/public-board endpoint"""
        response = api_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/public-board")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tournament" in data
        assert "resources" in data
        assert "recent_results" in data
        assert data["tournament"]["id"] == test_tournament_id
        print(f"✓ Public board endpoint works - tournament: {data['tournament']['name']}")

    def test_public_board_nonexistent_tournament(self, api_client):
        """Test public board with invalid tournament ID"""
        response = api_client.get(f"{BASE_URL}/api/tournaments/nonexistent-id-12345/public-board")
        assert response.status_code == 404
        print("✓ Public board returns 404 for nonexistent tournament")

    def test_public_tournaments_list(self, api_client):
        """Test public tournaments list endpoint"""
        response = api_client.get(f"{BASE_URL}/api/public/tournaments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public tournaments list - {len(data)} tournaments")


# ============== Competition Detail Tests ==============

class TestCompetitionDetail:
    """Competition detail endpoint tests"""

    def test_get_competition(self, admin_client, test_tournament_id, test_competition_id):
        """Test getting competition details"""
        response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{test_competition_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_competition_id
        assert "name" in data
        assert "sport" in data
        assert "format" in data
        assert "participant_ids" in data
        print(f"✓ Competition detail: {data['name']} ({data['format']})")

    def test_get_competition_participants(self, admin_client, test_tournament_id, test_competition_id):
        """Test getting competition participants"""
        response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{test_competition_id}/participants"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Competition participants: {len(data)} participants")

    def test_get_competition_matches(self, admin_client, test_tournament_id, test_competition_id):
        """Test getting competition matches"""
        response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{test_competition_id}/matches"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if data:
            match = data[0]
            assert "id" in match
            assert "round_number" in match
            assert "status" in match
        print(f"✓ Competition matches: {len(data)} matches")


# ============== Match Scoreboard Tests ==============

class TestMatchScoreboard:
    """Match scoreboard endpoint tests"""

    def test_get_match(self, admin_client, test_tournament_id, test_competition_id):
        """Test getting match details"""
        # First get a match from the competition
        matches_response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{test_competition_id}/matches"
        )
        matches = matches_response.json()
        
        if not matches:
            pytest.skip("No matches to test")
        
        match_id = matches[0]["id"]
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/matches/{match_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == match_id
        assert "participant1" in data or "participant1_id" in data
        assert "status" in data
        assert "scores" in data
        print(f"✓ Match details: R{data['round_number']}-M{data['match_number']} ({data['status']})")

    def test_update_match_scores(self, admin_client, test_tournament_id, test_competition_id):
        """Test updating match scores (admin/scorekeeper feature)"""
        # Get a pending match
        matches_response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{test_competition_id}/matches"
        )
        matches = matches_response.json()
        
        pending_match = next((m for m in matches if m["status"] == "pending" and m["participant1_id"] and m["participant2_id"]), None)
        if not pending_match:
            pytest.skip("No pending matches with both participants")
        
        match_id = pending_match["id"]
        # Update match status
        response = admin_client.put(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/matches/{match_id}",
            json={"status": "live"}
        )
        assert response.status_code == 200
        print(f"✓ Match status update works")


# ============== Control Desk Tests ==============

class TestControlDesk:
    """Control desk endpoint tests"""

    def test_get_control_desk(self, admin_client, test_tournament_id):
        """Test control desk data endpoint"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/control-desk")
        assert response.status_code == 200
        
        data = response.json()
        assert "resources" in data
        assert "pending_matches" in data
        assert "live_matches" in data
        assert "recent_completed" in data
        print(f"✓ Control desk data: {len(data['resources'])} resources, {len(data['pending_matches'])} pending matches")


# ============== Standings Tests ==============

class TestStandings:
    """Standings endpoint tests"""

    def test_get_competition_standings(self, admin_client, test_tournament_id, test_competition_id):
        """Test competition standings endpoint"""
        response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{test_competition_id}/standings"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Standings may be empty if no matches completed
        print(f"✓ Standings endpoint works - {len(data)} entries")


# ============== Player Import Tests ==============

class TestPlayerImport:
    """Player CSV import endpoint tests"""

    def test_csv_sample_download(self, admin_client, test_tournament_id):
        """Test CSV sample download endpoint"""
        response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players/csv/sample"
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        content = response.text
        assert "firstName" in content or "first_name" in content
        print("✓ CSV sample download works")

    def test_bulk_add_players(self, admin_client, test_tournament_id):
        """Test bulk add players endpoint"""
        unique_id = str(uuid.uuid4())[:6]
        players = [
            {"first_name": f"TEST_Bulk1_{unique_id}", "last_name": "Player", "skill_level": "intermediate"},
            {"first_name": f"TEST_Bulk2_{unique_id}", "last_name": "Player", "skill_level": "advanced"}
        ]
        
        response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players/bulk-add",
            json=players
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["created"] == 2
        print(f"✓ Bulk add players works - created {data['created']} players")


# ============== Tournament Stats Tests ==============

class TestTournamentStats:
    """Tournament statistics endpoint tests"""

    def test_tournament_stats(self, admin_client, test_tournament_id):
        """Test tournament stats endpoint"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_players" in data
        assert "total_teams" in data
        assert "total_resources" in data
        assert "total_competitions" in data
        assert "total_matches" in data
        print(f"✓ Tournament stats: {data['total_players']} players, {data['total_matches']} matches")


# ============== Draw Generation Tests ==============

class TestDrawGeneration:
    """Draw generation endpoint tests"""

    def test_create_competition_and_generate_draw(self, admin_client, test_tournament_id):
        """Test full flow: create competition, add participants, generate draw"""
        unique_id = str(uuid.uuid4())[:6]
        
        # Step 1: Create competition
        comp_response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions",
            json={
                "name": f"TEST_Competition_{unique_id}",
                "sport": "table_tennis",
                "format": "single_elimination",
                "participant_type": "single"
            }
        )
        assert comp_response.status_code == 200
        competition_id = comp_response.json()["id"]
        print(f"✓ Created competition: {competition_id}")
        
        # Step 2: Get existing players
        players_response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players"
        )
        players = players_response.json()
        
        if len(players) < 2:
            pytest.skip("Need at least 2 players for draw generation")
        
        # Step 3: Add participants
        participant_ids = [p["id"] for p in players[:4]]  # Take up to 4 players
        add_response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{competition_id}/participants/bulk",
            json=participant_ids
        )
        assert add_response.status_code == 200
        print(f"✓ Added {len(participant_ids)} participants")
        
        # Step 4: Generate draw
        draw_response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{competition_id}/generate-draw"
        )
        assert draw_response.status_code == 200
        data = draw_response.json()
        assert "match_count" in data
        print(f"✓ Generated draw: {data['match_count']} matches")
        
        # Cleanup - delete competition
        delete_response = admin_client.delete(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{competition_id}"
        )
        assert delete_response.status_code == 200
        print("✓ Cleaned up test competition")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
