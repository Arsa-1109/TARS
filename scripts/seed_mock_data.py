# scripts/seed_mock_data.py
import os
import sys
import json
import time
import glob
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from apps.api.core.db import db
from apps.api.cortex.graph import TarsGraph
from apps.api.ingestion.markitdown_parser import markitdown_parser
from apps.api.ingestion.spec_extractor import spec_extractor
from apps.api.ingestion.action_hub import action_hub_repo
from apps.api.schemas.contracts import ActionItemDTO


def seed():
    print("=" * 60)
    print("SEEDING TARS DATABASE & GRAPH WITH OFFICIAL MOCK DATA")
    print("=" * 60)

    # 1. Seed Decisions into Kùzu Graph & SQLite
    graph = TarsGraph()
    conn = db.get_connection()
    cursor = conn.cursor()

    decisions_dir = root_dir / "mock_data" / "ws5_decisions"
    decision_files = glob.glob(str(decisions_dir / "*.md"))
    print(f"\n[1/4] Seeding {len(decision_files)} Architecture & Business Decisions...")

    for fpath in decision_files:
        filename = os.path.basename(fpath)
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        title = filename.replace(".md", "").replace("-", " ").title()
        dec_id = filename.split("-")[0] if "-" in filename else f"DEC-{hash(filename)%10000}"
        
        # Insert into graph
        try:
            graph.add_decision(
                decision_id=dec_id,
                title=title,
                category="STRATEGY" if "BDR" in dec_id else "ARCHITECTURE",
                context=content[:400],
                chosen_option=f"Enforce policy from {filename}",
                clearance="ALL_TEAM",
            )
        except Exception as e:
            print(f"  Note on graph insertion {dec_id}: {e}")

        # Insert into SQLite memory table for hybrid search
        cursor.execute(
            """
            INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                dec_id,
                "DECISION",
                title,
                content,
                f"mock_data/ws5_decisions/{filename}",
                int(time.time()),
                "decision,policy,architecture",
            ),
        )

    # 2. Seed Knowledge Documents
    ws1_dir = root_dir / "mock_data" / "ws1_knowledge"
    doc_files = glob.glob(str(ws1_dir / "*.*"))
    print(f"\n[2/4] Parsing & Indexing {len(doc_files)} Knowledge Base Documents...")

    for fpath in doc_files:
        filename = os.path.basename(fpath)
        try:
            doc = markitdown_parser.parse_file(fpath, department="EXECUTIVE", clearance="ALL_TEAM")
            cursor.execute(
                """
                INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    doc["doc_id"],
                    "DOCUMENT",
                    filename,
                    doc["content"][:3000],
                    f"mock_data/ws1_knowledge/{filename}",
                    int(time.time()),
                    f"document,{doc['format']}",
                ),
            )
            print(f"  -> Ingested: {filename} ({doc['table_count']} tables, {len(doc['content'])} chars)")
        except Exception as e:
            print(f"  -> Skipping {filename}: {e}")

    # 3. Seed Client Call Transcripts
    ws2_dir = root_dir / "mock_data" / "ws2_studio"
    call_files = glob.glob(str(ws2_dir / "*.vtt"))
    print(f"\n[3/4] Ingesting {len(call_files)} Client Call Transcripts via Voice-to-Spec...")

    for fpath in call_files:
        filename = os.path.basename(fpath)
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            transcript = f.read()

        client_name = "Acme Corp" if "acme" in filename else "Fintech Prospect" if "fintech" in filename else "Board of Directors"
        call_id = f"CALL-{filename.split('_')[0].upper()}"

        spec = spec_extractor.extract_spec(
            transcript=transcript,
            call_id=call_id,
            client_name=client_name,
            sync_to_graph=True,
        )

        cursor.execute(
            """
            INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                call_id,
                "CALL",
                f"Call Recording: {client_name} ({filename})",
                f"Summary: {spec.summary}\nPain Points: {', '.join(spec.pain_points)}\nCommitments: {', '.join(spec.commitments)}",
                f"mock_data/ws2_studio/{filename}",
                int(time.time()),
                f"call,audio,{spec.sentiment}",
            ),
        )
        print(f"  -> Ingested Call: {client_name} (Sentiment: {spec.sentiment}, {len(spec.commitments)} commitments)")

    # 4. Seed Action Items from action_items.json
    action_items_path = root_dir / "mock_data" / "action_items.json"
    print(f"\n[4/4] Populating Action Hub Tasks from action_items.json...")

    if action_items_path.exists():
        with open(action_items_path, "r", encoding="utf-8") as f:
            items_data = json.load(f)

        for item in items_data:
            dto = ActionItemDTO(
                id=item["id"],
                description=item.get("description") or item.get("title", ""),
                owner=item.get("owner", "Unassigned"),
                deadline=int(time.time()) + 86400 * 7,
                status=item.get("status", "OPEN"),
                source_type=item.get("source_type", "GENERAL"),
                source_id=item.get("id"),
                source_offset=item.get("source_reference", ""),
            )
            try:
                if not action_hub_repo.get_by_id(dto.id):
                    action_hub_repo.create(dto)
                else:
                    action_hub_repo.update(dto.id, {"description": dto.description, "owner": dto.owner, "status": dto.status})
            except Exception as e:
                print(f"  Note on ingestion action item {dto.id}: {e}")

            # Also ensure it is present in Core action hub table
            try:
                from apps.api.core.action_hub import action_hub_repo as core_action_repo
                if not core_action_repo.get(dto.id):
                    core_action_repo.create(dto)
            except Exception:
                pass

        print(f"  -> Seeded {len(items_data)} Action Items into the Unified Action Hub.")

    conn.commit()
    print("\n" + "=" * 60)
    print("DATABASE & GRAPH SEEDING COMPLETE! ALL WORKSPACES POPULATED.")
    print("=" * 60)


if __name__ == "__main__":
    seed()
