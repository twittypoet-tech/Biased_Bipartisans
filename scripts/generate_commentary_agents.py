#!/usr/bin/env python3
"""
Generate commentary agent files from the 29-agent roster JSONs and matchup data.

Outputs:
  1. docs/agent-relationships/relationship-matrix.md
  2. docs/prompts/commentary/{slug}-commentary.md  (29 files)
  3. docs/kb/{slug}-kb.md                          (29 files)
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
ROSTER_DIR = BASE_DIR / "30 agent roster MD files"
MATCHUPS_FILE = ROSTER_DIR / "BIPI UPDATED ROSTER (WITH MATCHUPS).md"

OUT_MATRIX = BASE_DIR / "docs" / "agent-relationships" / "relationship-matrix.md"
OUT_PROMPTS = BASE_DIR / "docs" / "prompts" / "commentary"
OUT_KB = BASE_DIR / "docs" / "kb"

SKIP_FILES = {"Moderator Agent-2.json"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clean_agent_name(raw: str) -> str:
    """Strip file-name suffixes like -3, -2 and (Single-Prompt)."""
    name = raw
    name = re.sub(r"\s*\(Single-Prompt\)", "", name)
    name = re.sub(r"-\d+$", "", name)
    return name.strip()


def make_slug(name: str) -> str:
    """The Hawk -> hawk, The Peacekeeper -> peacekeeper."""
    s = name.lower()
    s = re.sub(r"^the\s+", "", s)
    s = re.sub(r"\s+", "-", s)
    return s


def extract_global_prompt(data: dict) -> str | None:
    """Return the global_prompt string from either agent format."""
    # conversation-flow agents
    cf = data.get("conversationFlow")
    if cf and cf.get("global_prompt"):
        return cf["global_prompt"]
    # single-prompt (retellLlmData) agents
    rl = data.get("retellLlmData")
    if rl and rl.get("general_prompt"):
        return rl["general_prompt"]
    return None


def parse_header_line(prompt: str) -> tuple[str, str]:
    """Extract agent name and archetype from the header block."""
    m = re.search(r"Agent:\s*(.+?)\s*\|\s*Archetype:\s*(.+?)\s*\|\s*Role:", prompt)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return "", ""


def parse_sections(prompt: str) -> dict[str, str]:
    """Split prompt into named sections using header + underline pattern."""
    # Match lines like  "CORE DOCTRINE\n-------------"
    pattern = r"\n([A-Z][A-Z \&/]+)\n[-=]+\n"
    parts = re.split(pattern, prompt)
    sections: dict[str, str] = {}
    # parts looks like: [preamble, header1, body1, header2, body2, ...]
    i = 1
    while i < len(parts) - 1:
        key = parts[i].strip()
        body = parts[i + 1].strip()
        sections[key] = body
        i += 2
    return sections


# ---------------------------------------------------------------------------
# Parse matchups
# ---------------------------------------------------------------------------

def parse_matchups(path: Path) -> dict[str, dict[str, list[str]]]:
    """
    Returns {agent_short_name: {counters: [...], struggles: [...], rivals: [...],
                                 allies: [...], high_drama: [...]}}
    """
    text = path.read_text(encoding="utf-8")
    # Remove backslash escapes from markdown
    text = text.replace("\\#", "#").replace("\\*", "*").replace("\\-", "-")

    matchups: dict[str, dict[str, list[str]]] = {}
    current_agent = None

    for line in text.splitlines():
        line = line.strip()
        # Agent heading: ### The Hawk
        hm = re.match(r"^###\s+The\s+(.+)$", line)
        if hm:
            current_agent = hm.group(1).strip()
            matchups[current_agent] = {
                "counters": [], "struggles": [], "rivals": [],
                "allies": [], "high_drama": [],
            }
            continue

        if current_agent is None:
            continue

        # Category lines: **Counters:** Dove, Peacekeeper
        cm = re.match(r"^\*\*(\w[\w\s]*):\*\*\s*(.+)$", line)
        if cm:
            cat = cm.group(1).strip().lower().replace(" ", "_")
            names_raw = cm.group(2).strip()
            # Clean parentheticals like "(morally)"
            names_raw = re.sub(r"\s*\([^)]*\)", "", names_raw)
            names = [n.strip() for n in names_raw.split(",") if n.strip()]
            if cat in matchups[current_agent]:
                matchups[current_agent][cat] = names

    return matchups


# ---------------------------------------------------------------------------
# Relationship scoring
# ---------------------------------------------------------------------------

SCORE_TABLE = {
    #                   rivalry  respect  distrust  rel_type
    "rivals":     (0.9, 0.3, 0.8, "natural_enemy"),
    "high_drama": (0.8, 0.4, 0.6, "underestimated_rival"),
    "counters":   (0.7, 0.4, 0.6, "structural_opponent"),
    "struggles":  (0.6, 0.5, 0.4, "blind_spot_exposer"),
    "allies":     (0.2, 0.7, 0.2, "reluctant_ally"),
    "neutral":    (0.4, 0.45, 0.35, "neutral"),
}


def get_relationship(agent_short: str, target_short: str,
                     matchups: dict) -> tuple[str, float, float, float]:
    """Return (rel_type, rivalry, respect, distrust) for agent->target."""
    agent_data = matchups.get(agent_short, {})
    # Check categories in priority order
    for cat in ("rivals", "high_drama", "counters", "struggles", "allies"):
        members = agent_data.get(cat, [])
        if target_short in members:
            rivalry, respect, distrust, rel_type = SCORE_TABLE[cat]
            return rel_type, rivalry, respect, distrust
    return SCORE_TABLE["neutral"][3], SCORE_TABLE["neutral"][0], SCORE_TABLE["neutral"][1], SCORE_TABLE["neutral"][2]


def derive_attack_angles(source_sections: dict, target_sections: dict,
                         source_name: str, target_name: str,
                         opponents_section: str | None) -> list[str]:
    """Derive 2-3 attack angles from HOW YOU SEE YOUR OPPONENTS or doctrinal diff."""
    target_short = re.sub(r"^The\s+", "", target_name)

    # Check if target is mentioned in opponents section
    if opponents_section:
        # Try to find a paragraph about this target
        pattern = rf"(?:The\s+)?{re.escape(target_short)}[:\s].*?(?=\n(?:The\s+)?\w+:|$)"
        m = re.search(pattern, opponents_section, re.DOTALL | re.IGNORECASE)
        if m:
            block = m.group(0)
            angles = []
            # Look for "Attack angle:" lines
            aa = re.search(r"Attack angle:\s*(.+?)(?:\.|$)", block)
            if aa:
                angles.append(aa.group(1).strip().rstrip("."))
            # Look for "weak point" mentions
            wp = re.search(r"weak point:\s*(.+?)(?:\.|$)", block)
            if wp:
                angles.append(wp.group(1).strip().rstrip("."))
            # General criticism phrases
            for phrase_match in re.finditer(r"(?:but|however|though)\s+(.+?)(?:\.|$)", block, re.IGNORECASE):
                txt = phrase_match.group(1).strip().rstrip(".")
                if len(txt) > 15 and txt not in angles:
                    angles.append(txt)
                    if len(angles) >= 3:
                        break
            if angles:
                return angles[:3]

    # Fall back to doctrinal inference
    source_doctrine = source_sections.get("CORE DOCTRINE", "")
    target_doctrine = target_sections.get("CORE DOCTRINE", "")
    source_bullets = [b.strip().lstrip("- ") for b in source_doctrine.split("\n") if b.strip().startswith("-")]
    target_bullets = [b.strip().lstrip("- ") for b in target_doctrine.split("\n") if b.strip().startswith("-")]

    angles = []
    if source_bullets and target_bullets:
        # Pick first source belief vs first target belief as friction
        angles.append(f"fundamentally misreads {target_short}'s core premise — {target_bullets[0][:80]}")
        if len(target_bullets) > 1:
            angles.append(f"ignores the structural weakness in {target_short}'s position on {target_bullets[1][:60]}")
    if not angles:
        angles = [f"ideological friction with {target_short}'s worldview",
                  f"challenges {target_short}'s foundational assumptions"]
    return angles[:3]


def derive_weak_points(source_sections: dict, target_sections: dict,
                       source_name: str, target_name: str,
                       opponents_section: str | None) -> list[str]:
    """Derive 1-2 known weak points."""
    target_short = re.sub(r"^The\s+", "", target_name)

    if opponents_section:
        pattern = rf"(?:The\s+)?{re.escape(target_short)}[:\s].*?(?=\n(?:The\s+)?\w+:|$)"
        m = re.search(pattern, opponents_section, re.DOTALL | re.IGNORECASE)
        if m:
            block = m.group(0)
            points = []
            wp = re.search(r"weak point:\s*(.+?)(?:\.|$)", block)
            if wp:
                points.append(wp.group(1).strip().rstrip("."))
            # "struggle" mentions
            for sm in re.finditer(r"(?:struggle|fail|lack|miss|ignore|naive)\w*\s+(.+?)(?:\.|$)", block, re.IGNORECASE):
                txt = sm.group(1).strip().rstrip(".")
                if len(txt) > 10 and txt not in points:
                    points.append(txt)
                    break
            if points:
                return points[:2]

    # Fallback
    target_red = target_sections.get("CONCESSION RULES", "")
    if target_red:
        first_line = target_red.split(".")[0].strip()
        if len(first_line) > 10:
            return [first_line[:100]]
    return [f"tendency to overextend on core doctrine"]


# ---------------------------------------------------------------------------
# Template builders
# ---------------------------------------------------------------------------

def build_commentary_prompt(name: str, archetype: str, sections: dict) -> str:
    identity = sections.get("IDENTITY", "")
    core_doctrine = sections.get("CORE DOCTRINE", "")
    temperament = sections.get("TEMPERAMENT AND VOICE", "")
    claim_discipline = sections.get("CLAIM DISCIPLINE", "")
    epistemic = sections.get("EPISTEMIC RED LINES", "")
    hard_red = sections.get("HARD RED LINES", "")

    return f"""=============================================================
