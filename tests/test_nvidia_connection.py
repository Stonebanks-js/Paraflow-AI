#!/usr/bin/env python3
"""
NVIDIA AI Connectivity Test
Phase 1 - Verification Script

Tests direct connectivity to NVIDIA AI API with the new configuration.
"""

import sys
import os
import time
import json

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from openai import OpenAI

# Configuration
NVIDIA_API_KEY = "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"
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
MODEL = "nvidia/nemotron-3-ultra-550b-a55b"


def test_direct_nvidia():
    """Test direct NVIDIA API call."""
    print("=" * 60)
    print("NVIDIA AI DIRECT CONNECTION TEST")
    print("=" * 60)

    print(f"\n[CONFIGURATION]")
    print(f"  API Key: {NVIDIA_API_KEY[:20]}...")
    print(f"  Base URL: {NVIDIA_BASE_URL}")
    print(f"  Model: {MODEL}")

    print(f"\n[INITIALIZING CLIENT]")
    client = OpenAI(
        base_url=NVIDIA_BASE_URL,
        api_key=NVIDIA_API_KEY,
        timeout=120.0,
        max_retries=3,
    )
    print(f"  Client: OK")

    # Test 1: Simple request
    print(f"\n[TEST 1] Simple Request")
    print(f"  Prompt: 'Reply with exactly: NVIDIA API WORKING'")

    start = time.time()
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": "Reply with exactly: NVIDIA API WORKING"}
            ],
            temperature=1,
            top_p=0.95,
            max_tokens=100,
        )
        latency = (time.time() - start) * 1000

        output = response.choices[0].message.content
        usage = response.usage.model_dump() if response.usage else {}

        print(f"\n  [RESULT] SUCCESS")
        print(f"  Status: 200 OK")
        print(f"  Latency: {latency:.0f}ms")
        print(f"  Output: {output}")
        print(f"  Model: {response.model}")
        print(f"  Usage: {json.dumps(usage, indent=2)}")

        test1_passed = True

    except Exception as e:
        print(f"\n  [RESULT] FAILED")
        print(f"  Error: {str(e)}")
        test1_passed = False

    # Test 2: Request with thinking enabled
    print(f"\n[TEST 2] Request with Thinking Enabled")
    print(f"  Prompt: 'What is 2+2? Explain your reasoning.'")

    start = time.time()
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": "What is 2+2? Explain your reasoning."}
            ],
            temperature=1,
            top_p=0.95,
            max_tokens=512,
            extra_body={
                "chat_template_kwargs": {"enable_thinking": True},
                "reasoning_budget": 512,
            },
        )
        latency = (time.time() - start) * 1000

        output = response.choices[0].message.content
        usage = response.usage.model_dump() if response.usage else {}

        print(f"\n  [RESULT] SUCCESS")
        print(f"  Status: 200 OK")
        print(f"  Latency: {latency:.0f}ms")
        print(f"  Output: {output[:500]}...")
        print(f"  Model: {response.model}")
        print(f"  Usage: {json.dumps(usage, indent=2)}")

        test2_passed = True

    except Exception as e:
        print(f"\n  [RESULT] FAILED")
        print(f"  Error: {str(e)}")
        test2_passed = False

    # Test 3: Streaming request
    print(f"\n[TEST 3] Streaming Request")
    print(f"  Prompt: 'Count from 1 to 5.'")

    start = time.time()
    chunks_received = 0
    full_output = ""

    try:
        stream = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": "Count from 1 to 5."}
            ],
            temperature=1,
            top_p=0.95,
            max_tokens=100,
            stream=True,
            extra_body={
                "chat_template_kwargs": {"enable_thinking": True},
                "reasoning_budget": 512,
            },
        )

        print(f"\n  [STREAMING]")
        for chunk in stream:
            if not chunk.choices:
                continue

            reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None)
            if reasoning:
                print(f"    [REASONING] {reasoning[:50]}...", flush=True)

            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                full_output += content
                chunks_received += 1
                print(f"    [CONTENT] {content}", end="", flush=True)

        latency = (time.time() - start) * 1000
        print(f"\n")

        print(f"\n  [RESULT] SUCCESS")
        print(f"  Status: Stream Complete")
        print(f"  Latency: {latency:.0f}ms")
        print(f"  Chunks: {chunks_received}")
        print(f"  Full Output: {full_output}")

        test3_passed = True

    except Exception as e:
        print(f"\n  [RESULT] FAILED")
        print(f"  Error: {str(e)}")
        test3_passed = False

    # Test 4: Paraphrase request
    print(f"\n[TEST 4] Paraphrase Request (Real Use Case)")
    print(f"  Input: 'The quick brown fox jumps over the lazy dog.'")

    start = time.time()
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional writer. Rewrite the following text maintaining its meaning but improving clarity. Only provide the paraphrased text, no explanations."
                },
                {
                    "role": "user",
                    "content": "The quick brown fox jumps over the lazy dog."
                }
            ],
            temperature=1,
            top_p=0.95,
            max_tokens=200,
        )
        latency = (time.time() - start) * 1000

        output = response.choices[0].message.content
        usage = response.usage.model_dump() if response.usage else {}

        print(f"\n  [RESULT] SUCCESS")
        print(f"  Status: 200 OK")
        print(f"  Latency: {latency:.0f}ms")
        print(f"  Paraphrased: {output}")
        print(f"  Model: {response.model}")
        print(f"  Usage: {json.dumps(usage, indent=2)}")

        test4_passed = True

    except Exception as e:
        print(f"\n  [RESULT] FAILED")
        print(f"  Error: {str(e)}")
        test4_passed = False

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    tests = [
        ("Test 1: Simple Request", test1_passed),
        ("Test 2: Thinking Enabled", test2_passed),
        ("Test 3: Streaming", test3_passed),
        ("Test 4: Paraphrase", test4_passed),
    ]

    for name, passed in tests:
        status = "PASS" if passed else "FAIL"
        symbol = "OK" if passed else "FAIL"
        print(f"  [{symbol}] {name}")

    all_passed = all(p for _, p in tests)

    print("\n" + "=" * 60)
    if all_passed:
        print("NVIDIA AI CONNECTIVITY: ALL TESTS PASSED")
        print("Backend is ready to use NVIDIA AI with real responses.")
    else:
        print("NVIDIA AI CONNECTIVITY: SOME TESTS FAILED")
        print("Check errors above for details.")
    print("=" * 60)

    # Save results
    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "configuration": {
            "api_key": NVIDIA_API_KEY[:20] + "...",
            "base_url": NVIDIA_BASE_URL,
            "model": MODEL,
        },
        "tests": {name: "PASS" if passed else "FAIL" for name, passed in tests},
        "all_passed": all_passed,
    }

    with open("scripts/nvidia_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: scripts/nvidia_test_results.json")

    return all_passed


if __name__ == "__main__":
    success = test_direct_nvidia()
    sys.exit(0 if success else 1)