"""
RallyDesk API Test Suite
Tests for: Auth, Tournament, Player, Resource, Competition, and Dashboard Stats APIs
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
    """Pre-existing test tournament ID from main agent context"""
    return "f8eb0a09-6bc3-4735-8a57-55bb48a5c836"


# ============== Auth Tests ==============

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_success(self, api_client):
        """Test login with valid admin credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
        print(f"✓ Login success - user: {data['user']['username']}, role: {data['user']['role']}")

    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected with 401")

    def test_register_new_viewer(self, api_client):
        """Test user registration - new users get 'viewer' role"""
        unique_id = str(uuid.uuid4())[:8]
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"TEST_viewer_{unique_id}",
            "email": f"TEST_viewer_{unique_id}@test.com",
            "password": "testpass123",
            "display_name": "Test Viewer"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "viewer"
        print(f"✓ Registration success - new user with role: {data['user']['role']}")

    def test_register_duplicate_username(self, api_client):
        """Test registration with existing username fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "username": "admin",
            "email": "newemail@test.com",
            "password": "testpass123"
        })
        assert response.status_code == 400
        print("✓ Duplicate username correctly rejected with 400")

    def test_register_short_password(self, api_client):
        """Test registration with short password fails"""
        unique_id = str(uuid.uuid4())[:8]
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"TEST_short_{unique_id}",
            "email": f"TEST_short_{unique_id}@test.com",
            "password": "12345"  # Less than 6 chars
        })
        assert response.status_code == 400
        print("✓ Short password correctly rejected with 400")

    def test_get_current_user(self, admin_client):
        """Test fetching current user profile"""
        response = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert data["username"] == "admin"
        assert data["role"] == "admin"
        print(f"✓ Current user fetched: {data['username']}")


# ============== Tournament Tests ==============

class TestTournaments:
    """Tournament CRUD tests"""

    def test_list_tournaments(self, admin_client):
        """Test listing all tournaments"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} tournaments")

    def test_get_tournament(self, admin_client, test_tournament_id):
        """Test getting a specific tournament"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_tournament_id
        assert "name" in data
        assert "settings" in data
        print(f"✓ Got tournament: {data['name']}")

    def test_create_tournament(self, admin_client):
        """Test creating a new tournament"""
        unique_id = str(uuid.uuid4())[:8]
        tournament_data = {
            "name": f"TEST_Tournament_{unique_id}",
            "venue": "Test Venue",
            "timezone": "UTC",
            "start_date": "2025-02-01T10:00:00Z",
            "end_date": "2025-02-03T18:00:00Z",
            "description": "Test tournament for API testing",
            "settings": {
                "min_rest_minutes": 10,
                "buffer_minutes": 5,
                "scorekeeper_can_assign": True
            }
        }
        
        response = admin_client.post(f"{BASE_URL}/api/tournaments", json=tournament_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == tournament_data["name"]
        assert data["status"] == "draft"
        print(f"✓ Created tournament: {data['name']} (ID: {data['id']})")
        
        # Return tournament ID for cleanup
        return data["id"]

    def test_get_nonexistent_tournament(self, admin_client):
        """Test getting a tournament that doesn't exist"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Nonexistent tournament returns 404")


# ============== Player Tests ==============

