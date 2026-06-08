#!/usr/bin/env python3
"""
Phase 3-6: Comprehensive API and AI Testing Script
Tests all backend endpoints, authentication, and AI tools.
"""

import asyncio
import httpx
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_EMAIL = f"audit_{int(time.time())}@test.paraflow.ai"
TEST_PASSWORD = "TestPass123!"

classcolors = {
    'reset': '\033[0m',
    'red': '\033[91m',
    'green': '\033[92m',
    'yellow': '\033[93m',
    'blue': '\033[94m',
    'magenta': '\033[95m',
    'cyan': '\033[96m'
}

def print_header(text: str):
    print(f"\n{classcolors['cyan']}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{classcolors['reset']}\n")

def print_result(name: str, status: str, details: str = ""):
    color = classcolors['green'] if status == "PASS" else classcolors['red']
    print(f"{color}[{status}]{classcolors['reset']} {name}")
    if details:
        print(f"      {details}")

def safe_print(text: str):
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('ascii', 'replace').decode('ascii'))

class APITester:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL, timeout=120.0)
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.results: List[Dict[str, Any]] = []
        self.test_email = TEST_EMAIL

    async def close(self):
        await self.client.aclose()

    def record(self, category: str, name: str, status: str, response_code: int,
               response_body: Any = None, error: str = None, latency_ms: float = 0):
        result = {
            "timestamp": datetime.now().isoformat(),
            "category": category,
            "name": name,
            "status": status,
            "response_code": response_code,
            "response_body": response_body,
            "error": error,
            "latency_ms": latency_ms
        }
        self.results.append(result)
        status_symbol = "PASS" if status == "PASS" else "FAIL"
        color = classcolors['green'] if status == "PASS" else classcolors['red']
        safe_print(f"{color}[{status}]{classcolors['reset']} {name} ({response_code}) - {latency_ms:.0f}ms")
        if error and status != "PASS":
            print(f"      {classcolors['red']}Error: {error}{classcolors['reset']}")

    # ==================== AUTH TESTS ====================

    async def test_register(self) -> bool:
        print_header("PHASE 3: AUTHENTICATION - Register")

        # Try to register a new user
        data = {
            "email": self.test_email,
            "password": TEST_PASSWORD,
            "full_name": "Audit Test User"
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/auth/register", json=data)
            latency = (time.time() - start) * 1000

            if response.status_code == 201:
                result = response.json()
                self.record("auth", "Register new user", "PASS", response.status_code,
                           f"User ID: {result.get('id', 'N/A')[:20]}...", latency_ms=latency)
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                self.record("auth", "Register (already exists)", "PASS", response.status_code,
                           "User already registered", latency_ms=latency)
                return True
            else:
                self.record("auth", "Register new user", "FAIL", response.status_code,
                           response.text[:200], latency_ms=latency)
                return False
        except Exception as e:
            self.record("auth", "Register new user", "FAIL", 0, error=str(e)[:200])
            return False

    async def test_login(self) -> bool:
        print_header("PHASE 3: AUTHENTICATION - Login")

        data = {
            "email": self.test_email,
            "password": TEST_PASSWORD
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/auth/login", json=data)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                self.token = result.get("access_token")
                self.record("auth", "Login with valid credentials", "PASS", response.status_code,
                           f"Token: {self.token[:30]}..." if self.token else "No token", latency_ms=latency)

                # Test with wrong password
                start2 = time.time()
                response2 = await self.client.post("/v1/auth/login", json={"email": self.test_email, "password": "wrongpass"})
                latency2 = (time.time() - start2) * 1000
                if response2.status_code == 401:
                    self.record("auth", "Login with wrong password", "PASS", response2.status_code, latency_ms=latency2)
                else:
                    self.record("auth", "Login with wrong password", "FAIL", response2.status_code,
                               f"Expected 401, got {response2.status_code}", latency_ms=latency2)

                return True
            else:
                self.record("auth", "Login with valid credentials", "FAIL", response.status_code,
                           response.text[:200], latency_ms=latency)
                return False
        except Exception as e:
            self.record("auth", "Login with valid credentials", "FAIL", 0, error=str(e)[:200])
            return False

    async def test_protected_endpoints(self) -> bool:
        print_header("PHASE 3: AUTHENTICATION - Protected Endpoints")

        if not self.token:
            self.record("auth", "Get current user", "FAIL", 0, error="No token available")
            return False

        headers = {"Authorization": f"Bearer {self.token}"}

        # Test /users/me
        start = time.time()
        try:
            response = await self.client.get("/v1/users/me", headers=headers)
            latency = (time.time() - start) * 1000
            if response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data.get("id")
                self.record("auth", "Get current user", "PASS", response.status_code,
                           f"User: {user_data.get('email', 'N/A')}", latency_ms=latency)
            else:
                self.record("auth", "Get current user", "FAIL", response.status_code,
                           response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("auth", "Get current user", "FAIL", 0, error=str(e)[:200])

        # Test credits
        start = time.time()
        try:
            response = await self.client.get("/v1/users/credits", headers=headers)
            latency = (time.time() - start) * 1000
            if response.status_code == 200:
                self.record("auth", "Get user credits", "PASS", response.status_code,
                           response.json(), latency_ms=latency)
            else:
                self.record("auth", "Get user credits", "FAIL", response.status_code,
                           response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("auth", "Get user credits", "FAIL", 0, error=str(e)[:200])

        # Test without token (should fail)
        start = time.time()
        try:
            response = await self.client.get("/v1/users/me")
            latency = (time.time() - start) * 1000
            if response.status_code == 401:
                self.record("auth", "Access without token", "PASS", response.status_code,
                           "Correctly rejected", latency_ms=latency)
            else:
                self.record("auth", "Access without token", "FAIL", response.status_code,
                           f"Expected 401, got {response.status_code}", latency_ms=latency)
        except Exception as e:
            self.record("auth", "Access without token", "FAIL", 0, error=str(e)[:200])

        return True

    # ==================== AI TOOL TESTS ====================

    async def test_paraphraser(self):
        print_header("PHASE 6: TOOL VALIDATION - Paraphraser")

        if not self.token:
            self.record("tools", "Paraphraser", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "The quick brown fox jumps over the lazy dog.",
            "mode": "standard",
            "strength": 50
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/paraphrase", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("output"):
                    self.record("tools", "Paraphraser", "PASS", response.status_code,
                               f"Output: {result['output'][:80]}...", latency_ms=latency)
                else:
                    self.record("tools", "Paraphraser", "FAIL", response.status_code,
                               f"No output in response: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Paraphraser", "FAIL", response.status_code,
                           "Insufficient credits", latency_ms=latency)
            elif response.status_code == 401:
                self.record("tools", "Paraphraser", "FAIL", response.status_code,
                           "Unauthorized - token issue", latency_ms=latency)
            else:
                self.record("tools", "Paraphraser", "FAIL", response.status_code,
                           response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Paraphraser", "FAIL", 0, error=str(e)[:200])

    async def test_humanizer(self):
        print_header("PHASE 6: TOOL VALIDATION - Humanizer")

        if not self.token:
            self.record("tools", "Humanizer", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "The weather is nice today. It is sunny and warm.",
            "target_pass_rate": 0.85
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/humanize", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("output"):
                    self.record("tools", "Humanizer", "PASS", response.status_code,
                               f"Output: {result['output'][:80]}...", latency_ms=latency)
                else:
                    self.record("tools", "Humanizer", "FAIL", response.status_code,
                               f"No output: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Humanizer", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "Humanizer", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Humanizer", "FAIL", 0, error=str(e)[:200])

    async def test_grammar(self):
        print_header("PHASE 6: TOOL VALIDATION - Grammar Checker")

        if not self.token:
            self.record("tools", "Grammar Checker", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "She go to the store yesterday.",
            "language": "en"
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/grammar", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("corrected_text"):
                    self.record("tools", "Grammar Checker", "PASS", response.status_code,
                               f"Corrected: {result['corrected_text'][:80]}...", latency_ms=latency)
                else:
                    self.record("tools", "Grammar Checker", "FAIL", response.status_code,
                               f"No corrected_text: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Grammar Checker", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "Grammar Checker", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Grammar Checker", "FAIL", 0, error=str(e)[:200])

    async def test_summarizer(self):
        print_header("PHASE 6: TOOL VALIDATION - Summarizer")

        if not self.token:
            self.record("tools", "Summarizer", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "Python is a high-level programming language. It was created by Guido van Rossum. Python is known for its simple syntax and readability. It is widely used in web development, data science, artificial intelligence, and automation.",
            "style": "concise",
            "max_length": 50
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/summarize", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("summary"):
                    self.record("tools", "Summarizer", "PASS", response.status_code,
                               f"Summary: {result['summary'][:80]}...", latency_ms=latency)
                else:
                    self.record("tools", "Summarizer", "FAIL", response.status_code,
                               f"No summary: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Summarizer", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "Summarizer", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Summarizer", "FAIL", 0, error=str(e)[:200])

    async def test_translator(self):
        print_header("PHASE 6: TOOL VALIDATION - Translator")

        if not self.token:
            self.record("tools", "Translator", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "Hello, how are you today?",
            "source_lang": "en",
            "target_lang": "es",
            "preserve_tone": True
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/translate", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("translated_text"):
                    self.record("tools", "Translator", "PASS", response.status_code,
                               f"Translated: {result['translated_text'][:80]}...", latency_ms=latency)
                else:
                    self.record("tools", "Translator", "FAIL", response.status_code,
                               f"No translated_text: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Translator", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "Translator", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Translator", "FAIL", 0, error=str(e)[:200])

    async def test_detector(self):
        print_header("PHASE 6: TOOL VALIDATION - AI Detector")

        if not self.token:
            self.record("tools", "AI Detector", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "Python is a high-level programming language created by Guido van Rossum."
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/detect", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("result"):
                    self.record("tools", "AI Detector", "PASS", response.status_code,
                               f"Verdict: {result['result'].get('verdict', 'N/A')}, Score: {result['result'].get('score', 'N/A')}", latency_ms=latency)
                else:
                    self.record("tools", "AI Detector", "FAIL", response.status_code,
                               f"No result: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "AI Detector", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "AI Detector", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "AI Detector", "FAIL", 0, error=str(e)[:200])

    async def test_seo(self):
        print_header("PHASE 6: TOOL VALIDATION - SEO Analyzer")

        if not self.token:
            self.record("tools", "SEO Analyzer", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "Python is great for beginners. Learn Python programming today.",
            "target_keywords": ["Python", "programming"],
            "content_type": "blog"
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/seo", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("health_score"):
                    self.record("tools", "SEO Analyzer", "PASS", response.status_code,
                               f"Health Score: {result['health_score']}", latency_ms=latency)
                else:
                    self.record("tools", "SEO Analyzer", "FAIL", response.status_code,
                               f"No health_score: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "SEO Analyzer", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "SEO Analyzer", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "SEO Analyzer", "FAIL", 0, error=str(e)[:200])

    async def test_transform(self):
        print_header("PHASE 6: TOOL VALIDATION - Transform Tool")

        if not self.token:
            self.record("tools", "Transform Tool", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "text": "The weather is nice.",
            "source_format": "plain",
            "target_format": "formal"
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/tools/transform", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                if result.get("transformed_text"):
                    self.record("tools", "Transform Tool", "PASS", response.status_code,
                               f"Transformed: {result['transformed_text'][:80]}...", latency_ms=latency)
                else:
                    self.record("tools", "Transform Tool", "FAIL", response.status_code,
                               f"No transformed_text: {result}", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Transform Tool", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "Transform Tool", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Transform Tool", "FAIL", 0, error=str(e)[:200])

    async def test_health_score(self):
        print_header("PHASE 6: TOOL VALIDATION - Health Score")

        if not self.token:
            self.record("tools", "Health Score", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        start = time.time()
        try:
            response = await self.client.get("/v1/health/score?text=This is a sample text for health scoring.", headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                self.record("tools", "Health Score", "PASS", response.status_code,
                           f"Score: {result.get('score', 'N/A')}", latency_ms=latency)
            else:
                self.record("tools", "Health Score", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Health Score", "FAIL", 0, error=str(e)[:200])

    async def test_writing_dna(self):
        print_header("PHASE 6: TOOL VALIDATION - Writing DNA")

        if not self.token:
            self.record("tools", "Writing DNA Enroll", "FAIL", 0, error="No token")
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "samples": [
                "The quick brown fox jumps over the lazy dog.",
                "A journey of a thousand miles begins with a single step.",
                "To be or not to be, that is the question."
            ]
        }

        start = time.time()
        try:
            response = await self.client.post("/v1/writing-dna/enroll", json=data, headers=headers)
            latency = (time.time() - start) * 1000

            if response.status_code == 200:
                result = response.json()
                self.record("tools", "Writing DNA Enroll", "PASS", response.status_code,
                           f"Profile ID: {result.get('profile_id', 'N/A')[:20]}...", latency_ms=latency)
            elif response.status_code == 500:
                self.record("tools", "Writing DNA Enroll", "FAIL", response.status_code,
                           "Database error (expected - local DB not running)", latency_ms=latency)
            elif response.status_code == 402:
                self.record("tools", "Writing DNA Enroll", "FAIL", response.status_code, "Insufficient credits", latency_ms=latency)
            else:
                self.record("tools", "Writing DNA Enroll", "FAIL", response.status_code, response.text[:200], latency_ms=latency)
        except Exception as e:
            self.record("tools", "Writing DNA Enroll", "FAIL", 0, error=str(e)[:200])

    def save_results(self):
        print_header("SAVING RESULTS")

        import os
        results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_results.json")

        with open(results_path, "w") as f:
            json.dump(self.results, f, indent=2)

        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        total = len(self.results)

        print(f"\n{classcolors['cyan']}Test Summary:{classcolors['reset']}")
        print(f"  Total: {total}")
        print(f"  {classcolors['green']}Passed: {passed}{classcolors['reset']}")
        print(f"  {classcolors['red']}Failed: {failed}{classcolors['reset']}")
        print(f"\nResults saved to: {results_path}")

        return passed, failed, total

async def main():
    print(f"{classcolors['magenta']}")
    print("="*60)
    print("  PARAFLOW AI - COMPREHENSIVE API & AI TESTING")
    print("="*60)
    print(f"{classcolors['reset']}")

    tester = APITester()

    try:
        # Phase 3: Authentication
        print_header("PHASE 3: AUTHENTICATION")
        await tester.test_register()
        login_success = await tester.test_login()
        if login_success:
            await tester.test_protected_endpoints()

        # Phase 6: AI Tool Validation
        await tester.test_paraphraser()
        await tester.test_humanizer()
        await tester.test_grammar()
        await tester.test_summarizer()
        await tester.test_translator()
        await tester.test_detector()
        await tester.test_seo()
        await tester.test_transform()
        await tester.test_health_score()
        await tester.test_writing_dna()

    finally:
        await tester.close()
        passed, failed, total = tester.save_results()

        print(f"\n{classcolors['cyan']}Final Results:{classcolors['reset']}")
        print(f"  {classcolors['green']}PASS: {passed}{classcolors['reset']} / {total}")
        print(f"  {classcolors['red']}FAIL: {failed}{classcolors['reset']} / {total}")

if __name__ == "__main__":
    asyncio.run(main())