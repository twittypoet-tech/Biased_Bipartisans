#!/usr/bin/env python3
"""
Generate canonical KB from individual agent KB files and update commentary prompts.

Task 1: Read 29 agent KB files from docs/kb/ (excluding bipi-* files),
         filter neutral relationships, and output canonical KB format.

Task 2: Insert KNOWLEDGE BASE RETRIEVAL section into each commentary prompt
         right before the RULES FOR THIS PLATFORM section.
"""

import os
import re
import glob

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB_DIR = os.path.join(REPO_ROOT, "docs", "kb")
PROMPTS_DIR = os.path.join(REPO_ROOT, "docs", "prompts", "commentary")
OUTPUT_KB = os.path.join(KB_DIR, "bipi-commentary-agents-kb.md")


# ---------------------------------------------------------------------------
# Task 1: Generate canonical KB
# ---------------------------------------------------------------------------

def parse_kb_file(filepath):
    """Parse a single agent KB markdown file into structured sections."""
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    agent = {}

    # Extract agent name from title line: "# The Hawk -- Commentary Knowledge Base"
    title_match = re.match(r"^#\s+(.+?)\s+(?:--|—|–)\s+Commentary Knowledge Base", text)
    if title_match:
        agent["name"] = title_match.group(1).strip()
    else:
        # Fallback: derive from filename
        base = os.path.basename(filepath).replace("-kb.md", "")
        agent["name"] = "The " + base.capitalize()

    # Parse Q&A pairs with their section context
    sections = {}
    current_section = None

    for line in text.split("\n"):
        # Detect ## headers
        h2_match = re.match(r"^##\s+(.+)", line)
        if h2_match:
            current_section = h2_match.group(1).strip()
            if current_section not in sections:
                sections[current_section] = []
            continue

        if current_section:
            sections.setdefault(current_section, [])
            sections[current_section].append(line)

    # Now extract specific fields from sections
    def get_qa_pairs(section_name):
        """Extract Q&A pairs from a section."""
        if section_name not in sections:
            return []
        lines = sections[section_name]
        pairs = []
        current_q = None
        current_a_lines = []

        for line in lines:
            q_match = re.match(r"^Q:\s+(.+)", line)
            a_match = re.match(r"^A:\s+(.+)", line)
            if q_match:
                if current_q and current_a_lines:
                    pairs.append((current_q, "\n".join(current_a_lines)))
                current_q = q_match.group(1).strip()
                current_a_lines = []
            elif a_match:
                current_a_lines.append(a_match.group(1).strip())
            elif current_a_lines and line.strip():
                current_a_lines.append(line.strip())

        if current_q and current_a_lines:
            pairs.append((current_q, "\n".join(current_a_lines)))

        return pairs

    # Identity & Worldview
    identity_pairs = get_qa_pairs("Identity & Worldview")
    agent["identity"] = ""
    agent["core_thesis"] = ""
    agent["values"] = ""
    agent["doctrine"] = ""
    for q, a in identity_pairs:
        if "Who is" in q:
            agent["identity"] = a
        elif "core thesis" in q:
            agent["core_thesis"] = a
        elif "core values" in q:
            agent["values"] = a
        elif "full doctrine" in q:
            agent["doctrine"] = a

    # Issue Approach
    approach_pairs = get_qa_pairs("Issue Approach")
    agent["approach"] = ""
    for q, a in approach_pairs:
        if "approach" in q.lower():
            agent["approach"] = a

    # Epistemic Framework
    epistemic_pairs = get_qa_pairs("Epistemic Framework")
    agent["evidence"] = ""
    agent["epistemic_red_lines"] = ""
    agent["speculation"] = ""
    for q, a in epistemic_pairs:
        if "evidence" in q.lower() and "trust" in q.lower():
            agent["evidence"] = a
        elif "never do epistemically" in q.lower():
            agent["epistemic_red_lines"] = a
        elif "speculative" in q.lower():
            agent["speculation"] = a

    # Relationships - only non-neutral
    rel_pairs = get_qa_pairs("Relationships")
    agent["relationships"] = []
    for q, a in rel_pairs:
        # Check if relationship is neutral
        rel_match = re.search(r"Relationship:\s*(\w+)", a)
        if rel_match:
            rel_type = rel_match.group(1).strip()
            if rel_type == "neutral":
                continue
        else:
            continue  # Skip if we can't parse relationship type

        # Extract the other agent name from the question
        other_match = re.search(r"feel about (.+?)\?", q)
        other_name = other_match.group(1).strip() if other_match else "Unknown"

        agent["relationships"].append({
            "other": other_name,
            "data": a,
        })

    # Concession Rules
    concession_pairs = get_qa_pairs("Concession Rules")
    agent["concessions"] = ""
    for q, a in concession_pairs:
        agent["concessions"] = a

    # Red Lines
    red_pairs = get_qa_pairs("Red Lines")
    agent["red_lines"] = ""
    for q, a in red_pairs:
        agent["red_lines"] = a

    return agent


