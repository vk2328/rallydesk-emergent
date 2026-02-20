"""
Test suite for Division CRUD, Player Division Assignment, and CSV Import features
Tests the following:
1. Division CRUD - create, list, delete divisions in a tournament
2. Player can be assigned to a division when created manually
3. Filter players by division on the Players tab
4. CSV Import with team column auto-creates teams and associates players
5. CSV Import with division column auto-creates divisions
"""

import pytest
import requests
import os
import io
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOURNAMENT_ID = "f8eb0a09-6bc3-4735-8a57-55bb48a5c836"  # Spring Championship 2026

class TestAuth:
    """Authentication fixtures and helpers"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "themetest",
            "password": "Test1234!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers for authenticated requests"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestDivisionCRUD(TestAuth):
    """Division CRUD tests - create, list, delete divisions"""
    
    def test_list_divisions(self, auth_headers):
        """Test listing divisions for a tournament"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to list divisions: {response.text}"
        divisions = response.json()
        assert isinstance(divisions, list)
        # Should have at least Men's Open division
        print(f"Found {len(divisions)} divisions")
    
    def test_create_division(self, auth_headers):
        """Test creating a new division"""
        test_id = str(uuid.uuid4())[:8]
        division_data = {
            "name": f"TEST_Women's_{test_id}",
            "description": "Test division for women players"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers,
            json=division_data
        )
        assert response.status_code == 200, f"Failed to create division: {response.text}"
        
        division = response.json()
        assert division["name"] == division_data["name"]
        assert division["description"] == division_data["description"]
        assert "id" in division
        assert division["tournament_id"] == TOURNAMENT_ID
        
        # Store for cleanup
        TestDivisionCRUD.created_division_id = division["id"]
        print(f"Created division: {division['name']} (ID: {division['id']})")
        return division["id"]
    
    def test_get_division(self, auth_headers):
        """Test getting a single division by ID"""
        # First list divisions to get an existing one
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        assert response.status_code == 200
        divisions = response.json()
        
        if len(divisions) > 0:
            division_id = divisions[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions/{division_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            division = response.json()
            assert division["id"] == division_id
            print(f"Retrieved division: {division['name']}")
    
    def test_delete_division(self, auth_headers):
        """Test deleting a division"""
        # Create a division to delete
        test_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers,
            json={"name": f"TEST_ToDelete_{test_id}", "description": "Will be deleted"}
        )
        assert response.status_code == 200
        division_id = response.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions/{division_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete division: {response.text}"
        
        # Verify it's deleted
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions/{division_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        print(f"Successfully deleted division {division_id}")


class TestPlayerDivisionAssignment(TestAuth):
    """Test player can be assigned to a division when created manually"""
    
    def test_create_player_with_division(self, auth_headers):
        """Test creating a player with a division assigned"""
        # First get a division ID
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        assert response.status_code == 200
        divisions = response.json()
        
        if len(divisions) == 0:
            pytest.skip("No divisions available to test player assignment")
        
        division_id = divisions[0]["id"]
        division_name = divisions[0]["name"]
        
        # Create player with division
        test_id = str(uuid.uuid4())[:8]
        player_data = {
            "first_name": f"TEST_Div_{test_id}",
            "last_name": "Player",
            "email": f"test_div_{test_id}@test.com",
            "division_id": division_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players",
            headers=auth_headers,
            json=player_data
        )
        assert response.status_code == 200, f"Failed to create player: {response.text}"
        
        player = response.json()
        assert player["division_id"] == division_id
        assert player["division_name"] == division_name
        
        TestPlayerDivisionAssignment.created_player_id = player["id"]
        print(f"Created player {player['first_name']} assigned to division {division_name}")
        return player["id"]
    
    def test_get_player_with_division(self, auth_headers):
        """Test that player's division is correctly returned"""
        if not hasattr(TestPlayerDivisionAssignment, 'created_player_id'):
            pytest.skip("No player created in previous test")
        
        player_id = TestPlayerDivisionAssignment.created_player_id
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players/{player_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        player = response.json()
        assert player["division_id"] is not None
        assert player["division_name"] is not None
        print(f"Player {player['first_name']} is in division: {player['division_name']}")


class TestPlayerDivisionFilter(TestAuth):
    """Test filtering players by division on the Players tab"""
    
    def test_filter_players_by_division(self, auth_headers):
        """Test filtering players by division_id query parameter"""
        # Get all divisions
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        assert response.status_code == 200
        divisions = response.json()
        
        if len(divisions) == 0:
            pytest.skip("No divisions to filter by")
        
        division_id = divisions[0]["id"]
        
        # Filter players by division
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players?division_id={division_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        players = response.json()
        
        # All returned players should have the specified division_id
        for player in players:
            assert player["division_id"] == division_id, \
                f"Player {player['first_name']} has division_id {player['division_id']}, expected {division_id}"
        
        print(f"Found {len(players)} players in division {divisions[0]['name']}")
    
    def test_filter_players_all_divisions(self, auth_headers):
        """Test getting all players (no division filter)"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players",
            headers=auth_headers
        )
        assert response.status_code == 200
        all_players = response.json()
        
        # Now filter by 'all'
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players?division_id=all",
            headers=auth_headers
        )
        assert response.status_code == 200
        filtered_players = response.json()
        
        # Should return same number of players
        assert len(all_players) == len(filtered_players)
        print(f"All divisions filter returns {len(filtered_players)} players")


class TestCSVImport(TestAuth):
    """Test CSV Import functionality with team and division columns"""
    
    def test_csv_template_download(self, auth_headers):
        """Test downloading CSV template"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players/csv/sample",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert 'text/csv' in response.headers.get('content-type', '')
        
        # Check template contains expected columns
        content = response.text
        assert 'firstName' in content or 'first_name' in content
        assert 'team' in content
        assert 'division' in content
        print("CSV template download successful, contains team and division columns")
    
    def test_csv_import_with_team_column_creates_team(self, auth_headers):
        """Test that CSV import with team column auto-creates teams"""
        test_id = str(uuid.uuid4())[:8]
        team_name = f"TEST_Team_{test_id}"
        
        # CSV with team column
        csv_content = f"""firstName,lastName,email,team
TEST_TeamMember1_{test_id},Player,test_tm1_{test_id}@test.com,{team_name}
TEST_TeamMember2_{test_id},Player,test_tm2_{test_id}@test.com,{team_name}
"""
        
        files = {'file': ('players.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players/csv/upload",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == 200, f"CSV upload failed: {response.text}"
        
        result = response.json()
        assert result["created"] >= 2, f"Expected at least 2 players created, got {result['created']}"
        assert result["teams_created"] >= 1, f"Expected at least 1 team created, got {result.get('teams_created', 0)}"
        
        print(f"CSV import created {result['created']} players and {result['teams_created']} teams")
        
        # Verify team was created
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/teams",
            headers=auth_headers
        )
        assert response.status_code == 200
        teams = response.json()
        team_names = [t["name"] for t in teams]
        assert team_name in team_names, f"Team {team_name} not found in teams list"
        
        # Verify team has the players
        team = next(t for t in teams if t["name"] == team_name)
        assert len(team["player_ids"]) >= 2, f"Team should have at least 2 players, has {len(team['player_ids'])}"
        print(f"Team {team_name} created with {len(team['player_ids'])} players")
    
    def test_csv_import_with_division_column_creates_division(self, auth_headers):
        """Test that CSV import with division column auto-creates divisions"""
        test_id = str(uuid.uuid4())[:8]
        division_name = f"TEST_Division_{test_id}"
        
        # CSV with division column (new division name)
        csv_content = f"""firstName,lastName,email,division
TEST_DivPlayer1_{test_id},Player,test_dp1_{test_id}@test.com,{division_name}
TEST_DivPlayer2_{test_id},Player,test_dp2_{test_id}@test.com,{division_name}
"""
        
        files = {'file': ('players.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players/csv/upload",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == 200, f"CSV upload failed: {response.text}"
        
        result = response.json()
        assert result["created"] >= 2, f"Expected at least 2 players created, got {result['created']}"
        assert result["divisions_created"] >= 1, f"Expected at least 1 division created, got {result.get('divisions_created', 0)}"
        
        print(f"CSV import created {result['created']} players and {result['divisions_created']} divisions")
        
        # Verify division was created
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        assert response.status_code == 200
        divisions = response.json()
        division_names = [d["name"] for d in divisions]
        assert division_name in division_names, f"Division {division_name} not found in divisions list"
        
        # Verify players are in the division
        new_division = next(d for d in divisions if d["name"] == division_name)
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players?division_id={new_division['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        players_in_div = response.json()
        assert len(players_in_div) >= 2, f"Division should have at least 2 players, has {len(players_in_div)}"
        print(f"Division {division_name} created with {len(players_in_div)} players")
    
    def test_csv_import_with_default_division(self, auth_headers):
        """Test CSV import assigns default division from query param"""
        # Get existing division
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        assert response.status_code == 200
        divisions = response.json()
        
        if len(divisions) == 0:
            pytest.skip("No divisions available")
        
        default_division_id = divisions[0]["id"]
        division_name = divisions[0]["name"]
        test_id = str(uuid.uuid4())[:8]
        
        # CSV without division column
        csv_content = f"""firstName,lastName,email
TEST_DefaultDiv1_{test_id},Player,test_dd1_{test_id}@test.com
TEST_DefaultDiv2_{test_id},Player,test_dd2_{test_id}@test.com
"""
        
        files = {'file': ('players.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players/csv/upload?division_id={default_division_id}",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == 200, f"CSV upload failed: {response.text}"
        
        result = response.json()
        assert result["created"] >= 2
        print(f"CSV import created {result['created']} players with default division")
        
        # Verify players have the default division
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players?division_id={default_division_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        players = response.json()
        
        # Find our test players
        test_players = [p for p in players if f"TEST_DefaultDiv" in p["first_name"] and test_id in p["first_name"]]
        assert len(test_players) >= 2, f"Expected at least 2 test players in division, found {len(test_players)}"
        
        for player in test_players:
            assert player["division_id"] == default_division_id
            assert player["division_name"] == division_name
        
        print(f"Players correctly assigned to default division {division_name}")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_players(self, auth_headers):
        """Delete TEST_ prefixed players"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players",
            headers=auth_headers
        )
        if response.status_code == 200:
            players = response.json()
            test_players = [p for p in players if "TEST_" in p.get("first_name", "")]
            deleted = 0
            for player in test_players:
                del_response = requests.delete(
                    f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/players/{player['id']}",
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
            print(f"Cleaned up {deleted} test players")
    
    def test_cleanup_test_divisions(self, auth_headers):
        """Delete TEST_ prefixed divisions"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions",
            headers=auth_headers
        )
        if response.status_code == 200:
            divisions = response.json()
            test_divisions = [d for d in divisions if "TEST_" in d.get("name", "")]
            deleted = 0
            for division in test_divisions:
                del_response = requests.delete(
                    f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/divisions/{division['id']}",
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
            print(f"Cleaned up {deleted} test divisions")
    
    def test_cleanup_test_teams(self, auth_headers):
        """Delete TEST_ prefixed teams"""
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/teams",
            headers=auth_headers
        )
        if response.status_code == 200:
            teams = response.json()
            test_teams = [t for t in teams if "TEST_" in t.get("name", "")]
            deleted = 0
            for team in test_teams:
                del_response = requests.delete(
                    f"{BASE_URL}/api/tournaments/{TOURNAMENT_ID}/teams/{team['id']}",
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
            print(f"Cleaned up {deleted} test teams")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