BIASED BIPARTISAN | COMMENTARY PLATFORM
Agent: {name} | Archetype: {archetype} | Role: COMMENTATOR
=============================================================

YOUR INSTRUCTIONS: Read the report context below, search for current
information using the search_engine tool, then deliver your commentary.
If other agents have already commented, you MUST engage with their takes.

REPORT CONTEXT
--------------
Headline: {{{{report_headline}}}}
Summary: {{{{report_summary}}}}
Report: {{{{report_body}}}}
Sources: {{{{report_sources}}}}
Key Entities: {{{{report_entities}}}}
Date: {{{{current_date}}}}

EXISTING COMMENTARIES ON THIS REPORT
--------------------------------------
{{{{existing_commentaries}}}}

BRIGHT DATA MCP — SEARCH ARCHITECTURE
---------------------------------------
You have access to the mcp search_engine tool. This is your news wire.
Search before you speak. Every time. No exceptions.

LIVE SEARCH (mcp search_engine tool — fires at call start)
-----------------------------------------------------------
The moment the call begins, run your search sequence. Complete all
searches fully before delivering any speech. Your search process is
invisible to the listener — never reference it, never narrate it,
never acknowledge it in any way. When your searches are complete,
deliver your opening and go straight into the commentary.

Good query structure:
- First search: "{{{{report_headline}}}} {{{{current_date}}}}"
- Narrowing: "[specific detail from report] [outlet name OR 'confirmed']"
- Context: "[topic from report] background history key facts"
- Keep queries short and specific — 4 to 8 words performs best.
- Never include cursor: null — omit the cursor parameter entirely on first searches.
- If a first search returns thin or unclear results, run a second
  search with a reworded query before reporting. Never report from
  a single weak result.

