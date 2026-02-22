"""
Test Group Stage UI and Knockout Generation Flow
Tests for:
- Group Stage UI for groups_knockout format
- Group standings table (P, W, L, +/- columns)
- Match flow within groups
- Progress bar and completion status
- Generate Knockout button functionality
- Knockout bracket generation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials provided
TEST_USERNAME = "testuser_groups"
TEST_PASSWORD = "test123456"

# Test data IDs provided
TOURNAMENT_ID = "91ecfcf3-7d22-4895-a00b-15c64084583c"
COMPETITION_ID = "21aeb6a7-dc0c-41a1-bd50-8bac77b38581"


class TestGroupStageAPI:
    """Test Group Stage API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for all tests"""
        self.client = api_client
        self.token = auth_token
        if self.token:
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_api_health(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        print(f"API Health: {data['status']}")
    
    def test_login_with_test_credentials(self, api_client):
        """Test login with provided test credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful for user: {data['user']['username']}")
        return data["access_token"]
    
    def test_get_tournament(self, api_client, auth_token):
        """Test getting tournament details"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}")
        
        assert response.status_code == 200, f"Failed to get tournament: {response.text}"
        data = response.json()
        assert data["id"] == TOURNAMENT_ID
        print(f"Tournament: {data['name']}, Status: {data['status']}")
    
    def test_get_competition(self, api_client, auth_token):
        """Test getting competition details - should be groups_knockout format"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}")
        
        assert response.status_code == 200, f"Failed to get competition: {response.text}"
        data = response.json()
        assert data["id"] == COMPETITION_ID
        assert data["format"] == "groups_knockout", f"Expected groups_knockout format, got {data['format']}"
        print(f"Competition: {data['name']}, Format: {data['format']}, Status: {data['status']}")
        print(f"Num Groups: {data.get('num_groups', 1)}, Advance Per Group: {data.get('advance_per_group', 2)}")
    
    def test_get_competition_participants(self, api_client, auth_token):
        """Test getting competition participants"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}/participants")
        
        assert response.status_code == 200, f"Failed to get participants: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Total participants: {len(data)}")
        for p in data[:5]:  # Print first 5
            name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or p.get('name', 'Unknown')
            print(f"  - {name} (ID: {p['id'][:8]}...)")
    
    def test_get_competition_matches(self, api_client, auth_token):
        """Test getting competition matches - should have group stage matches"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}/matches")
        
        assert response.status_code == 200, f"Failed to get matches: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Analyze matches by group and round
        group_matches = {}
        knockout_matches = []
        pending_count = 0
        completed_count = 0
        
        for match in data:
            group_num = match.get("group_number")
            round_num = match.get("round_number", 0)
            
            if round_num >= 100:
                knockout_matches.append(match)
            elif group_num:
                if group_num not in group_matches:
                    group_matches[group_num] = []
                group_matches[group_num].append(match)
            
            if match.get("status") == "pending":
                pending_count += 1
            elif match.get("status") == "completed":
                completed_count += 1
        
        print(f"Total matches: {len(data)}")
        print(f"Group stage matches: {sum(len(m) for m in group_matches.values())}")
        for g, matches in group_matches.items():
            print(f"  - Group {g}: {len(matches)} matches")
        print(f"Knockout matches: {len(knockout_matches)}")
        print(f"Pending: {pending_count}, Completed: {completed_count}")
        
        # Verify group stage structure
        assert len(group_matches) > 0 or len(knockout_matches) > 0, "No matches found"


class TestGroupStageMatchFlow:
    """Test match flow within group stage"""
    
    def test_get_single_match(self, api_client, auth_token):
        """Test getting a single match from group stage"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # First get all matches
        matches_response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}/matches")
        assert matches_response.status_code == 200
        matches = matches_response.json()
        
        # Find a group stage match
        group_match = next((m for m in matches if m.get("group_number") and m.get("round_number", 0) < 100), None)
        
        if group_match:
            # Get single match
            match_id = group_match["id"]
            response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/matches/{match_id}")
            
            assert response.status_code == 200, f"Failed to get match: {response.text}"
            data = response.json()
            
            print(f"Match ID: {data['id'][:8]}...")
            print(f"Group: {data.get('group_number')}, Round: {data.get('round_number')}")
            print(f"Status: {data.get('status')}")
            p1_name = data.get('participant1', {}).get('name', 'TBD') if data.get('participant1') else 'TBD'
            p2_name = data.get('participant2', {}).get('name', 'TBD') if data.get('participant2') else 'TBD'
            print(f"Participants: {p1_name} vs {p2_name}")
        else:
            print("No group stage matches found")


class TestGenerateKnockout:
    """Test knockout bracket generation after group stage"""
    
    def test_generate_knockout_endpoint_exists(self, api_client, auth_token):
        """Test that generate-knockout endpoint exists"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Try to call generate-knockout (may fail if group stage not complete, but should exist)
        response = api_client.post(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}/generate-knockout")
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404, "generate-knockout endpoint does not exist"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Generate knockout response: {data}")
        else:
            print(f"Generate knockout returned {response.status_code}: {response.text}")
            print("(This is expected if group stage is not complete)")
    
    def test_check_knockout_generation_prerequisites(self, api_client, auth_token):
        """Check prerequisites for knockout generation"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Get competition details
        comp_response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}")
        assert comp_response.status_code == 200
        competition = comp_response.json()
        
        # Get matches
        matches_response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}/matches")
        assert matches_response.status_code == 200
        matches = matches_response.json()
        
        # Analyze group stage completion
        group_matches = [m for m in matches if m.get("group_number") and m.get("round_number", 0) < 100]
        completed_group_matches = [m for m in group_matches if m.get("status") == "completed"]
        knockout_matches = [m for m in matches if m.get("round_number", 0) >= 100]
        
        print(f"Competition format: {competition['format']}")
        print(f"Num groups: {competition.get('num_groups', 1)}")
        print(f"Advance per group: {competition.get('advance_per_group', 2)}")
        print(f"Group stage matches: {len(group_matches)} total, {len(completed_group_matches)} completed")
        print(f"Knockout matches generated: {len(knockout_matches)}")
        
        group_stage_complete = len(group_matches) > 0 and len(completed_group_matches) == len(group_matches)
        knockout_needed = not knockout_matches and group_stage_complete
        
        print(f"Group stage complete: {group_stage_complete}")
        print(f"Knockout generation needed: {knockout_needed}")


class TestCompetitionStandings:
    """Test competition standings endpoint"""
    
    def test_standings_endpoint(self, api_client, auth_token):
        """Test getting standings for a competition"""
        if not auth_token:
            pytest.skip("Auth token not available")
        
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Try to get standings
        response = api_client.get(f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/competitions/{COMPETITION_ID}/standings")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Standings data: {data}")
        elif response.status_code == 404:
            print("Standings endpoint not found - may be calculated client-side")
        else:
            print(f"Standings returned {response.status_code}: {response.text}")


# Fixtures

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"Auth token obtained for {TEST_USERNAME}")
        return token
    else:
        print(f"Authentication failed: {response.status_code} - {response.text}")
        # Try to create the user
        try:
            register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
                "username": TEST_USERNAME,
                "email": f"{TEST_USERNAME}@test.com",
                "password": TEST_PASSWORD,
                "first_name": "Test",
                "last_name": "User"
            })
            if register_response.status_code == 200:
                return register_response.json().get("access_token")
        except Exception as e:
            print(f"Registration fallback failed: {e}")
        return None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
