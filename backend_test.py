import requests
import sys
import json
from datetime import datetime
import time

class SportsArenaAPITester:
    def __init__(self, base_url="https://rally-desk-preview.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.created_entities = {
            'players': [],
            'teams': [],
            'resources': [],
            'tournaments': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, return_response=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Expected {expected_status}, got {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    if return_response:
                        return success, response_data
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health/root endpoint"""
        success, response = self.run_test("API Health Check", "GET", "", 200)
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        user_data = {
            "email": f"testuser_{timestamp}@arena.com",
            "password": "TestPassword123!",
            "name": f"Test User {timestamp}"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data,
            return_response=True
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user', {}).get('id')
            print(f"✅ Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            print("⚠️  Skipping login test - no registration token available")
            return True
            
        # We'll test with a pre-created user for login test
        login_data = {
            "email": "admin@arena.com", 
            "password": "admin123"
        }
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        return success

    def test_get_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_player(self):
        """Test creating players for both sports"""
        players_data = [
            {
                "name": "John Ping",
                "email": "john.ping@arena.com",
                "phone": "+1234567890",
                "sport": "table_tennis",
                "skill_level": "advanced"
            },
            {
                "name": "Jane Shuttle",
                "email": "jane.shuttle@arena.com", 
                "phone": "+1234567891",
                "sport": "badminton",
                "skill_level": "intermediate"
            }
        ]
        
        for player_data in players_data:
            success, response = self.run_test(
                f"Create Player - {player_data['name']}",
                "POST",
                "players",
                200,
                data=player_data,
                return_response=True
            )
            if success and 'id' in response:
                self.created_entities['players'].append(response['id'])
        
        return len(self.created_entities['players']) > 0

    def test_get_players(self):
        """Test getting players list"""
        success, response = self.run_test("Get All Players", "GET", "players", 200)
        if success:
            # Test filtering by sport
            success2, _ = self.run_test("Get Table Tennis Players", "GET", "players?sport=table_tennis", 200)
            success3, _ = self.run_test("Get Badminton Players", "GET", "players?sport=badminton", 200)
            return success and success2 and success3
        return success

    def test_get_single_player(self):
        """Test getting a specific player"""
        if not self.created_entities['players']:
            print("⚠️  Skipping single player test - no players created")
            return True
            
        player_id = self.created_entities['players'][0]
        success, response = self.run_test(
            f"Get Player {player_id}",
            "GET", 
            f"players/{player_id}",
            200
        )
        return success

    def test_update_player(self):
        """Test updating a player"""
        if not self.created_entities['players']:
            print("⚠️  Skipping player update test - no players created")
            return True
            
        player_id = self.created_entities['players'][0]
        update_data = {
            "name": "John Ping Updated",
            "email": "john.updated@arena.com",
            "phone": "+1234567890",
            "sport": "table_tennis",
            "skill_level": "pro"
        }
        success, response = self.run_test(
            f"Update Player {player_id}",
            "PUT",
            f"players/{player_id}",
            200,
            data=update_data
        )
        return success

    def test_create_team(self):
        """Test creating teams"""
        if len(self.created_entities['players']) < 2:
            print("⚠️  Skipping team creation - need at least 2 players")
            return True
            
        team_data = {
            "name": "Dynamic Duo",
            "sport": "table_tennis",
            "player_ids": self.created_entities['players'][:2]
        }
        success, response = self.run_test(
            "Create Team",
            "POST",
            "teams",
            200,
            data=team_data,
            return_response=True
        )
        if success and 'id' in response:
            self.created_entities['teams'].append(response['id'])
        return success

    def test_get_teams(self):
        """Test getting teams"""
        success, response = self.run_test("Get All Teams", "GET", "teams", 200)
        return success

    def test_create_resource(self):
        """Test creating resources"""
        resources_data = [
            {
                "name": "Table 1",
                "resource_type": "table",
                "sport": "table_tennis",
                "location": "Hall A",
                "status": "available"
            },
            {
                "name": "Court A",
                "resource_type": "court", 
                "sport": "badminton",
                "location": "Hall B",
                "status": "available"
            }
        ]
        
        for resource_data in resources_data:
            success, response = self.run_test(
                f"Create Resource - {resource_data['name']}",
                "POST",
                "resources",
                200,
                data=resource_data,
                return_response=True
            )
            if success and 'id' in response:
                self.created_entities['resources'].append(response['id'])
        
        return len(self.created_entities['resources']) > 0

    def test_get_resources(self):
        """Test getting resources"""
        success, response = self.run_test("Get All Resources", "GET", "resources", 200)
        return success

    def test_create_tournament(self):
        """Test creating tournaments"""
        tournaments_data = [
            {
                "name": "Arena Table Tennis Championship",
                "sport": "table_tennis",
                "format": "single_elimination", 
                "match_type": "singles",
                "start_date": "2024-02-01T10:00:00Z",
                "end_date": "2024-02-03T18:00:00Z",
                "max_participants": 16,
                "description": "Annual table tennis championship",
                "sets_to_win": 3,
                "points_per_set": 11
            },
            {
                "name": "Badminton Open",
                "sport": "badminton",
                "format": "round_robin",
                "match_type": "doubles", 
                "start_date": "2024-02-05T09:00:00Z",
                "max_participants": 8,
                "description": "Open doubles tournament",
                "sets_to_win": 3,
                "points_per_set": 21
            }
        ]
        
        for tournament_data in tournaments_data:
            success, response = self.run_test(
                f"Create Tournament - {tournament_data['name']}",
                "POST",
                "tournaments", 
                200,
                data=tournament_data,
                return_response=True
            )
            if success and 'id' in response:
                self.created_entities['tournaments'].append(response['id'])
        
        return len(self.created_entities['tournaments']) > 0

    def test_get_tournaments(self):
        """Test getting tournaments"""
        success, response = self.run_test("Get All Tournaments", "GET", "tournaments", 200)
        return success

    def test_tournament_participants(self):
        """Test adding/removing participants to/from tournament"""
        if not self.created_entities['tournaments'] or not self.created_entities['players']:
            print("⚠️  Skipping participant tests - no tournaments or players created")
            return True
            
        tournament_id = self.created_entities['tournaments'][0]  # Table tennis tournament
        player_id = self.created_entities['players'][0]  # Should be table tennis player
        
        # Add participant
        success1, _ = self.run_test(
            "Add Tournament Participant",
            "POST",
            f"tournaments/{tournament_id}/participants/{player_id}",
            200
        )
        
        # Get participants
        success2, _ = self.run_test(
            "Get Tournament Participants",
            "GET",
            f"tournaments/{tournament_id}/participants",
            200
        )
        
        return success1 and success2

    def test_generate_bracket(self):
        """Test bracket generation"""
        if not self.created_entities['tournaments']:
            print("⚠️  Skipping bracket generation - no tournaments created")
            return True
            
        tournament_id = self.created_entities['tournaments'][0]
        
        # Add more players to tournament first
        for player_id in self.created_entities['players'][:2]:  # Add first 2 players
            self.run_test(
                "Add Player for Bracket",
                "POST", 
                f"tournaments/{tournament_id}/participants/{player_id}",
                200
            )
        
        # Generate bracket
        success, response = self.run_test(
            "Generate Tournament Bracket",
            "POST",
            f"tournaments/{tournament_id}/generate-bracket", 
            200
        )
        return success

    def test_get_matches(self):
        """Test getting tournament matches"""
        if not self.created_entities['tournaments']:
            print("⚠️  Skipping matches test - no tournaments created")
            return True
            
        tournament_id = self.created_entities['tournaments'][0]
        success, response = self.run_test(
            "Get Tournament Matches",
            "GET",
            f"tournaments/{tournament_id}/matches",
            200
        )
        return success

    def test_leaderboard(self):
        """Test leaderboard endpoints"""
        success1, _ = self.run_test("Get Table Tennis Leaderboard", "GET", "leaderboard/table_tennis", 200)
        success2, _ = self.run_test("Get Badminton Leaderboard", "GET", "leaderboard/badminton", 200)
        return success1 and success2

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Get Dashboard Stats", "GET", "stats/dashboard", 200)
        return success

    def cleanup_entities(self):
        """Clean up created test entities"""
        print(f"\n🧹 Cleaning up test entities...")
        
        # Delete players
        for player_id in self.created_entities['players']:
            self.run_test(f"Cleanup Player {player_id}", "DELETE", f"players/{player_id}", 200)
        
        # Delete teams  
        for team_id in self.created_entities['teams']:
            self.run_test(f"Cleanup Team {team_id}", "DELETE", f"teams/{team_id}", 200)
            
        # Delete resources
        for resource_id in self.created_entities['resources']:
            self.run_test(f"Cleanup Resource {resource_id}", "DELETE", f"resources/{resource_id}", 200)

def main():
    print("🏓 Starting Sports Arena API Tests 🏸")
    print("=" * 50)
    
    tester = SportsArenaAPITester()
    
    # Test sequence
    tests = [
        ("API Health Check", tester.test_health_check),
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login), 
        ("Get Profile", tester.test_get_profile),
        ("Create Players", tester.test_create_player),
        ("Get Players", tester.test_get_players),
        ("Get Single Player", tester.test_get_single_player),
        ("Update Player", tester.test_update_player),
        ("Create Team", tester.test_create_team),
        ("Get Teams", tester.test_get_teams),
        ("Create Resources", tester.test_create_resource),
        ("Get Resources", tester.test_get_resources),
        ("Create Tournaments", tester.test_create_tournament),
        ("Get Tournaments", tester.test_get_tournaments),
        ("Tournament Participants", tester.test_tournament_participants),
        ("Generate Bracket", tester.test_generate_bracket),
        ("Get Matches", tester.test_get_matches),
        ("Leaderboard", tester.test_leaderboard),
        ("Dashboard Stats", tester.test_dashboard_stats)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} crashed: {str(e)}")
            failed_tests.append(test_name)
    
    # Cleanup
    tester.cleanup_entities()
    
    # Print results
    print(f"\n📊 API Test Results")
    print("=" * 50) 
    print(f"Total tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())