IDENTITY
--------
{identity}

CORE DOCTRINE
-------------
{core_doctrine}

TEMPERAMENT AND VOICE
---------------------
{temperament}

HOW YOU COMMENTATE
------------------
You are delivering a solo commentary, not debating. There is no moderator.
- Open with your ideological framing of the report's headline.
- Identify what the report gets right, what it misses, and what it gets wrong — from YOUR perspective.
- Search for at least one piece of current information to add substance beyond the report.
- If other agents have already commented (see EXISTING COMMENTARIES above), you MUST engage with their specific claims — agree, challenge, or complicate.
- Close with your verdict on what this story really means.
- Keep commentary to 90-120 seconds of spoken content.
- When finished, call the end_call tool. Do not prompt the user for questions.

ENGAGING WITH OTHER AGENTS
--------------------------
{{{{agent_relationships}}}}

If no other agents have commented yet, you are setting the frame. Be bold with your interpretation.

If other agents HAVE commented, you must reference at least one of their specific claims by name. Use the relationship data above to calibrate your response — challenge rivals, build on allies, complicate those in between.

CLAIM DISCIPLINE
----------------
{claim_discipline}

EPISTEMIC RED LINES
--------------------
{epistemic}

HARD RED LINES
--------------
{hard_red}

RULES FOR THIS PLATFORM
------------------------
- Stay in character at all times. You are not an AI assistant.
- Never say "as an AI" or refer to yourself as artificial.
- Never narrate natural human-like behaviors (e.g. "clears throat", "sigh" etc.)
- Never break character to explain your reasoning as a language model.
- Deliver your commentary as a continuous spoken piece, not a Q&A.
- Keep to 90-120 seconds total.
- If other agents have commented, you MUST reference at least one by name.
- Always search for at least one piece of current information.
- When finished, call end_call. Do not wait for user input.
"""


def build_kb_doc(name: str, sections: dict,
                 relationships: dict[str, dict]) -> str:
    """Build a KB markdown doc for RAG retrieval."""
    identity = sections.get("IDENTITY", "")
    core_doctrine = sections.get("CORE DOCTRINE", "")
    how_argue = sections.get("HOW YOU ARGUE", "")
    claim_disc = sections.get("CLAIM DISCIPLINE", "")
    epistemic = sections.get("EPISTEMIC RED LINES", "")
    concession = sections.get("CONCESSION RULES", "")
    hard_red = sections.get("HARD RED LINES", "")

    # Extract first paragraph of identity
    identity_first = identity.split("\n\n")[0].strip() if identity else ""

    # Extract core thesis — first bullet or first sentence
    doctrine_bullets = [b.strip().lstrip("- ") for b in core_doctrine.split("\n") if b.strip().startswith("-")]
    core_thesis = doctrine_bullets[0] if doctrine_bullets else identity_first.split(".")[0]

    # Values list
    values_list = "; ".join(doctrine_bullets[:5]) if doctrine_bullets else core_doctrine.split(".")[0]

    # Full doctrine as paragraph
    doctrine_paragraph = " ".join(doctrine_bullets) if doctrine_bullets else core_doctrine

    # How they argue — adapted
    argue_text = how_argue.replace("\n", " ").strip() if how_argue else ""

    # Claim discipline — what they trust
    verified_match = re.search(r"VERIFIED:?\s*(.+?)(?:\n\n|\n-|\n[A-Z])", claim_disc, re.DOTALL)
    verified_text = verified_match.group(1).strip() if verified_match else claim_disc.split("\n")[0] if claim_disc else ""

    # Speculation tolerance
    spec_match = re.search(r"(?:speculation tolerance|speculative)[^.]*\.", claim_disc, re.IGNORECASE)
    spec_text = spec_match.group(0).strip() if spec_match else "Moderate speculation tolerance."

    # Build relationship section
    rel_lines = []
    for other_name, rel_data in sorted(relationships.items()):
        rel_lines.append(f"\nQ: How does {name} feel about {other_name}?")
        rel_lines.append(
            f"A: Relationship: {rel_data['relationship_type']}. "
            f"Rivalry: {rel_data['rivalry_score']}. "
            f"Respect: {rel_data['respect_score']}. "
            f"Distrust: {rel_data['distrust_score']}."
        )
        rel_lines.append(f"Attack angles: {'; '.join(rel_data['attack_angles'])}.")
        rel_lines.append(f"Known weak points: {'; '.join(rel_data['known_weak_points'])}.")

    rel_section = "\n".join(rel_lines)

    return f"""# {name} — Commentary Knowledge Base

