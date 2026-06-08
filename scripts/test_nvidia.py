#!/usr/bin/env python3
"""
Phase 5: NVIDIA AI Verification Script
Verifies NVIDIA API is working and not falling back to simulation mode.
"""

import httpx
import asyncio
import json
import time

NVIDIA_API_KEY = "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"
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
MODEL = "meta/llama-3.1-8b-instruct"

async def test_nvidia_direct():
    print("="*60)
    print("PHASE 5: NVIDIA AI VERIFICATION")
    print("="*60)

    print("\n[1] Testing Direct NVIDIA API Call...")

    client = httpx.AsyncClient(
        base_url=NVIDIA_BASE_URL,
        headers={
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json"
        },
        timeout=60.0
    )

    start = time.time()
    try:
        response = await client.post("/chat/completions", json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": "You are a professional paraphraser. Rewrite the text maintaining meaning but improving clarity. Only provide the paraphrased text."},
                {"role": "user", "content": "The quick brown fox jumps over the lazy dog."}
            ],
            "max_tokens": 200,
            "temperature": 0.7
        })
        latency = (time.time() - start) * 1000

        print(f"\n    Status: {response.status_code}")
        print(f"    Latency: {latency:.0f}ms")

        if response.status_code == 200:
            data = response.json()
            output = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            print(f"\n    Model: {data.get('model')}")
            print(f"    Output: {output}")
            print(f"    Tokens Used: {usage.get('total_tokens', 'N/A')}")
            print(f"    Prompt Tokens: {usage.get('prompt_tokens', 'N/A')}")
            print(f"    Completion Tokens: {usage.get('completion_tokens', 'N/A')}")

            # Save raw request/response
            with open("scripts/nvidia_raw_response.json", "w") as f:
                json.dump({
                    "request": {
                        "model": MODEL,
                        "messages": [
                            {"role": "system", "content": "You are a professional paraphraser..."},
                            {"role": "user", "content": "The quick brown fox jumps over the lazy dog."}
                        ],
                        "max_tokens": 200,
                        "temperature": 0.7
                    },
                    "response": data,
                    "latency_ms": latency,
                    "usage": usage
                }, f, indent=2)

            print("\n    [PASS] NVIDIA API Direct Call Successful")
            return True
        else:
            print(f"\n    [FAIL] NVIDIA API Error: {response.text[:500]}")
            return False

    except Exception as e:
        print(f"\n    [FAIL] Exception: {str(e)}")
        return False
    finally:
        await client.aclose()


async def test_nvidia_engine():
    print("\n" + "="*60)
    print("[2] Testing NVIDIAEngine Class...")

    import sys
    sys.path.insert(0, '../backend')

    from app.ai.engines.nvidia_engine import NVIDIAEngine

    engine = NVIDIAEngine()

    print(f"\n    Engine API Key Set: {'Yes' if engine.api_key else 'No'}")
    print(f"    Engine Model: {engine.model}")
    print(f"    Engine Client: {'Yes' if engine.client else 'No'}")

    start = time.time()
    result = await engine.process("The weather is nice today.", {"mode": "standard"})
    latency = (time.time() - start) * 1000

    print(f"\n    Result Status: {result.get('status')}")
    print(f"    Result Model: {result.get('model')}")
    print(f"    Latency: {latency:.0f}ms")

    if result.get("output"):
        print(f"    Output: {result.get('output')[:100]}...")

    if result.get("model") == "simulation":
        print("\n    [FAIL] NVIDIAEngine Falling Back to Simulation Mode!")
        print("    Root Cause: NVIDIA API call failed, engine using simulation fallback")
        return False
    elif result.get("status") == "success" and result.get("model") == MODEL:
        print("\n    [PASS] NVIDIAEngine Using Real NVIDIA API")
        return True
    else:
        print("\n    [WARN] Unknown state - check logs")
        return False


async def test_tool_direct():
    print("\n" + "="*60)
    print("[3] Testing ParaphraseEngine Direct...")

    import sys
    sys.path.insert(0, '../backend')

    from app.ai.engines.paraphrase_engine import ParaphraseEngine

    engine = ParaphraseEngine()

    start = time.time()
    result = await engine.process("The quick brown fox jumps over the lazy dog.", {"mode": "standard"})
    latency = (time.time() - start) * 1000

    print(f"\n    Status: {result.get('status')}")
    print(f"    Output: {result.get('output', 'NONE')[:100]}...")
    print(f"    Model Used: {result.get('model_used', 'N/A')}")
    print(f"    Latency: {latency:.0f}ms")

    if result.get('model_used') == "simulation":
        print("\n    [FAIL] ParaphraseEngine Using Simulation Mode!")
        return False
    elif result.get('status') == 'success' and result.get('output'):
        print("\n    [PASS] ParaphraseEngine Working with Real AI")
        return True
    else:
        print("\n    [FAIL] ParaphraseEngine Failed")
        return False


async def main():
    print(f"\nNVIDIA API Key: {NVIDIA_API_KEY[:20]}...")
    print(f"Model: {MODEL}")
    print(f"Base URL: {NVIDIA_BASE_URL}")

    results = []

    # Test 1: Direct API
    results.append(await test_nvidia_direct())

    # Test 2: Engine class
    results.append(await test_nvidia_engine())

    # Test 3: Tool
    results.append(await test_tool_direct())

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    if all(results):
        print("\n[ALL TESTS PASS] - NVIDIA API is working correctly")
        print("Backend is using real AI, not simulation mode")
    else:
        print("\n[SOME TESTS FAILED] - Check above output")
        if not results[0]:
            print("  - NVIDIA Direct API call failed")
        if not results[1]:
            print("  - NVIDIAEngine falling back to simulation")
        if not results[2]:
            print("  - ParaphraseEngine using simulation")

    print(f"\nResults saved to: scripts/nvidia_raw_response.json")

if __name__ == "__main__":
    asyncio.run(main())