class TestPlayers:
    """Player management tests"""

    def test_list_players(self, admin_client, test_tournament_id):
        """Test listing players in a tournament"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/players")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} players in tournament")

    def test_create_player(self, admin_client, test_tournament_id):
        """Test adding a player to tournament"""
        unique_id = str(uuid.uuid4())[:8]
        player_data = {
            "first_name": f"TEST_Player_{unique_id}",
            "last_name": "Tester",
            "email": f"TEST_player_{unique_id}@test.com",
            "gender": "male",
            "skill_level": "intermediate",
            "sports": ["table_tennis", "badminton"]
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players",
            json=player_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["first_name"] == player_data["first_name"]
        assert data["tournament_id"] == test_tournament_id
        print(f"✓ Created player: {data['first_name']} {data['last_name']}")
        
        return data["id"]

    def test_get_player(self, admin_client, test_tournament_id):
        """Test getting a specific player"""
        # First list players to get an ID
        list_response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/players")
        players = list_response.json()
        
        if not players:
            pytest.skip("No players to test")
        
        player_id = players[0]["id"]
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/players/{player_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == player_id
        print(f"✓ Got player: {data['first_name']}")

    def test_delete_player(self, admin_client, test_tournament_id):
        """Test deleting a player"""
        # Create a player first
        unique_id = str(uuid.uuid4())[:8]
        create_response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players",
            json={"first_name": f"TEST_ToDelete_{unique_id}"}
        )
        player_id = create_response.json()["id"]
        
        # Delete the player
        response = admin_client.delete(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players/{player_id}"
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/players/{player_id}"
        )
        assert get_response.status_code == 404
        print("✓ Player deleted and verified not found")


# ============== Resource Tests ==============

class TestResources:
    """Resource (tables/courts) management tests"""

    def test_list_resources(self, admin_client, test_tournament_id):
        """Test listing resources in a tournament"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/resources")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} resources")

    def test_bulk_add_resources(self, admin_client, test_tournament_id):
        """Test bulk adding resources (tables/courts)"""
        response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/resources/bulk-add?sport=table_tennis&count=2"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["created"] == 2
        print(f"✓ Bulk added {data['created']} table tennis tables")

    def test_create_single_resource(self, admin_client, test_tournament_id):
        """Test creating a single resource"""
        unique_id = str(uuid.uuid4())[:8]
        resource_data = {
            "sport": "badminton",
            "label": f"TEST_Court_{unique_id}",
            "location": "Hall A",
            "resource_type": "court",
            "enabled": True
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/resources",
            json=resource_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["label"] == resource_data["label"]
        assert data["sport"] == "badminton"
        print(f"✓ Created resource: {data['label']}")
        
        return data["id"]

    def test_delete_resource(self, admin_client, test_tournament_id):
        """Test deleting a resource"""
        # Create a resource first
        unique_id = str(uuid.uuid4())[:8]
        create_response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/resources",
            json={"sport": "tennis", "label": f"TEST_ToDelete_{unique_id}", "resource_type": "court"}
        )
        resource_id = create_response.json()["id"]
        
        # Delete the resource
        response = admin_client.delete(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/resources/{resource_id}"
        )
        assert response.status_code == 200
        print("✓ Resource deleted successfully")


# ============== Competition Tests ==============

class TestCompetitions:
    """Competition management tests"""

    def test_list_competitions(self, admin_client, test_tournament_id):
        """Test listing competitions in a tournament"""
        response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} competitions")

    def test_create_competition(self, admin_client, test_tournament_id):
        """Test creating a new competition"""
        unique_id = str(uuid.uuid4())[:8]
        competition_data = {
            "name": f"TEST_Singles_{unique_id}",
            "sport": "table_tennis",
            "format": "single_elimination",
            "participant_type": "single",
            "num_groups": 1,
            "advance_per_group": 2
        }
        
        response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions",
            json=competition_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == competition_data["name"]
        assert data["sport"] == "table_tennis"
        assert data["status"] == "draft"
        print(f"✓ Created competition: {data['name']} (format: {data['format']})")
        
        return data["id"]

    def test_get_competition(self, admin_client, test_tournament_id):
        """Test getting a specific competition"""
        # List competitions first
        list_response = admin_client.get(f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions")
        competitions = list_response.json()
        
        if not competitions:
            pytest.skip("No competitions to test")
        
        competition_id = competitions[0]["id"]
        response = admin_client.get(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions/{competition_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == competition_id
        print(f"✓ Got competition: {data['name']}")

    def test_create_competition_invalid_sport(self, admin_client, test_tournament_id):
        """Test creating competition with invalid sport"""
        response = admin_client.post(
            f"{BASE_URL}/api/tournaments/{test_tournament_id}/competitions",
            json={
                "name": "Invalid Sport Competition",
                "sport": "invalid_sport",
                "format": "round_robin",
                "participant_type": "single"
            }
        )
        assert response.status_code == 400
        print("✓ Invalid sport correctly rejected with 400")


# ============== Dashboard Stats Tests ==============

class TestDashboardStats:
    """Dashboard statistics endpoint tests"""

    def test_get_dashboard_stats(self, admin_client):
        """Test getting dashboard statistics"""
        response = admin_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify expected fields
        assert "total_tournaments" in data
        assert "active_tournaments" in data
        assert "total_players" in data
        assert "total_teams" in data
        assert "total_matches" in data
        assert "completed_matches" in data
        assert "sport_breakdown" in data
        assert "recent_tournaments" in data
        
        # Verify data types
        assert isinstance(data["total_tournaments"], int)
        assert isinstance(data["total_players"], int)
        assert isinstance(data["recent_tournaments"], list)
        
        print(f"✓ Dashboard stats: {data['total_tournaments']} tournaments, {data['total_players']} players, {data['total_matches']} matches")


# ============== API Root Tests ==============

class TestAPIRoot:
    """API root and basic endpoints"""

    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "RallyDesk" in data["message"]
        print(f"✓ API root: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