## Identity & Worldview

Q: Who is {name}?
A: {identity_first}

Q: What is {name}'s core thesis?
A: {core_thesis}

Q: What are {name}'s core values?
A: {values_list}

Q: What is {name}'s full doctrine?
A: {doctrine_paragraph}

## Issue Approach

Q: How does {name} approach analyzing topics?
A: {argue_text}

## Epistemic Framework

Q: What kind of evidence does {name} trust?
A: {verified_text}

Q: What will {name} never do epistemically?
A: {epistemic}

Q: How speculative is {name}?
A: {spec_text}

## Relationships
{rel_section}

## Concession Rules

Q: When does {name} concede a point?
A: {concession}

## Red Lines

Q: What will {name} absolutely never do?
A: {hard_red}
"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 1. Load all agent JSONs
    agents: dict[str, dict] = {}  # keyed by clean name
    agent_meta: dict[str, dict] = {}  # name -> {archetype, sections, slug, short}

    json_files = sorted(ROSTER_DIR.glob("*.json"))
    for jf in json_files:
        if jf.name in SKIP_FILES:
            continue

        data = json.loads(jf.read_text(encoding="utf-8"))
        prompt = extract_global_prompt(data)
        if not prompt:
            print(f"WARNING: No global_prompt found in {jf.name}, skipping.")
            continue

        raw_name = clean_agent_name(jf.stem)
        header_name, archetype = parse_header_line(prompt)
        name = header_name or raw_name
        slug = make_slug(name)
        short = re.sub(r"^The\s+", "", name)
        sections = parse_sections(prompt)

        if not sections:
            print(f"WARNING: No sections parsed from {jf.name}, skipping.")
            continue

        agent_meta[name] = {
            "archetype": archetype,
            "sections": sections,
            "slug": slug,
            "short": short,
        }
        print(f"  Loaded: {name} ({archetype}) -> {slug}")

    print(f"\nTotal agents loaded: {len(agent_meta)}")

    # 2. Parse matchups
    matchups = parse_matchups(MATCHUPS_FILE)
    print(f"Matchup entries: {len(matchups)}")

    # 3. Build full relationship data for every pair
    agent_names = sorted(agent_meta.keys())
    # full_relationships[source_name][target_name] = {type, scores, angles, weak_points}
    full_relationships: dict[str, dict[str, dict]] = {}

    for src in agent_names:
        src_short = agent_meta[src]["short"]
        src_sections = agent_meta[src]["sections"]
        opponents_text = src_sections.get("HOW YOU SEE YOUR OPPONENTS")
        full_relationships[src] = {}

        for tgt in agent_names:
            if tgt == src:
                continue
            tgt_short = agent_meta[tgt]["short"]
            tgt_sections = agent_meta[tgt]["sections"]

            rel_type, rivalry, respect, distrust = get_relationship(
                src_short, tgt_short, matchups
            )

            attack_angles = derive_attack_angles(
                src_sections, tgt_sections, src, tgt, opponents_text
            )
            weak_points = derive_weak_points(
                src_sections, tgt_sections, src, tgt, opponents_text
            )

            full_relationships[src][tgt] = {
                "relationship_type": rel_type,
                "rivalry_score": rivalry,
                "respect_score": respect,
                "distrust_score": distrust,
                "attack_angles": attack_angles,
                "known_weak_points": weak_points,
            }

    # 4. Write relationship matrix
    OUT_MATRIX.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# Agent Relationship Matrix\n"]
    lines.append(f"Generated from {len(agent_names)} agents, {len(agent_names) * (len(agent_names) - 1)} directed pairs.\n")

    for src in agent_names:
        lines.append(f"\n## {src} ({agent_meta[src]['archetype']})\n")
        for tgt in sorted(full_relationships[src].keys()):
            r = full_relationships[src][tgt]
            lines.append(
                f"- **{tgt}**: {r['relationship_type']} | "
                f"rivalry={r['rivalry_score']} respect={r['respect_score']} "
                f"distrust={r['distrust_score']}"
            )
            lines.append(f"  - Attack angles: {'; '.join(r['attack_angles'])}")
            lines.append(f"  - Weak points: {'; '.join(r['known_weak_points'])}")

    OUT_MATRIX.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote relationship matrix: {OUT_MATRIX}")

    # 5. Write commentary prompts
    OUT_PROMPTS.mkdir(parents=True, exist_ok=True)
    for name in agent_names:
        meta = agent_meta[name]
        prompt_text = build_commentary_prompt(name, meta["archetype"], meta["sections"])
        out_path = OUT_PROMPTS / f"{meta['slug']}-commentary.md"
        out_path.write_text(prompt_text, encoding="utf-8")
    print(f"Wrote {len(agent_names)} commentary prompts to {OUT_PROMPTS}/")

    # 6. Write KB docs
    OUT_KB.mkdir(parents=True, exist_ok=True)
    for name in agent_names:
        meta = agent_meta[name]
        kb_text = build_kb_doc(name, meta["sections"], full_relationships[name])
        out_path = OUT_KB / f"{meta['slug']}-kb.md"
        out_path.write_text(kb_text, encoding="utf-8")
    print(f"Wrote {len(agent_names)} KB docs to {OUT_KB}/")

    print("\nDone.")


if __name__ == "__main__":
    main()
