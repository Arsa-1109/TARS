"""
Adversarial Memory Exhaustion & Timeout Stress Test (Sandbox Quota Bomb)
Test Objective: Verify that TARS 4-layer OS Job Object sandbox enforces:
1. 512 MB physical memory ceiling (terminates with Win32 Memory Quota Exceeded error).
2. 15.0 second wall-clock timeout ceiling.
"""

import sys
import time

def memory_bomb():
    print("[TEST] Starting adversarial memory allocation stress test...", flush=True)
    chunks = []
    chunk_size = 64 * 1024 * 1024  # 64 MB chunks
    total_allocated_mb = 0
    target_mb = 768  # Intentionally exceeds the 512 MB OS Job Object ceiling!

    try:
        while total_allocated_mb < target_mb:
            print(f"[TEST] Allocating chunk: {total_allocated_mb + 64} MB...", flush=True)
            # Allocate and dirty the memory
            chunks.append(bytearray(chunk_size))
            total_allocated_mb += 64
            time.sleep(0.5)

        print("[FAIL] Memory bomb exceeded 512 MB ceiling without OS Job Object termination!", flush=True)
        # Attempt infinite loop to test 15.0s timeout if memory quota failed
        while True:
            time.sleep(1.0)

    except MemoryError:
        print("[SUCCESS] Process caught MemoryError before system exhaustion.", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    memory_bomb()