def format_canonical(agent):
    """Format a parsed agent into canonical KB format."""
    name = agent["name"]
    lines = []

    lines.append(f"## Agent: {name}")
    lines.append("")

    # Identity
    lines.append(f"### {name} — Identity")
    lines.append(f"Q: Who is {name}?")
    lines.append(f"A: {agent['identity']}")
    lines.append("")
    lines.append(f"Q: What is {name}'s core thesis?")
    lines.append(f"A: {agent['core_thesis']}")
    lines.append("")
    lines.append(f"Q: What are {name}'s core values?")
    lines.append(f"A: {agent['values']}")
    lines.append("")
    lines.append(f"Q: What is {name}'s full doctrine?")
    lines.append(f"A: {agent['doctrine']}")
    lines.append("")

    # How They Argue
    lines.append(f"### {name} — How They Argue")
    lines.append(f"Q: How does {name} approach analyzing topics?")
    lines.append(f"A: {agent['approach']}")
    lines.append("")

    # Epistemic Framework
    lines.append(f"### {name} — Epistemic Framework")
    lines.append(f"Q: What kind of evidence does {name} trust?")
    lines.append(f"A: {agent['evidence']}")
    lines.append("")
    lines.append(f"Q: What will {name} never do epistemically?")
    lines.append(f"A: {agent['epistemic_red_lines']}")
    lines.append("")
    lines.append(f"Q: How speculative is {name}?")
    lines.append(f"A: {agent['speculation']}")
    lines.append("")

    # Concession Rules
    lines.append(f"### {name} — Concession Rules")
    lines.append(f"Q: When does {name} concede a point?")
    lines.append(f"A: {agent['concessions']}")
    lines.append("")

    # Red Lines
    lines.append(f"### {name} — Red Lines")
    lines.append(f"Q: What will {name} absolutely never do?")
    lines.append(f"A: {agent['red_lines']}")
    lines.append("")

    # Key Relationships (non-neutral only)
    if agent["relationships"]:
        lines.append(f"### {name} — Key Relationships")
        for rel in agent["relationships"]:
            lines.append(f"Q: How does {name} feel about {rel['other']}?")
            lines.append(f"A: {rel['data']}")
            lines.append("")

    return "\n".join(lines)


def generate_canonical_kb():
    """Generate the canonical KB file from all individual KB files."""
    kb_files = sorted(glob.glob(os.path.join(KB_DIR, "*-kb.md")))
    # Exclude any file starting with "bipi-"
    kb_files = [f for f in kb_files if not os.path.basename(f).startswith("bipi-")]

    print(f"Found {len(kb_files)} agent KB files")

    all_agents = []
    for filepath in kb_files:
        agent = parse_kb_file(filepath)
        all_agents.append(agent)
        non_neutral = len(agent["relationships"])
        print(f"  Parsed: {agent['name']} ({non_neutral} non-neutral relationships)")

    # Build output
    output_lines = []
    output_lines.append("# BIPI Commentary Agents — Canonical Knowledge Base")
    output_lines.append("")
    output_lines.append(f"Total agents: {len(all_agents)}")
    output_lines.append("")

    for agent in all_agents:
        output_lines.append(format_canonical(agent))
        output_lines.append("---")
        output_lines.append("")

    output_text = "\n".join(output_lines)

    with open(OUTPUT_KB, "w", encoding="utf-8") as f:
        f.write(output_text)

    return output_text


# ---------------------------------------------------------------------------
# Task 2: Update commentary prompts
# ---------------------------------------------------------------------------

KB_RETRIEVAL_TEMPLATE = """KNOWLEDGE BASE RETRIEVAL
-------------------------
You have access to a shared knowledge base containing profiles for all
29 BIPI commentary agents. To retrieve information about yourself or
other agents, reference agent names directly in your queries.

Your profile is stored under "Agent: {agent_name}" in the knowledge base.
Use it to recall your doctrine, epistemic framework, concession rules,
and red lines when forming your commentary.

When engaging with another agent's commentary, look up their profile
under "Agent: {{Their Name}}" to understand their worldview, attack
angles against you, and their weak points before responding to their
claims.

"""


def update_commentary_prompts():
    """Insert KB retrieval section into each commentary prompt."""
    prompt_files = sorted(glob.glob(os.path.join(PROMPTS_DIR, "*-commentary.md")))
    # Exclude the host prompt
    prompt_files = [f for f in prompt_files
                    if os.path.basename(f) != "commentary-host-prompt.md"]

    print(f"\nFound {len(prompt_files)} commentary prompt files")

    updated_count = 0
    skipped_count = 0

    for filepath in prompt_files:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract agent name from header line: "Agent: The Hawk | Archetype: ..."
        name_match = re.search(r"Agent:\s+(.+?)\s+\|", content)
        if not name_match:
            print(f"  WARNING: Could not extract agent name from {os.path.basename(filepath)}")
            skipped_count += 1
            continue

        agent_name = name_match.group(1).strip()

        # Check if already inserted
        if "KNOWLEDGE BASE RETRIEVAL" in content:
            print(f"  Skipping {agent_name} (already has KB retrieval section)")
            skipped_count += 1
            continue

        # Build the insertion block
        insertion = KB_RETRIEVAL_TEMPLATE.format(agent_name=agent_name)

        # Insert right before "RULES FOR THIS PLATFORM"
        marker = "RULES FOR THIS PLATFORM"
        if marker not in content:
            print(f"  WARNING: No '{marker}' section found in {os.path.basename(filepath)}")
            skipped_count += 1
            continue

        # Insert before the RULES FOR THIS PLATFORM line
        content = content.replace(marker, insertion + marker)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"  Updated: {agent_name}")
        updated_count += 1

    print(f"\nUpdated {updated_count} prompts, skipped {skipped_count}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("Task 1: Generating Canonical KB")
    print("=" * 60)
    output_text = generate_canonical_kb()

    print(f"\nCanonical KB written to: {OUTPUT_KB}")

    # File size
    file_size = os.path.getsize(OUTPUT_KB)
    print(f"File size: {file_size:,} bytes ({file_size / 1024:.1f} KB)")

    # Word count
    word_count = len(output_text.split())
    print(f"Word count: {word_count:,}")

    print("\n" + "=" * 60)
    print("Task 2: Updating Commentary Prompts")
    print("=" * 60)
    update_commentary_prompts()

    print("\nDone.")
