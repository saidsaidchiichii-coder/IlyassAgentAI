# المحتوى الكامل والحرفي لجميع ملفات المهارات الـ 8 (Skills)

هذا الملف يحتوي على المحتوى الدقيق لكل ملف داخل مجلدات المهارات الثمانية في الساندبوكس.

## المجلد: .tools
يحتوي هذا المجلد على 4 ملف(ات).

### اسم الملف: html_scaffold.py
**المسار الكامل:** `/home/user/skills/.tools/html_scaffold.py`

```
#!/usr/bin/env python3
"""Scaffold a responsive HTML project with Tailwind CSS v4.

Optimized for the Gumloop artifact viewer (400px through wider artifact panels).
Includes class-based dark mode with auto OS preference detection.
"""

import os
import sys

INDEX_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project</title>
  <script
    src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.0/dist/index.global.js"
    integrity="sha384-nWTzRTCY/9V4Bo352ehygr1c4cnst4XN6lMR3fipakEQrhVpc0hEM5Dii3Amz0sT"
    crossorigin="anonymous"
  ></script>
  <style type="text/tailwindcss">
    @custom-variant dark (&:where(.dark, .dark *));
  </style>
  <script>
    document.documentElement.classList.toggle(
      'dark',
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  </script>
  <link rel="stylesheet" href="styles.css">
</head>
<body class="min-h-dvh text-sm antialiased">
  <div id="app"></div>
  <script src="app.js"></script>
</body>
</html>
"""

STYLES_CSS = """\
/* Critical layout -- works even if the pinned Tailwind runtime is slow to load */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
img, video, svg { max-width: 100%; height: auto; }

/* Responsive card grid: stacks at 400px, fills as the panel widens */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 0.75rem;
}

/* Table wrapper for horizontal scroll when needed */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
"""

STATIC_APP_JS = """\
document.addEventListener('DOMContentLoaded', function () {
  // Entry point
});
"""

LIVE_APP_JS = """\
document.addEventListener('DOMContentLoaded', function () {
  var app = document.getElementById('app');
  app.innerHTML = '<main class="w-full p-4 md:p-6"><p id="status" class="text-gray-600 dark:text-gray-300">Loading live data...</p><div id="content" class="card-grid mt-4"></div></main>';

  fetch('/gumloop/data/main')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load live data');
      }
      return response.json();
    })
    .then(function (data) {
      renderData(data);
    })
    .catch(function (error) {
      document.getElementById('status').textContent = error.message;
    });
});

function renderData(data) {
  var status = document.getElementById('status');
  var content = document.getElementById('content');
  status.textContent = 'Live data loaded';
  content.textContent = JSON.stringify(data, null, 2);
}
"""

LIVE_DATA_PY = """\
import json

# Replace this sample payload with a real GumCP tool call after choosing
# the integration server and tool.
#
# client = get_client()
# result = client.call_tool("server__tool_name", {"argument": "value"})

result = {
    "message": "Replace data.py with a real GumCP tool call.",
    "items": [],
}

print(json.dumps(result))
"""

LIVE_EXPORT_MD = """\
# Exporting This Live Artifact

After replacing `data.py` with the real GumCP tool call, export with:

sandbox_download(
  sandbox_path="{project_dir}/index.html",
  bundle_dir="{project_dir}/",
  scripts={{"main": "{project_dir}/data.py"}},
  server_ids=["server_id"]
)

The `main` key must match `fetch('/gumloop/data/main')` in `app.js`.
Replace `server_id` with the GumCP servers `data.py` uses. The tools each script may
call are parsed from its source to scope the execute token — no need to list them.
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 html_scaffold.py <project_dir> [--script-connected]")
        sys.exit(1)

    project_dir = sys.argv[1]
    script_connected_enabled = any(
        flag in sys.argv[2:] for flag in ("--script-connected", "--live-data")
    )
    os.makedirs(project_dir, exist_ok=True)

    files = {
        "index.html": INDEX_HTML,
        "styles.css": STYLES_CSS,
        "app.js": LIVE_APP_JS if script_connected_enabled else STATIC_APP_JS,
    }

    if script_connected_enabled:
        files["data.py"] = LIVE_DATA_PY
        files["EXPORT.md"] = LIVE_EXPORT_MD.format(project_dir=project_dir)

    for filename, content in files.items():
        path = os.path.join(project_dir, filename)
        if os.path.exists(path):
            print(f"Skipped (exists): {path}")
            continue
        with open(path, "w") as f:
            f.write(content)
        print(f"Created: {path}")

    print(f"Scaffold ready: {project_dir}")


if __name__ == "__main__":
    main()

```

---

### اسم الملف: init_skill.py
**المسار الكامل:** `/home/user/skills/.tools/init_skill.py`

```
#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    init_skill.py <skill-name> [--scripts] [--references] [--assets]

Examples:
    init_skill.py my-new-skill
    init_skill.py my-api-helper --scripts --references

Skills are created at /home/user/skills/<skill-name>/
"""

import re
import sys
from pathlib import Path


SKILL_TEMPLATE = """---
name: {skill_name}
description: "TODO: What this skill does and when to use it. Max 1024 chars. No angle brackets."
# icon: "TODO: Optional Lucide icon name, e.g. code, file-text, search. Remove if not needed."
# color: "TODO: Optional color: Grey, Blue, Green, Orange, Red, Yellow, Teal, Pink, Purple, Bronze, Black. Remove if not needed."
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Structure: ## Overview -> ## Workflow Decision Tree -> ## Step 1 -> ## Step 2...

**2. Task-Based** (best for tool collections)
- Works well when the skill offers different operations/capabilities
- Structure: ## Overview -> ## Quick Start -> ## Task Category 1 -> ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Structure: ## Overview -> ## Guidelines -> ## Specifications -> ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Works well when the skill provides multiple interrelated features
- Structure: ## Overview -> ## Core Capabilities -> ### 1. Feature -> ### 2. Feature...

Patterns can be mixed and matched as needed.

Delete this entire "Structuring This Skill" section when done - it's just guidance.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here. Examples:
- Code samples for technical skills
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/assets/references as needed]
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
Example helper script for {skill_name}

This is a placeholder script. Replace with actual implementation or delete if not needed.
"""

def main():
    print("This is an example script for {skill_name}")
    # TODO: Add actual script logic here

if __name__ == "__main__":
    main()
'''

EXAMPLE_REFERENCE = """# Reference Documentation for {skill_title}

This is a placeholder for detailed reference documentation.
Replace with actual reference content or delete if not needed.

## Structure Suggestions

### API Reference Example
- Overview
- Authentication
- Endpoints with examples
- Error codes

### Workflow Guide Example
- Prerequisites
- Step-by-step instructions
- Common patterns
- Troubleshooting
"""

EXAMPLE_ASSET = """# Example Asset File

This placeholder represents where asset files would be stored.
Replace with actual asset files (templates, images, data files, etc.) or delete if not needed.

Assets are NOT loaded into context, but rather used within
the output the agent produces.
"""

DIR_FLAGS = {"--scripts": "scripts", "--references": "references", "--assets": "assets"}


def title_case_skill_name(skill_name):
    """Convert hyphenated skill name to Title Case for display."""
    return ' '.join(word.capitalize() for word in skill_name.split('-'))


SKILLS_BASE_PATH = "/home/user/skills"


def init_skill(skill_name, resource_dirs=None):
    """
    Initialize a new skill directory with template SKILL.md.

    Args:
        skill_name: Name of the skill
        resource_dirs: Optional set of directory names to create (from VALID_RESOURCE_DIRS).
                       None means no resource directories are created.

    Returns:
        Path to created skill directory, or None if error
    """
    # Validate skill name before creating anything
    if not re.match(r'^[a-z0-9-]+$', skill_name):
        print(f"Error: Name '{skill_name}' must be hyphen-case (lowercase letters, digits, and hyphens only)")
        return None
    if skill_name.startswith('-') or skill_name.endswith('-') or '--' in skill_name:
        print(f"Error: Name '{skill_name}' cannot start/end with hyphen or contain consecutive hyphens")
        return None
    if len(skill_name) > 64:
        print(f"Error: Name is too long ({len(skill_name)} characters). Maximum is 64 characters.")
        return None

    skill_dir = Path(SKILLS_BASE_PATH) / skill_name

    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return None

    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None

    # Create SKILL.md from template
    skill_title = title_case_skill_name(skill_name)
    skill_content = SKILL_TEMPLATE.format(
        skill_name=skill_name,
        skill_title=skill_title
    )

    skill_md_path = skill_dir / 'SKILL.md'
    try:
        skill_md_path.write_text(skill_content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None

    # Create only the requested resource directories with starter files
    if resource_dirs:
        try:
            if "scripts" in resource_dirs:
                scripts_dir = skill_dir / 'scripts'
                scripts_dir.mkdir(exist_ok=True)
                example_script = scripts_dir / 'example.py'
                example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
                example_script.chmod(0o755)
                print("Created scripts/example.py")

            if "references" in resource_dirs:
                references_dir = skill_dir / 'references'
                references_dir.mkdir(exist_ok=True)
                example_reference = references_dir / 'api_reference.md'
                example_reference.write_text(EXAMPLE_REFERENCE.format(skill_title=skill_title))
                print("Created references/api_reference.md")

            if "assets" in resource_dirs:
                assets_dir = skill_dir / 'assets'
                assets_dir.mkdir(exist_ok=True)
                example_asset = assets_dir / 'example_asset.txt'
                example_asset.write_text(EXAMPLE_ASSET)
                print("Created assets/example_asset.txt")
        except Exception as e:
            print(f"Error creating resource directories: {e}")
            return None

    print(f"\nSkill '{skill_name}' initialized successfully at {skill_dir}")
    print("\nNext steps:")
    print("1. Edit SKILL.md to replace the TODO placeholders")
    print("2. Run the validator when ready: python3 /home/user/skills/.tools/quick_validate.py " + skill_name)

    return skill_dir


def parse_args(args):
    """Parse CLI args, returning (skill_name, resource_dirs)."""
    skill_name = None
    resource_dirs = set()

    for arg in args:
        if arg in DIR_FLAGS:
            resource_dirs.add(DIR_FLAGS[arg])
        elif arg.startswith("--"):
            print(f"Error: unknown flag: {arg}")
            print(f"Valid flags: {', '.join(sorted(DIR_FLAGS.keys()))}")
            sys.exit(1)
        elif skill_name is None:
            skill_name = arg
        else:
            print(f"Error: unexpected argument: {arg}")
            sys.exit(1)

    return skill_name, resource_dirs or None


def main():
    if len(sys.argv) < 2:
        print("Usage: init_skill.py <skill-name> [--scripts] [--references] [--assets]")
        print("\nSkill name requirements:")
        print("  - Hyphen-case identifier (e.g., 'data-analyzer')")
        print("  - Lowercase letters, digits, and hyphens only")
        print("  - Max 64 characters")
        print("  - Must match directory name exactly")
        print("\nOptions:")
        print("  --scripts     Create scripts/ with an example helper script")
        print("  --references  Create references/ with an example reference doc")
        print("  --assets      Create assets/ with an example asset file")
        print("               Only use these when the skill clearly needs them.")
        print("\nExamples:")
        print("  init_skill.py my-new-skill")
        print("  init_skill.py my-api-helper --scripts --references")
        print(f"\nSkills are created at {SKILLS_BASE_PATH}/<skill-name>/")
        sys.exit(1)

    skill_name, resource_dirs = parse_args(sys.argv[1:])

    if not skill_name:
        print("Error: skill name is required")
        sys.exit(1)

    print(f"Initializing skill: {skill_name}")
    print(f"Location: {SKILLS_BASE_PATH}/{skill_name}")
    print()

    result = init_skill(skill_name, resource_dirs=resource_dirs)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

```

---

### اسم الملف: quick_validate.py
**المسار الكامل:** `/home/user/skills/.tools/quick_validate.py`

```
#!/usr/bin/env python3
"""
Quick validation script for skills - minimal version

Usage:
    quick_validate.py <skill-name>
    quick_validate.py <absolute-path-to-skill>

Examples:
    quick_validate.py my-skill
    quick_validate.py /home/user/skills/my-skill

Skills are expected at /home/user/skills/<skill-name>/
"""

import sys
import re
from pathlib import Path

SKILLS_BASE_PATH = Path("/home/user/skills")


def resolve_skill_path(skill_path_or_name):
    """
    Resolve skill path to absolute path.

    If given an absolute path, use it directly.
    If given a skill name or relative path, resolve it under SKILLS_BASE_PATH.
    """
    path = Path(skill_path_or_name)

    # If it's an absolute path, use it directly
    if path.is_absolute():
        return path

    # Otherwise, treat it as a skill name and look in SKILLS_BASE_PATH
    return SKILLS_BASE_PATH / skill_path_or_name


def validate_skill(skill_path_or_name):
    """Basic validation of a skill. Returns (valid: bool, message: str)."""
    skill_path = resolve_skill_path(skill_path_or_name)

    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read and validate frontmatter
    content = skill_md.read_text()
    if not content.startswith('---'):
        return False, "No YAML frontmatter found"

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Parse frontmatter as simple key: value pairs (no external dependencies)
    frontmatter = {}
    for line in frontmatter_text.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        colon_idx = line.find(':')
        if colon_idx == -1:
            continue
        key = line[:colon_idx].strip()
        value = line[colon_idx + 1:].strip()
        # Strip surrounding quotes if present
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        frontmatter[key] = value

    if not frontmatter:
        return False, "Frontmatter is empty or could not be parsed"

    # Define allowed properties (icon/color: optional UI metadata, related_server_ids: integration scoping)
    ALLOWED_PROPERTIES = {'name', 'description', 'icon', 'color', 'related_server_ids', 'license', 'allowed-tools', 'metadata', 'compatibility'}

    # Check for unexpected properties
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in SKILL.md frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed properties are: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    # Check required fields
    if 'name' not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if 'description' not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    # Validate name
    name = frontmatter.get('name', '')
    if not isinstance(name, str):
        return False, f"Name must be a string, got {type(name).__name__}"
    name = name.strip()
    if name:
        if not re.match(r'^[a-z0-9-]+$', name):
            return False, f"Name '{name}' should be hyphen-case (lowercase letters, digits, and hyphens only)"
        if name.startswith('-') or name.endswith('-') or '--' in name:
            return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"
        if len(name) > 64:
            return False, f"Name is too long ({len(name)} characters). Maximum is 64 characters."
        # Name must match the parent directory name per spec
        dir_name = skill_path.name
        if name != dir_name:
            return False, f"Name '{name}' does not match directory name '{dir_name}'. They must be identical."

    # Validate description
    description = frontmatter.get('description', '')
    if not isinstance(description, str):
        return False, f"Description must be a string, got {type(description).__name__}"
    description = description.strip()
    if description:
        if '<' in description or '>' in description:
            return False, "Description cannot contain angle brackets (< or >)"
        if len(description) > 1024:
            return False, f"Description is too long ({len(description)} characters). Maximum is 1024 characters."

    # Validate compatibility length if present
    compatibility = frontmatter.get('compatibility', '')
    if compatibility and len(compatibility) > 500:
        return False, f"Compatibility is too long ({len(compatibility)} characters). Maximum is 500 characters."

    # Warn if SKILL.md body is over 500 lines (spec recommends keeping it concise)
    body_start = content.find('---', 3)
    if body_start != -1:
        body = content[body_start + 3:].strip()
        body_lines = body.count('\n') + 1 if body else 0
        if body_lines > 500:
            print(f"Warning: SKILL.md body is {body_lines} lines. Spec recommends under 500. Consider moving details to references/.")

    return True, "Skill is valid!"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: quick_validate.py <skill-name>")
        print("       quick_validate.py <absolute-path-to-skill>")
        print("\nExamples:")
        print("  quick_validate.py my-skill")
        print("  quick_validate.py /home/user/skills/my-skill")
        print(f"\nSkills are expected at {SKILLS_BASE_PATH}/<skill-name>/")
        sys.exit(1)

    skill_input = sys.argv[1]
    resolved_path = resolve_skill_path(skill_input)

    print(f"Validating skill at: {resolved_path}")

    valid, message = validate_skill(skill_input)
    print(message)
    sys.exit(0 if valid else 1)

```

---

### اسم الملف: sitecustomize.py
**المسار الكامل:** `/home/user/skills/.tools/sitecustomize.py`

```
"""Auto-detect and log skill script executions and imports. Loaded by Python at startup."""
import atexit
import json
import os
import sys
import time

_SKILLS_DIR = "/home/user/skills/"
_TOOLS_DIR = "/home/user/skills/.tools/"
_LOG_PATH = "/home/user/skill_usage.jsonl"


def _log_entry(entry):
    try:
        with open(_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def _extract_skill(path):
    if _SKILLS_DIR not in path or _TOOLS_DIR in path:
        return None
    rest = path[path.index(_SKILLS_DIR) + len(_SKILLS_DIR):]
    name = rest.split("/", 1)[0]
    return name if name and not name.startswith(".") else None


def _auto_track():
    script = os.path.abspath(sys.argv[0]) if sys.argv else ""
    skill_name = _extract_skill(script)
    if not skill_name:
        return

    start = time.time()
    exc_info = {"error": None}
    original_excepthook = sys.excepthook

    def _on_exception(exc_type, exc_value, exc_tb):
        exc_info["error"] = f"{exc_type.__name__}: {exc_value}"
        original_excepthook(exc_type, exc_value, exc_tb)

    sys.excepthook = _on_exception

    def _on_exit():
        entry = {
            "ts": time.time(),
            "skill": skill_name,
            "script": script,
            "event": "execute",
            "duration_ms": round((time.time() - start) * 1000, 2),
        }
        if exc_info["error"]:
            entry["error"] = exc_info["error"]
        _log_entry(entry)

    atexit.register(_on_exit)


def _track_skill_imports():
    """Track when skill modules are imported at runtime via audit hook.

    sys.addaudithook cannot be removed — the agent cannot disable this.
    """
    logged_imports = set()

    def _audit_hook(event, args):
        if event != "import":
            return
        try:
            module_name = args[0] if args else None
            if not module_name:
                return
            # PEP 578: args = (name, filename, sys.path, sys.path_hooks, sys.meta_path)
            filepath = args[1] if len(args) > 1 and args[1] else ""
            if not filepath:
                return
            skill_name = _extract_skill(filepath)
            if not skill_name:
                return
            cache_key = (skill_name, filepath)
            if cache_key in logged_imports:
                return
            logged_imports.add(cache_key)
            _log_entry({
                "ts": time.time(),
                "skill": skill_name,
                "script": filepath,
                "event": "import",
            })
        except Exception:
            pass

    try:
        sys.addaudithook(_audit_hook)
    except Exception:
        pass


_auto_track()
_track_skill_imports()

```

---

## المجلد: gumcp-client
يحتوي هذا المجلد على 2 ملف(ات).

### اسم الملف: MIGRATION.md
**المسار الكامل:** `/home/user/skills/gumcp-client/MIGRATION.md`

```
# Migrating gumcp_client → Gumloop SDK / CLI

`gumcp_client` is deprecated. For new code use the **gumloop-sdk** skill. This maps the
old calls to the SDK and the equivalent CLI so you can port existing/saved scripts.

| Deprecated (`gumcp_client`) | Gumloop SDK | Gumloop CLI |
|---|---|---|
| `c = get_client()` | `from gumloop import Gumloop`<br>`c = Gumloop()` | (env-configured, nothing to set up) |
| `c.call_tool("gmail__read_emails", args)` | `c.mcp.execute("gmail", "read_emails", args)` | `gumloop mcp call gmail read_emails --args-json '{...}'` |
| `c.list_tools()` | `c.mcp.list_tools("gmail")` | `gumloop mcp tools gmail` |
| `c.get_resources()` | `c.mcp.list_resources("gmail")` | `gumloop mcp resources gmail` |
| `c.read_resource(uri)` | `c.mcp.get_resource("gmail", uri)` | `gumloop mcp resource gmail "<uri>"` |
| `c.list_prompts()` | `c.mcp.list_prompts("gmail")` | `gumloop mcp prompts gmail` |
| `c.get_prompt(name, args)` | `c.mcp.get_prompt("gmail", name, args)` | `gumloop mcp prompt gmail <name> --args-json '{...}'` |

Notes:
- Pass `server_id` and `tool_name` separately (`"gmail"`, `"read_emails"`), not a `server__tool` slug. SDK calls are per-server.
- `team_id` comes from the token, don't pass it.
- `execute(...)` returns an `McpExecuteResponse`: use `.results[0]`, check `.status == "success"`, then read `.decoded_content` (JSON already parsed; `.content` is the raw strings).

See the **gumloop-sdk** skill for full usage.

```

---

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/gumcp-client/SKILL.md`

```
---
name: gumcp-client
description: Deprecated — use the gumloop-sdk skill for new code. Covers existing gumcp_client/get_client() integration scripts in the sandbox; see MIGRATION.md to port them.
---

# guMCP Client

> ⚠️ **Deprecated — will be removed soon.** For new code use the **gumloop-sdk** skill.
> `gumcp_client` still works, so existing/saved scripts keep running; see `MIGRATION.md` to port one.

## When to Use This Skill

Only when you hit existing `get_client()` / `gumcp_client` code in a saved script or
trigger you must read or maintain. Never write new `gumcp_client` — use the
**gumloop-sdk** skill for all new work; see `MIGRATION.md` to port an old script.

## Import and Setup

The `gumcp_client` package is pre-installed and `get_client()` is **automatically available** in every sandbox Python execution — you do not need to import or define it.

```python
import json

# get_client() is pre-defined — just use it directly
with get_client() as client:
    raw = client.call_tool("slack__list_channels", {})
    channels = [json.loads(item) for item in raw]
```

**State persistence:** Imports, data variables, and function/class definitions all persist between sandbox executions. You can define a helper in one call and use it in the next.

## Calling Tools

`call_tool()` returns `list[str]` where each string is a JSON-encoded result item. Some tools return one item, others return multiple (e.g. Gmail returns one per email). Always parse every item:

```python
with get_client() as client:
    raw = client.call_tool("gmail__read_emails", {"max_results": 5})
    results = [json.loads(item) for item in raw]
    # results is now a list of parsed dicts -- one per email
    for email in results:
        print(email["subject"])
```

For single-result tools, the list has one item:

```python
with get_client() as client:
    raw = client.call_tool("slack__send_message", {
        "channel": "#general",
        "text": "Hello from the sandbox!"
    })
    result = json.loads(raw[0])  # single result
    print(result)
```

Tool slugs use the `server__tool_name` format (double underscore): `slack__send_message`, `gmail__read_emails`, `gsheets__read_spreadsheet`.

## Listing Available Tools

`list_tools()` returns a **dict** with a `"tools"` key containing a list of tool definitions:

```python
with get_client() as client:
    result = client.list_tools()
    for tool in result["tools"]:
        print(tool["name"], "-", tool["description"])
```

## Quick Discovery via Shell

Use the helper scripts for fast exploration without writing code:

```bash
# List all available tools across connected integrations
python3 /home/user/skills/gumcp-client/scripts/list_tools.py

# Call a tool directly from the command line
python3 /home/user/skills/gumcp-client/scripts/call_tool.py slack__send_message '{"channel": "#general", "text": "Hello!"}'

# List resources on a server
python3 /home/user/skills/gumcp-client/scripts/list_resources.py
```

## Server IDs

Server IDs in `call_tool()` must match the actual server ID, not the display name.
Run `python3 /home/user/skills/gumcp-client/scripts/list_tools.py` to discover the exact IDs.
Some common non-obvious mappings: Google BigQuery = `gbigquery`, Google Calendar = `gcalendar`,
Google Sheets = `gsheets`, Google Docs = `gdocs`, Google Drive = `gdrive`.

Only use server IDs that are listed as connected in your environment.

## Approach: Inspect First, Then Process

Never write processing logic against a response you haven't seen. Tool responses vary wildly in structure -- nested objects, lists of dicts, unexpected field names. Writing a batch script blind leads to key errors and wasted executions.

**Step 1: Explore the response shape with a single call.**

```python
with get_client() as client:
    raw = client.call_tool("apollo__enrich_person", {"email": "test@example.com"})
    sample = json.loads(raw[0])
    print(json.dumps(sample, indent=2))
```

**Step 2: Now that you know the field paths, write targeted extraction.**

```python
with get_client() as client:
    contacts = ["alice@co.com", "bob@co.com", "carol@co.com"]
    for email in contacts:
        raw = client.call_tool("apollo__enrich_person", {"email": email})
        data = json.loads(raw[0])
        # You know these paths exist because you inspected the response
        print(f"{email}: {data['person']['title']} at {data['person']['organization']['name']}")
```

This matters most for batch operations -- if you're processing 50 items and your field path is wrong, you waste the entire run. Inspect one, then process many.

## Task Decomposition

Before writing a script, decompose the user's request into ordered steps with dependencies:

- **GET before UPDATE/DELETE.** Mutating a resource requires its ID. If the user says "update the Jira ticket," you need to fetch the ticket first to get its ID, then update it.
- **Resolve names to IDs.** Platforms use internal IDs, not display names. "Post to #general" requires looking up the channel ID for "general" before sending. Same for user mentions, project names, labels, etc.
- **Skip lookups when identifiers are already known.** If the user provides a direct email address, URL, or ID, use it directly.
- **Identify parallel vs sequential steps.** Steps that don't depend on each other's output can run in parallel (see Parallel Execution pattern below). Steps that feed into each other must be sequential.

Example: "Fetch open PRs from GitHub and post a summary to Slack #engineering"
1. Fetch open PRs from GitHub (no dependency)
2. Look up Slack channel ID for "engineering" (no dependency -- parallel with step 1)
3. Format PR data into a message (depends on step 1)
4. Send message to Slack channel (depends on steps 2 and 3)

## Execution Patterns

All patterns below use `get_client()` which is automatically available (see Import and Setup above).

### Pagination

Use when a tool returns paged results (look for `next_cursor`, `next_page_token`, or `offset` in responses).

```python
with get_client() as client:
    all_items = []
    cursor = None

    while True:
        args = {"per_page": 100}
        if cursor:
            args["cursor"] = cursor

        raw = client.call_tool("github__list_issues", args)
        data = json.loads(raw[0])
        items = data.get("issues", [])
        all_items.extend(items)

        cursor = data.get("next_cursor")
        if not cursor or not items:
            break

    print(f"Fetched {len(all_items)} total items")
```

### Bulk Operations with Checkpoints

Use when processing many items (50+) where partial failure shouldn't lose progress.

```python
CHECKPOINT = "/home/user/processed.json"

def load_checkpoint():
    try:
        with open(CHECKPOINT) as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()

def save_checkpoint(done):
    with open(CHECKPOINT, "w") as f:
        json.dump(list(done), f)

with get_client() as client:
    done = load_checkpoint()
    contacts = [...]  # your full list

    for email in contacts:
        if email in done:
            continue
        try:
            client.call_tool("gmail__send_email", {"to": email, "subject": "Update", "body": "..."})
            done.add(email)
            save_checkpoint(done)
        except Exception as e:
            print(f"Failed {email}: {e}")

    print(f"Completed {len(done)}/{len(contacts)}")
```

### Error Recovery with Retry

Use when calling tools that may intermittently fail (rate limits, transient errors).

```python
import time

def call_with_retry(client, tool, args, max_retries=3):
    for attempt in range(max_retries):
        try:
            raw = client.call_tool(tool, args)
            return json.loads(raw[0])
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait = 2 ** attempt
            print(f"Retry {attempt + 1}/{max_retries} after {wait}s: {e}")
            time.sleep(wait)

with get_client() as client:
    data = call_with_retry(client, "apollo__enrich_person", {"email": "user@co.com"})
```

### Parallel Execution

Use when making many independent calls (e.g., enriching a list of contacts) where order doesn't matter.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

with get_client() as client:
    emails = ["alice@co.com", "bob@co.com", "carol@co.com"]

    def enrich(email):
        raw = client.call_tool("apollo__enrich_person", {"email": email})
        return email, json.loads(raw[0])

    results = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(enrich, e): e for e in emails}
        for future in as_completed(futures):
            try:
                email, data = future.result()
                results[email] = data
            except Exception as e:
                print(f"Failed {futures[future]}: {e}")

    print(f"Enriched {len(results)}/{len(emails)}")
```

## Sandbox Limitations

- Playwright and browser automation are not available in this sandbox environment. Use HTTP requests or integration tools instead.
- System packages cannot be installed (no root access). Use `pip install` for Python packages.
- Python execution has a 120-second timeout. Break long-running operations into smaller steps.

## Resources

### scripts/

Runnable helper scripts for quick tool discovery and execution from the shell.

### references/

Full API reference for the `Client` class, including all methods, error handling, and advanced patterns.

## Important Notes

- Credentials are pre-configured via environment variables.
- The `gumcp_client` package is pip-installed and available globally.
- Tools use the `server__tool_name` format (double underscore) for routing.
- Use `tool_discovery` first to find available tool names and their required arguments.
- Always use the `with` statement or call `client.close()` to clean up connections.

```

---

## المجلد: gumcp-client/references
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: api_reference.md
**المسار الكامل:** `/home/user/skills/gumcp-client/references/api_reference.md`

```
# guMCP Client API Reference

## Available Exports

The `gumcp_client` package exports the following:

```python
from gumcp_client import Client          # Synchronous client
from gumcp_client import AsyncClient     # Async client
from gumcp_client import Client, ToolError  # Client + exception for tool call failures
from gumcp_client import encode_cursor   # Cursor utility for paginated resource listing
```

## Client Class

The synchronous client for interacting with guMCP servers. A single client handles routing to all connected integrations via the `server__tool_name` convention.

### Constructor

```python
import os
from gumcp_client import Client

client = Client(
    user_id=os.getenv('GUMCP_USER_ID'),
    gumcp_api_key=os.getenv('GUMCP_ACCESS_TOKEN') or os.getenv('GUMCP_API_KEY'),
    base_url=os.getenv('GUMCP_BASE_URL'),
)
```

### call_tool(tool_name, arguments) -> list[str]

Call a tool and get results as a list of strings. Each string is a JSON-encoded response.
Tools use the `server__tool_name` format. Always parse with `json.loads(raw[0])`:

```python
import json

# server__tool_name format (double underscore)
raw = client.call_tool("slack__send_message", {
    "channel": "#general",
    "text": "Hello!"
})
result = json.loads(raw[0])
# result is now a parsed dict, e.g. {"ok": True}

raw = client.call_tool("gcalendar__create_event", {
    "summary": "Team standup",
    "start_datetime": "2026-02-12 09:00",
    "end_datetime": "2026-02-12 09:30"
})
event = json.loads(raw[0])
```

### list_tools() -> dict

List all available tools across connected integrations. Takes no arguments. Returns a dict with a `"tools"` key:

```python
result = client.list_tools()
# result is a dict:
# {
#     "tools": [
#         {
#             "name": "slack__send_message",
#             "description": "Send a message to a channel",
#             "input_schema": {"properties": {...}, "required": [...]}
#         },
#         ...
#     ]
# }
for tool in result["tools"]:
    print(tool["name"])
```

### get_resources(cursor=None) -> dict

List available resources. Supports pagination via cursor.

```python
result = client.get_resources()
# result = {
#     "resources": {"resource://uri": "Resource Name", ...},
#     "nextCursor": "..." or None
# }
```

### read_resource(uri) -> Any

Read a specific resource by URI.

```python
content = client.read_resource("resource://some-uri")
```

### list_prompts() -> dict

List available prompts.

```python
result = client.list_prompts()
# result = {"prompts": [{"name": "...", "description": "...", "arguments": [...]}]}
```

### get_prompt(name, arguments=None) -> dict

Get a specific prompt by name.

```python
result = client.get_prompt("my-prompt", {"arg1": "value"})
# result = {"description": "...", "messages": [...]}
```

### close()

Close the client connection. Always call when done, or use the context manager.

```python
client.close()
```

### Context Manager

```python
with Client(
    user_id=os.getenv('GUMCP_USER_ID'),
    gumcp_api_key=os.getenv('GUMCP_ACCESS_TOKEN') or os.getenv('GUMCP_API_KEY'),
    base_url=os.getenv('GUMCP_BASE_URL')
) as client:
    result = client.call_tool("slack__send_message", {"channel": "#general", "text": "Hello!"})
    # client.close() called automatically
```

## AsyncClient

For async code, use `AsyncClient` with `async/await`:

```python
from gumcp_client import AsyncClient

async with AsyncClient(
    user_id=os.getenv('GUMCP_USER_ID'),
    gumcp_api_key=os.getenv('GUMCP_ACCESS_TOKEN') or os.getenv('GUMCP_API_KEY'),
    base_url=os.getenv('GUMCP_BASE_URL')
) as client:
    result = await client.call_tool("slack__send_message", {"channel": "#general", "text": "Hi!"})
```

## Error Handling

```python
from gumcp_client import Client, ToolError, ConnectionError, ResourceError

try:
    result = client.call_tool("slack__send_message", {"channel": "#general", "text": "Hello!"})
except ToolError as e:
    print(f"Tool call failed: {e}")
except ConnectionError as e:
    print(f"Connection failed: {e}")
except ResourceError as e:
    print(f"Resource error: {e}")
```

### Exception Hierarchy

- `GumCPError` -- base exception
  - `AuthenticationError` -- auth failures
  - `ConnectionError` -- connection issues
  - `SessionError` -- invalid session
  - `ToolError` -- tool call failures
  - `ResourceError` -- resource access failures
  - `PromptError` -- prompt errors

## Common Patterns

### Multi-integration Workflow

```python
import json
import os
from gumcp_client import Client

with Client(
    user_id=os.getenv('GUMCP_USER_ID'),
    gumcp_api_key=os.getenv('GUMCP_ACCESS_TOKEN') or os.getenv('GUMCP_API_KEY'),
    base_url=os.getenv('GUMCP_BASE_URL')
) as client:
    # Read from Sheets
    raw = client.call_tool("gsheets__read_spreadsheet", {
        "spreadsheet_id": "...",
        "range": "Sheet1!A1:D100"
    })
    data = json.loads(raw[0])

    # Process with Python
    processed = transform(data)

    # Send via Slack
    client.call_tool("slack__send_message", {
        "channel": "#reports",
        "text": str(processed)
    })
```

### Paginated Resource Listing

```python
from gumcp_client import Client, encode_cursor

with Client(
    user_id=os.getenv('GUMCP_USER_ID'),
    gumcp_api_key=os.getenv('GUMCP_ACCESS_TOKEN') or os.getenv('GUMCP_API_KEY'),
    base_url=os.getenv('GUMCP_BASE_URL')
) as client:
    all_resources = {}
    cursor = encode_cursor("channel", None)

    while True:
        response = client.get_resources(cursor=cursor)
        all_resources.update(response.get("resources", {}))
        cursor = response.get("nextCursor")
        if not cursor:
            break

    print(f"Found {len(all_resources)} resources")
```

```

---

## المجلد: gumcp-client/scripts
يحتوي هذا المجلد على 4 ملف(ات).

### اسم الملف: _config.py
**المسار الكامل:** `/home/user/skills/gumcp-client/scripts/_config.py`

```
"""Shared configuration helpers for gumcp-client skill scripts."""

import json
import os
import sys

from gumcp_client import Client


def get_allowed_servers():
    """Read allowed_servers from GUMCP_CONFIG env var.

    Returns None when no config is set (no restriction), or a list
    of server IDs the agent is permitted to use.
    """
    raw = os.getenv('GUMCP_CONFIG')
    if not raw:
        return None
    try:
        return json.loads(raw).get('allowed_servers')
    except (json.JSONDecodeError, TypeError):
        return None


def validate_server_access(server_id, allowed_servers):
    """Exit with a clear error if server_id is not in the allowed list."""
    if allowed_servers is not None and server_id not in allowed_servers:
        print(
            f"Error: server '{server_id}' is not configured for this agent.\n"
            f"Available servers: {', '.join(sorted(allowed_servers))}",
            file=sys.stderr,
        )
        sys.exit(1)


def get_client():
    """Create a gumcp Client from environment variables, or exit on missing creds."""
    access_token = os.getenv('GUMCP_ACCESS_TOKEN')
    user_id = os.getenv('GUMCP_USER_ID')
    api_key = os.getenv('GUMCP_API_KEY')
    base_url = os.getenv('GUMCP_BASE_URL')

    if not base_url:
        print("Error: GUMCP_BASE_URL must be set.")
        sys.exit(1)

    if access_token:
        return Client(access_token=access_token, base_url=base_url)

    if not api_key or not user_id:
        print("Error: GUMCP_ACCESS_TOKEN (or GUMCP_API_KEY + GUMCP_USER_ID) must be set.")
        sys.exit(1)

    return Client(user_id=user_id, gumcp_api_key=api_key, base_url=base_url)

```

---

### اسم الملف: call_tool.py
**المسار الكامل:** `/home/user/skills/gumcp-client/scripts/call_tool.py`

```
#!/usr/bin/env python3
"""
Call a tool via the guMCP client.

Usage:
    python3 call_tool.py <server__tool_name> '<json_arguments>'

Examples:
    python3 call_tool.py slack__send_message '{"channel": "#general", "text": "Hello!"}'
    python3 call_tool.py gmail__read_emails '{"max_results": 5}'
    python3 call_tool.py gsheets__read_spreadsheet '{"spreadsheet_id": "...", "range": "Sheet1!A1:D10"}'
"""

import json
import sys

from gumcp_client import ToolError

from _config import get_allowed_servers, get_client, validate_server_access


def main():
    if len(sys.argv) < 2:
        print("Usage: call_tool.py <server__tool_name> '<json_arguments>'")
        print("\nExamples:")
        print('  call_tool.py slack__send_message \'{"channel": "#general", "text": "Hello!"}\'')
        print('  call_tool.py gmail__read_emails \'{"max_results": 5}\'')
        sys.exit(1)

    tool_name = sys.argv[1]
    arguments = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    # Validate server is in the agent's configured tool set
    if '__' in tool_name:
        validate_server_access(tool_name.split('__', 1)[0], get_allowed_servers())

    try:
        with get_client() as client:
            result = client.call_tool(tool_name, arguments)

            # Pretty-print the result
            for item in result:
                try:
                    parsed = json.loads(item)
                    print(json.dumps(parsed, indent=2))
                except (json.JSONDecodeError, TypeError):
                    print(item)
    except ToolError as e:
        print(f"Tool error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

```

---

### اسم الملف: list_resources.py
**المسار الكامل:** `/home/user/skills/gumcp-client/scripts/list_resources.py`

```
#!/usr/bin/env python3
"""
List available resources via the guMCP client.

Usage:
    python3 list_resources.py

Examples:
    python3 list_resources.py
"""

import sys

from _config import get_allowed_servers, get_client


def main():
    allowed_servers = get_allowed_servers()

    try:
        with get_client() as client:
            all_resources = {}

            if allowed_servers is not None:
                for sid in allowed_servers:
                    try:
                        result = client.get_resources(server_id=sid)
                        all_resources.update(result.get('resources', {}))
                    except Exception as e:
                        print(f"  Warning: could not list resources for {sid}: {e}", file=sys.stderr)
            else:
                result = client.get_resources()
                all_resources = result.get('resources', {})

            if not all_resources:
                print("No resources found.")
                return

            print(f"Available resources ({len(all_resources)} total):\n")
            for uri, name in all_resources.items():
                print(f"  {name}")
                print(f"    uri: {uri}")
                print()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

```

---

### اسم الملف: list_tools.py
**المسار الكامل:** `/home/user/skills/gumcp-client/scripts/list_tools.py`

```
#!/usr/bin/env python3
"""
List available tools via the guMCP client.

Usage:
    python3 list_tools.py

Examples:
    python3 list_tools.py
"""

import sys

from _config import get_allowed_servers, get_client


def main():
    allowed_servers = get_allowed_servers()

    try:
        with get_client() as client:
            all_tools = []

            if allowed_servers is not None:
                for sid in allowed_servers:
                    try:
                        result = client.list_tools(server_id=sid)
                        all_tools.extend(result.get('tools', []))
                    except Exception as e:
                        print(f"  Warning: could not list tools for {sid}: {e}", file=sys.stderr)
            else:
                result = client.list_tools()
                all_tools = result.get('tools', [])

            if not all_tools:
                print("No tools found.")
                return

            print(f"Available tools ({len(all_tools)} total):\n")
            for tool in all_tools:
                print(f"  {tool['name']}")
                if tool.get('description'):
                    print(f"    {tool['description']}")
                if tool.get('input_schema', {}).get('properties'):
                    params = list(tool['input_schema']['properties'].keys())
                    required = tool['input_schema'].get('required', [])
                    param_strs = []
                    for p in params:
                        param_strs.append(f"{p}*" if p in required else p)
                    print(f"    params: {', '.join(param_strs)}")
                print()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

```

---

## المجلد: gumloop-sdk
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/gumloop-sdk/SKILL.md`

```
---
name: gumloop-sdk
description: Call MCP integration tools (Slack, Gmail, Google Sheets, etc.) from the sandbox via the Gumloop CLI or SDK. Use to discover tools, make one-off calls, batch several at once, chain calls with custom logic, or read server resources and prompts.
---

# MCP Tools (Gumloop CLI & SDK)

The `gumloop` CLI and SDK are **already installed** in the sandbox — never pip
install them. Credentials are already in the env (`GUMLOOP_ACCESS_TOKEN`,
`GUMLOOP_BASE_URL`), so both work with no setup.

**Pick by speed — both hit the same backend:**
- **CLI** — fastest; no code to write. Use for discovery and one-off calls you don't post-process.
- **SDK** (in `sandbox_python`) — write + run a script, so slower. Use to transform, branch on, chain, or combine results in code.

## CLI

```bash
gumloop mcp tools <server_id>    # tools on a server
gumloop mcp call <server_id> <tool> --args-json '{"max_results": 5}'
gumloop mcp call <server_id> <tool> --args-file ./args.json
gumloop mcp call <server_id> <tool> --json   # JSON output (text content decoded)
```

## SDK

```python
from gumloop import Gumloop

client = Gumloop()   # base URL + token from env; project resolved from the token

resp = client.mcp.execute("<server_id>", "<tool>", {"max_results": 5})
result = resp.results[0]
if result.status != "success":
    raise RuntimeError(result.error)
data = result.decoded_content   # JSON content already parsed (list of dicts)

client.mcp.list_tools("<server_id>")   # tools on a server
```

## Chain & batch

Chain calls with logic in between — the main reason to reach for the SDK over the CLI:
```python
items = client.mcp.execute("<server_id>", "<tool>", {"max_limit": 50}).results[0].decoded_content
flagged = [i for i in items if i.get("priority") == 1]
for item in flagged:
    client.mcp.execute("<other_server_id>", "<tool>", {"text": item["title"]})
```

Batch independent calls into one request — run concurrently server-side, max 5:
```python
resp = client.mcp.execute_many([
    {"server_id": "<server_id>", "tool_name": "<tool>", "arguments": {"max_results": 5}},
    {"server_id": "<other_server_id>", "tool_name": "<tool>", "arguments": {}},
])
first = resp.results[0].decoded_content
second = resp.results[1].decoded_content
```

## Resources & prompts

Some servers expose readable resources and prompt templates — both per-server, and empty if the server doesn't support them.
```bash
gumloop mcp resources <server_id>                # list resources
gumloop mcp resource <server_id> <resource_uri>  # read one by URI
gumloop mcp prompts <server_id>                  # list prompt templates
gumloop mcp prompt <server_id> <prompt> --args-json '{"key": "value"}'
```
```python
resources = client.mcp.list_resources("<server_id>").resources
contents = client.mcp.get_resource("<server_id>", "<resource_uri>").contents
prompts = client.mcp.list_prompts("<server_id>").prompts
prompt = client.mcp.get_prompt("<server_id>", "<prompt>", {"key": "value"})
```

## Notes

- Call servers by their `server_id` (listed in your `<gumcp_servers>` context), passed separately from `tool_name` (not a `server__tool` slug).
- Tool responses vary in shape — inspect one result before writing batch logic.

```

---

## المجلد: script-connected-html-output
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/script-connected-html-output/SKILL.md`

```
---
name: script-connected-html-output
description: Rules for HTML files that fetch live data from integrations via data scripts. Activate when building dashboards, monitors, forms, or any HTML output where the data comes from integrations.
icon: activity
color: Blue
---

# Script-Connected HTML Output

When an HTML file displays data from integrations, use data scripts so the data refreshes every time the file is opened. Only hardcode data when the source is truly static (user-provided CSV, pasted text).

Refer to the `gumloop-sdk` skill for the client and tool-calling patterns.

## How It Works

For new script-connected HTML artifacts, start with:

```bash
python3 /home/user/skills/.tools/html_scaffold.py /home/user/myproject --script-connected
```

Then replace the generated `data.py` sample payload with the real Gumloop SDK call.

1. Write Python data scripts that fetch data via the Gumloop SDK and print JSON to stdout
2. Write the HTML to `fetch('/gumloop/data/{key}')` instead of hardcoding data
3. Export with `sandbox_download(..., scripts={"key": "/home/user/script.py"}, server_ids=["server_id"])`

The platform intercepts `/gumloop/` fetches and runs the matching script server-side.

## Example

**Data script** (`/home/user/get_issues.py`):

```python
import json
from gumloop import Gumloop

client = Gumloop()  # base URL + token from env; project resolved from the token
resp = client.mcp.execute("linear", "list_issues", {"max_limit": 50})
print(json.dumps(resp.results[0].decoded_content))
```

**HTML** uses `fetch` to load that data and render it:

```html
<script>
fetch('/gumloop/data/issues')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var container = document.getElementById('content');
    data.forEach(function(issue) {
      var div = document.createElement('div');
      div.textContent = issue.title;
      container.appendChild(div);
    });
  });
</script>
```

**Export** bundles both together:

```
sandbox_download(
  sandbox_path="/home/user/dashboard.html",
  scripts={"issues": "/home/user/get_issues.py"},
  server_ids=["linear"]
)
```

Keys in `scripts` and the fetch URLs must match. The tools each script may call are parsed from its source to scope the execute token — you don't list them. `server_ids` lists every server_id used by any script (enables connection checks when the artifact is shared).

## Write Actions

For forms that write back to integrations, use `/gumloop/action/{key}` with POST. The request body is forwarded to the script as `os.getenv("GUMLOOP_PAYLOAD")`.

```python
import os, json
from gumloop import Gumloop

client = Gumloop()  # base URL + token from env; project resolved from the token
payload = json.loads(os.getenv("GUMLOOP_PAYLOAD", "{}"))
resp = client.mcp.execute("linear", "create_issue", payload)
print(json.dumps(resp.results[0].decoded_content))
```

## Script Constraints

- Output JSON to stdout via `print(json.dumps(...))` — stdout is the response body
- Instantiate `Gumloop()` directly (runs in a one-off sandbox)
- Scripts can only call tools from `gumcp_server` type servers (see server-discovery catalog). Do not use `gumstack_server` or `mcp_server` tools in data scripts — they will fail at execute time
- For read-only scripts, run them once in the sandbox before exporting to verify they return valid JSON
- Omit `scripts` from `sandbox_download` entirely for static HTML

```

---

## المجلد: server-discovery
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/server-discovery/SKILL.md`

```
---
name: server-discovery
description: Reference for all server types, connected integrations, and available servers.
---

# Server Discovery

Tool slugs use `server_id__tool_name` (double underscore). Use `tool_discovery` to get exact slugs.

## All Servers

| server_id | name | type | capability | status | authenticated | description |
|-----------|------|------|------------|--------|---------------|-------------|
| affinity | affinity | gumcp_server | manage_records | available | no | Get all opportunities in list "Prospects" |
| ahrefs | ahrefs | gumcp_server | get_data | available | no | Get backlink data for a domain and list referring domains with DR > 50 |
| airtable | airtable | gumcp_server | get_data | available | no | List all records in the "Leads" table created this month |
| apify | apify | gumcp_server | scrape_web | available | n/a | Run an Apify actor to extract product data from an e-commerce site |
| apollo | apollo | gumcp_server | enrich_data | connected | n/a | Enrich a contact by email |
| asana | asana | gumcp_server | manage_tasks | available | no | Get all tasks in a project |
| ashby | ashby | gumcp_server | recruiting | available | no | Get all candidates in the last month |
| attio | attio | gumcp_server | manage_records | available | no | Get contact details for john.doe@email.com and show recent interactions |
| beehiiv | beehiiv | gumcp_server | bulk_email | available | no | Add a subscriber to my newsletter using their email |
| box | box | gumcp_server | manage_files | available | no | List files in my root folder |
| brandfetch | brandfetch | gumcp_server | enrich_data | connected | n/a | Look up brand data, logos, and colors for gumloop.com |
| cal | cal | gumcp_server | schedule | available | no | List all events in my calendar for the next 3 days with location details |
| chorus | chorus | gumcp_server | get_data | available | no | Search meetings or calls |
| clickhouse | clickhouse | gumcp_server | get_data | available | no | Query a ClickHouse Cloud service or manage dashboards and alerts |
| confluence | confluence | gumcp_server | create_content | available | no | List all pages in a specific space |
| cursor | cursor | gumcp_server | automation | available | no | Launch a Cursor agent to implement a feature |
| databricks | databricks | gumcp_server | get_data | available | no | Query the serving endpoint |
| datadog | datadog | gumcp_server | get_data | available | no | List all monitors in critical state |
| devin | devin | gumcp_server | automation | available | no | Create a Devin session to fix a bug |
| dropbox | dropbox | gumcp_server | manage_files | available | no | List all files in a folder larger than 10MB uploaded this year |
| exa | exa | gumcp_server | search_web | available | n/a | Search the web with AI |
| excel | excel | gumcp_server | get_data | available | no | Get all rows from the "Q2 Sales" sheet where status is "Closed Won" |
| expensify | expensify | gumcp_server | payments | available | no | Get all transactions in the last month |
| extend | extend | gumcp_server | automation | available | no | Process files or documents through workflows |
| fal | fal | gumcp_server | create_content | available | n/a | Generate an image of a sunset over mountains |
| fathom | fathom | gumcp_server | get_data | available | no | Get the transcript and summary from my last meeting |
| fellow | fellow | gumcp_server | get_data | available | no | Access meeting recordings, notes, and transcripts |
| findymail | findymail | gumcp_server | enrich_data | available | no | Find verified email addresses and phone numbers for contacts |
| firecrawl | firecrawl | gumcp_server | scrape_web | available | n/a | Search, scrape, crawl, or map websites for data with Firecrawl |
| foreplay | foreplay | gumcp_server | get_data | available | n/a | Get all brands |
| freshdesk | freshdesk | gumcp_server | support | available | no | List all open tickets from the last week |
| freshsales | freshsales | gumcp_server | manage_records | available | no | List contacts and deals in Freshsales |
| gads | gads | gumcp_server | get_data | available | no | Get all campaigns for a specific account |
| gamma | gamma | gumcp_server | create_content | available | no | Create a new presentation |
| ganalytics | ganalytics | gumcp_server | get_data | available | no | Get website traffic for the last 7 days broken down by country |
| gappsheet | gappsheet | gumcp_server | get_data | available | no | Get all rows from a table where status is "Active" |
| gbigquery | gbigquery | gumcp_server | get_data | available | no | Run a SQL query on a dataset to get total sales for Q1 2024 |
| gcalendar | gcalendar | gumcp_server | schedule | available | no | Give me all meetings from the previous 24 hours with more than 2 attendees |
| gcs | gcs | gumcp_server | manage_files | available | no | Manage files and buckets |
| gdocs | gdocs | gumcp_server | create_content | available | no | Find all documents shared with me by Alice in the last month |
| gdrive | gdrive | gumcp_server | manage_files | available | no | Get all files in a folder that have "budget" in the file name |
| gdv360 | gdv360 | gumcp_server | get_data | available | no | Get all campaigns for a specific account |
| github | github | gumcp_server | manage_tasks | available | no | List all repositories for a user and show the number of open issues for each |
| gitlab | gitlab | gumcp_server | manage_tasks | available | no | Open a merge request from feature/x into main on mygroup/myproject |
| glooker | glooker | gumcp_server | get_data | available | no | Interact with Google Looker to run queries, manage dashboards, and schedule deliveries |
| gmail | gmail | gumcp_server | send_message | available | no | Retrieve the last 5 unread emails with attachments from my inbox |
| gmaps | gmaps | gumcp_server | get_data | available | n/a | Get directions from my current location to the office |
| gmeet | gmeet | gumcp_server | schedule | available | no | Create a new meeting for the "Engineering" team tomorrow at 10am |
| gong | gong | gumcp_server | get_data | available | no | List all calls in the last 30 days |
| gpagespeed | gpagespeed | gumcp_server | get_data | available | n/a | Analyze the performance of a website |
| greenhouse | greenhouse | gumcp_server | recruiting | available | no | Get all candidates in the last month |
| gsearchconsole | gsearchconsole | gumcp_server | get_data | available | no | Show me top search queries for my site over the last 30 days |
| gsheets | gsheets | gumcp_server | get_data | available | no | Get all rows from the "Q2 Sales" sheet where status is "Closed Won" |
| gslides | gslides | gumcp_server | create_content | available | no | Create a presentation about Q1 results with charts and speaker notes |
| gtasks | gtasks | gumcp_server | manage_tasks | available | no | Manage tasks and task lists |
| hex | hex | gumcp_server | get_data | available | no | List all projects in my Hex workspace |
| hubspot | hubspot | gumcp_server | manage_records | available | no | Find a contact by email and show their last 3 deals |
| incident_io | incident_io | gumcp_server | support | available | no | Create a critical incident for database outage |
| instagram | instagram | gumcp_server | social_media | available | n/a | Get comments on a post |
| intercom | intercom | gumcp_server | manage_records | available | no | Get all users in the last month |
| jira | jira | gumcp_server | manage_tasks | available | no | List all issues assigned to me in the "Backend" project with priority High |
| launchdarkly | launchdarkly | gumcp_server | get_data | available | no | List all feature flags in a project |
| linear | linear | gumcp_server | manage_tasks | available | no | List all open issues assigned to me in the "Website Redesign" project |
| loops | loops | gumcp_server | bulk_email | available | no | Create a new contact |
| luma | luma | gumcp_server | schedule | available | no | List all upcoming events on my Luma calendar |
| monday | monday | gumcp_server | manage_tasks | available | no | List all items in the "Product Launch" board with status "In Progress" |
| netsuite | netsuite | gumcp_server | manage_records | available | no | Get all customers in the last month |
| notion | notion | gumcp_server | create_content | available | no | Find a page by title and list all subpages created in 2024 |
| outlook | outlook | gumcp_server | send_message | available | no | Get my last 10 unread emails |
| outlook_calendar | outlook_calendar | gumcp_server | schedule | available | no | Get all my meetings for today |
| pagerduty | pagerduty | gumcp_server | support | available | no | Get all alerts in the last 24 hours |
| parallel | parallel | gumcp_server | search_web | available | n/a | Search the web with AI |
| pipedrive | pipedrive | gumcp_server | manage_records | available | no | Get all deals in the last month |
| postgresql | postgresql | gumcp_server | get_data | available | no | Get all tables in a database |
| quickbooks | quickbooks | gumcp_server | payments | available | no | Analyze cash flow trends and generate financial metrics for my business |
| reddit | reddit | gumcp_server | social_media | available | no | Get the latest posts from the r/machinelearning subreddit with more than 100 upvotes |
| reducto | reducto | gumcp_server | other | connected | n/a | Summarize a document and highlight the top 3 key points |
| salesforce | salesforce | gumcp_server | manage_records | available | no | Get Account details by account id and list all open opportunities |
| salesloft | salesloft | gumcp_server | manage_records | available | no | Get all contacts in the last month |
| seismic | seismic | gumcp_server | get_data | available | no | Perform operations on Seismic content, users, and engagements |
| semrush | semrush | gumcp_server | get_data | connected | n/a | Get all keywords for a specific domain |
| shopify | shopify | gumcp_server | payments | available | no | List all products in the store that are out of stock |
| sigma_computing | sigma_computing | gumcp_server | get_data | available | no | Interact with Sigma Computing to manage workbooks, data, and analytics |
| slack | slack | gumcp_server | send_message | available | no | Get all messages from the #general channel from Ben in the last 3 days |
| snowflake | snowflake | gumcp_server | get_data | available | no | Get all tables in a database |
| sprig | sprig | gumcp_server | get_data | available | no | Retrieve survey responses and analyze user feedback |
| stripe | stripe | gumcp_server | payments | available | no | Get all invoices for a specific customer |
| tableau | tableau | gumcp_server | get_data | available | no | Interact with Tableau to access dashboards, data, and metrics |
| teams | teams | gumcp_server | send_message | available | no | Get all members in a team |
| tiktok | tiktok | gumcp_server | social_media | available | n/a | Get comments on a post |
| trello | trello | gumcp_server | manage_tasks | available | no | List all cards on my "Product Roadmap" board |
| webflow | webflow | gumcp_server | create_content | available | no | List all sites and collections |
| word | word | gumcp_server | create_content | available | no | Create a document with the title "AI Trends 2050" |
| workday | workday | gumcp_server | recruiting | available | no | Download report from url |
| x | x | gumcp_server | social_media | available | no | Search for tweets about AI and get the top 10 results |
| youtube | youtube | gumcp_server | social_media | connected | n/a | Get all videos from a channel |
| zendesk | zendesk | gumcp_server | support | available | no | List all open tickets assigned to the "Support" group in the last 48 hours |
| zoom | zoom | gumcp_server | schedule | available | no | Get all meetings in the last month |

**Status**: `connected` = ready to use, `available` = can be added, `blocked` = restricted by org policy.

## Adding a Server

Use `add_server_awaiter` with the `server_id` to add any server to this agent. Identify ALL servers a task needs upfront and add them in a single step (parallel tool calls).

```

---

## المجلد: skill-creator
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/skill-creator/SKILL.md`

```
---
name: skill-creator
description: Creates and improves agent skills using Gumloop's sandbox helpers and SKILL.md conventions. Use when the user asks to create, refactor, validate, or document skills.
icon: sparkles
color: Purple
---

# Skill Creator

## When to Use

Use this skill when the task is about authoring or improving another skill, including:

- Creating a new skill from scratch
- Updating an existing `SKILL.md`
- Restructuring long skill docs into references
- Validating naming/frontmatter rules
- Tightening quality with concise instructions and examples

If the task is not skill-authoring related, do not activate this skill.

## Workflow

Use this checklist for skill creation and major edits:

```
Skill Authoring Progress:
- [ ] Step 1: Confirm scope and skill name
- [ ] Step 2: Scaffold or inspect existing files
- [ ] Step 3: Draft concise SKILL.md
- [ ] Step 4: Add resource directories only if needed
- [ ] Step 5: Validate and fix issues
```

### Step 1: Confirm scope and skill name

- Use lowercase hyphen-case names only (`a-z`, `0-9`, `-`).
- Keep name <= 64 chars.
- Ensure the directory name and frontmatter `name` are identical.
- Prefer clear capability names over vague names.

### Step 2: Scaffold or inspect files

For new skills, scaffold first:

```bash
python3 /home/user/skills/.tools/init_skill.py my-skill-name
```

Add `--scripts`, `--references`, or `--assets` only when the skill needs them.

For existing skills, read:

```bash
sandbox_file(action="read", path="skills/my-skill-name/SKILL.md")
```

### Step 3: Draft concise SKILL.md

Write only what changes behavior. Assume the model already understands basics.

Frontmatter requirements:

- `name`: required, hyphen-case, <=64 chars
- `description`: required, non-empty, <=1024 chars, no angle brackets
- Optional: `icon`, `color`, `related_server_ids`
- `related_server_ids`: array of actual server IDs from server discovery (e.g. `[apollo, gbigquery]`) when the skill is specific to one or more integrations. Enables server-scoped skill discovery. Omit this field if you are not sure which exact server IDs apply.

Description should state both:

1. What the skill does
2. When it should be used (triggering context)

### Step 4: Add resource directories only if needed

Most skills only need a `SKILL.md`. Only create resource directories when there's a concrete reason:

- `scripts/`: deterministic code that would otherwise be rewritten each time
- `references/`: large docs that would bloat SKILL.md past ~500 lines
- `assets/`: static files used in skill output (templates, images)

If you do add references, keep them one level deep from SKILL.md.

### Step 5: Validate and iterate

Run validation:

```bash
python3 /home/user/skills/.tools/quick_validate.py my-skill-name
```

If validation fails:

1. Fix reported issues
2. Re-run validation
3. Repeat until valid

## Authoring Patterns

Choose the right degree of specificity:

- High freedom: heuristics and principles for variable tasks
- Medium freedom: templates/pseudocode with parameters
- Low freedom: exact commands for fragile workflows

Default to one recommended method, then document exceptions only when needed.

## Quality Guardrails

- Do not create resource directories or files unless the skill clearly benefits from them.
- Use consistent terminology across the skill.
- Avoid time-sensitive instructions unless clearly marked as legacy.
- Prefer short, concrete examples over long explanations.
- Include verification loops for critical workflows.
- For longer reference files, add a table of contents at the top.

## Output Expectations

When asked to create/update a skill, produce:

1. Updated `SKILL.md` with valid frontmatter
2. Any needed files in `scripts/`, `references/`, or `assets/`
3. Validation result from `quick_validate.py`

If the user asks for multiple changes, apply them directly and re-validate.

```

---

## المجلد: spreadsheet-output
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/spreadsheet-output/SKILL.md`

```
---
name: spreadsheet-output
description: Formatting rules for generating CSV and XLSX files that render cleanly in the Gumloop spreadsheet viewer. Activate when creating, exporting, or transforming tabular data files.
icon: table
color: Green
---

# Spreadsheet Output

Rules for producing CSV and XLSX files that render correctly in the artifact spreadsheet viewer. The viewer has specific parsing behavior that silently breaks tables when the data doesn't follow these conventions.

## When to Apply

Activate this skill when:

- Creating CSV or XLSX files for user consumption
- Transforming or reshaping data into tabular output
- Exporting query results, reports, or structured data
- Any time the output will be downloaded via `sandbox_download` as a `.csv` or `.xlsx` file

## Format Decision Framework

Choose the right format before writing any data:

| Scenario | Format | Why |
|---|---|---|
| Single homogeneous table | CSV | Simpler, smaller, universally supported |
| 2+ logical tables with different column schemas | XLSX with separate sheets | CSV has no tab/sheet support; sections get mashed into one broken table |
| Related data needing cross-reference (e.g., orders + customers) | XLSX with named sheets | Each sheet gets its own clean header row and tab in the viewer |
| Quick data dump or single query result | CSV | Minimal overhead |

**Rule of thumb:** If you would need blank rows or `=== SECTION ===` separators in a CSV, use XLSX with separate sheets instead.

## Rule Categories

| Priority | Category | Impact |
|---|---|---|
| 1 | Header Row | CRITICAL |
| 2 | Row Structure | CRITICAL |
| 3 | Multi-Table Data | HIGH |
| 4 | Cell Values | HIGH |
| 5 | Column Design | MEDIUM |
| 6 | Sorting & Search | MEDIUM |
| 7 | XLSX-Specific | MEDIUM |
| 8 | Size & Limits | LOW |

### 1. Header Row (CRITICAL)

The viewer uses `rawRows[0]` as column headers. Everything after row 0 is data. No exceptions.

- `header-row-first` -- Row 1 MUST be column headers. A title row like `=== Sales Report ===` becomes the only column header, pushing real headers into data rows.
- `header-no-duplicates` -- Duplicate column names get "(2)", "(3)" suffixes automatically. Use unique, descriptive names.
- `header-match-data-width` -- The header row must have at least as many fields as the widest data row. The viewer computes `maxCols` across ALL rows and fills missing headers with "Column N".
- `header-no-empty` -- Empty string headers become "Column N" because the fallback uses `||` (falsy check). Always provide a meaningful name.
- `header-short-descriptive` -- Headers are used as sort labels, column visibility toggles, and clipboard copy keys. Keep them short but descriptive.

```python
# BAD -- title row before headers
writer.writerow(["=== Monthly Revenue Report ==="])
writer.writerow(["Month", "Revenue", "Growth"])
writer.writerow(["Jan", "120000", "5%"])

# GOOD -- headers first, always
writer.writerow(["Month", "Revenue", "Growth"])
writer.writerow(["Jan", "120000", "5%"])
```

### 2. Row Structure (CRITICAL)

The CSV parser treats every `\n` as a row boundary. There is zero section detection or blank-row filtering.

- `row-no-blanks` -- Blank rows render as empty data rows in the grid. Never use blank lines as separators.
- `row-no-section-headers` -- Text like `=== SECTION ===` lands in cells as raw strings. Use XLSX sheets instead.
- `row-consistent-width` -- Every row should have the same number of fields as the header. Shorter rows get empty cells; wider rows force extra "Column N" headers to appear.
- `row-no-trailing-newline` -- A trailing `\n\n` creates an empty data row at the bottom. Strip trailing newlines.
- `row-sorted-default` -- Pre-sort data in a sensible default order. The viewer supports re-sorting by column, but good defaults matter.

```python
# BAD -- blank rows and section separators
writer.writerow(["Conference", "Team", "Wins"])
writer.writerow(["East", "Celtics", "64"])
writer.writerow([])  # blank row = empty data row in viewer
writer.writerow(["=== Western Conference ==="])  # lands in cells as text
writer.writerow(["West", "Thunder", "68"])

# GOOD -- flat table, no separators
writer.writerow(["Conference", "Team", "Wins"])
writer.writerow(["East", "Celtics", "64"])
writer.writerow(["West", "Thunder", "68"])
```

### 3. Multi-Table Data (HIGH)

CSV always renders as a single sheet. XLSX renders with clickable sheet tabs when there are 2+ sheets.

- `multi-table-use-xlsx` -- Multiple logical tables with different schemas MUST use XLSX with separate sheets. Never cram multiple tables into one CSV.
- `multi-table-sheet-names` -- Use meaningful sheet names. They appear as clickable tabs. The tab UI only appears when there are 2+ sheets.
- `multi-table-per-sheet-rules` -- Each sheet follows the same rules (row 1 = headers, consistent width, no blanks).

```python
# BAD -- multiple tables crammed into one CSV
writer.writerow(["=== Standings ==="])
writer.writerow(["Team", "Wins", "Losses"])
writer.writerow(["Celtics", "64", "18"])
writer.writerow([])
writer.writerow(["=== Leaders ==="])
writer.writerow(["Category", "Player", "Value"])
writer.writerow(["Points", "SGA", "32.7"])

# GOOD -- XLSX with separate sheets
import openpyxl
wb = openpyxl.Workbook()

ws1 = wb.active
ws1.title = "Standings"
ws1.append(["Team", "Wins", "Losses"])
ws1.append(["Celtics", "64", "18"])

ws2 = wb.create_sheet("Leaders")
ws2.append(["Category", "Player", "Value"])
ws2.append(["Points", "SGA", "32.7"])

wb.save("season_summary.xlsx")
```

```python
# GOOD -- pandas ExcelWriter for multiple DataFrames
with pd.ExcelWriter("report.xlsx", engine="openpyxl") as writer:
    standings_df.to_excel(writer, sheet_name="Standings", index=False)
    leaders_df.to_excel(writer, sheet_name="Leaders", index=False)
    awards_df.to_excel(writer, sheet_name="Awards", index=False)
```

### 4. Cell Values (HIGH)

All cell values are stored as strings. No type detection, no formatting.

- `cell-no-formula-prefix` -- Avoid starting cells with `=`, `+`, `-`, `@`, `\t`, `\r`. The viewer's CSV export escapes these with a leading apostrophe `'`, which shows in the exported file.
- `cell-quote-special` -- Quote fields containing commas, newlines, or double quotes per RFC 4180. Python's `csv.writer` handles this automatically.
- `cell-consistent-types` -- Don't mix sentinel strings with data in the same column. Use empty string `""` for missing values, not "N/A", "null", or "None".
- `cell-format-dates-as-strings` -- XLSX date serial numbers are NOT converted by the viewer. A date cell shows as "45306" instead of "2024-01-15". Always write dates as pre-formatted strings.
- `cell-format-numbers-as-display` -- XLSX number formatting is ignored. Percentages (0.5), currency ($1,234) show as raw values. Write the display string directly.

```python
# BAD -- datetime objects in XLSX (viewer shows serial numbers)
from datetime import datetime
ws.append([datetime(2024, 1, 15), 0.5, 1234.56])
# Viewer shows: 45306 | 0.5 | 1234.56

# GOOD -- pre-formatted strings
ws.append(["2024-01-15", "50%", "$1,234.56"])
# Viewer shows: 2024-01-15 | 50% | $1,234.56
```

```python
# BAD -- mixed missing value representations
writer.writerow(["Alice", "95", "A"])
writer.writerow(["Bob", "N/A", "null"])  # inconsistent sentinels
writer.writerow(["Carol", "None", ""])

# GOOD -- empty string for missing values
writer.writerow(["Alice", "95", "A"])
writer.writerow(["Bob", "", ""])
writer.writerow(["Carol", "", ""])
```

### 5. Column Design (MEDIUM)

Column headers are used as TanStack Table column IDs, sort keys, visibility toggle labels, and clipboard copy keys.

- `col-unique-names` -- Every column header must be unique. The viewer deduplicates with "(2)", "(3)" suffixes which look ugly.
- `col-no-index-only` -- Don't add a bare row-number column. The viewer already shows 1-indexed row numbers in a sticky leftmost gutter.
- `col-logical-order` -- Put identifying columns (name, ID, category) first, then metrics/values. Users scan left-to-right.
- `col-no-colon-in-header` -- Avoid `:` in column headers. The cell selection system uses `rowIndex:columnId` as cell keys and splits on the first `:`.

```python
# BAD -- pandas default index column
df.to_csv("output.csv")  # includes unnamed index column
# Viewer shows: "Column 1" (empty header) | Name | Score

# GOOD -- no index
df.to_csv("output.csv", index=False)
# Viewer shows: Name | Score
```

### 6. Sorting & Search (MEDIUM)

Sorting is string-based (TanStack Table default). Search is case-insensitive substring matching.

- `sort-aware-values` -- "9" sorts AFTER "10" alphabetically. For numeric columns that users will sort, pre-sort the data or use zero-padding.
- `search-friendly-values` -- Use human-readable values, not encoded IDs. Search checks `value.toLowerCase().includes(query)` across all visible cells.
- `sort-default-sensible` -- Pre-sort data in the most useful default order.

```python
# BAD -- numeric strings that sort wrong
# Sorted: 1, 10, 2, 20, 3
rows = [["1", "Alice"], ["2", "Bob"], ["10", "Carol"], ["3", "Dave"], ["20", "Eve"]]

# GOOD -- pre-sort the data before writing
rows.sort(key=lambda r: int(r[0]))
# Written order: 1, 2, 3, 10, 20 (correct default view)
```

### 7. XLSX-Specific (MEDIUM)

The XLSX parser extracts raw cell values from the XML. It skips styles, formulas, charts, and all non-data content.

- `xlsx-no-formulas` -- The viewer reads `<v>` element content only. Formula cells show cached values or empty strings.
- `xlsx-no-styling` -- All styling (colors, fonts, borders, conditional formatting) is completely ignored.
- `xlsx-dates-as-strings` -- Write dates as pre-formatted strings, not Excel date serial numbers. The parser has no date conversion logic.
- `xlsx-numbers-as-display` -- Write number values as display strings. Percentage formatting, currency symbols, decimal places must be in the cell value itself.
- `xlsx-use-openpyxl` -- Use openpyxl or xlsxwriter (both available in the sandbox). When writing with openpyxl, pass string values to avoid unintended type coercion.

### 8. Size & Limits (LOW)

- `size-under-50mb` -- Files over 50 MB skip inline preview and show a download prompt. Keep spreadsheet files well under this limit.
- `size-reasonable-rows` -- Very large spreadsheets (100k+ rows) work with virtualization but may be slow to parse and sort. Consider summary tables for large datasets.

## Common Mistakes

| Mistake | What Happens in Viewer | Fix |
|---|---|---|
| Title row before headers | Title becomes the only column header; real headers appear as data | Remove title, start with data headers |
| Blank rows between sections | Empty data rows in the grid | Use XLSX sheets for sections |
| Duplicate column names | "(2)", "(3)" suffixes on headers | Use unique names |
| Jagged row widths | Extra "Column N" fallback names appear | Pad all rows to consistent width |
| Empty string header | Becomes "Column N" | Always provide meaningful header names |
| Formula-prefix characters (`=`, `+`, `-`, `@`) | Escaped with `'` on CSV export | Restructure data or prefix with space |
| `to_csv(index=True)` | Unlabeled first column (empty header becomes "Column 1") | Use `index=False` |
| Styling/formatting in XLSX | Completely ignored | Don't bother with styling |
| Section separators in CSV | Raw text in data cells | Use XLSX with named sheets |
| Excel date serial numbers in XLSX | Shows "45306" instead of "2024-01-15" | Format dates as strings before writing |
| Unformatted numbers in XLSX | Shows "0.5" instead of "50%" | Write display strings: "50%", "$1,234" |
| Trailing blank line in CSV | Empty data row at the bottom of the grid | Strip trailing newlines from output |
| Colon `:` in column header | Can break cell selection keyboard nav | Avoid colons in header names |
| Numeric columns without pre-sorting | "9" sorts after "10" (string sort) | Pre-sort data before writing |

## Review Checklist

```
Before exporting any CSV/XLSX:
- [ ] Row 1 is column headers (no title rows, no metadata, no blank rows above)
- [ ] All headers are non-empty strings (no "" headers)
- [ ] All headers are unique (no duplicates)
- [ ] All headers avoid colons (:)
- [ ] All rows have the same number of fields as the header row
- [ ] No blank rows anywhere in the data
- [ ] No section separator rows (=== TITLE === etc.)
- [ ] No trailing blank lines
- [ ] No unnecessary index/row-number column (viewer provides one)
- [ ] Data sorted in a sensible default order
- [ ] If multiple tables: using XLSX with separate sheets
- [ ] If XLSX: sheet names are meaningful
- [ ] If XLSX: dates written as formatted strings, not serial numbers
- [ ] If XLSX: numbers include display formatting ("50%" not 0.5)
- [ ] No cells starting with = + - @ unless intentional
- [ ] Using UTF-8 encoding, no BOM
- [ ] File size well under 50 MB
```

```

---

## المجلد: trigger-builder
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: SKILL.md
**المسار الكامل:** `/home/user/skills/trigger-builder/SKILL.md`

```
---
name: trigger-builder
description: Build custom polling triggers that monitor MCP tools and fire the agent when something new is detected. Subclass BaseTrigger, implement check() and run_trigger_test(). Use when existing operator triggers don't cover the use case.
---

# Trigger Builder

## When to Use

Use `create_mcp_trigger` when the user wants monitoring that existing integration triggers can't handle (cross-service conditions, services without operator triggers, custom filtering, value monitoring).

## Workflow

Follow these steps in order:

1. **Ensure servers are connected.** Identify ALL servers the task needs upfront. Call `add_server_awaiter` for every missing server in parallel (one call per server, all in the same step) so the user adds them all at once.
2. **Discover tools.** Run the list_tools script to get exact tool names and parameter schemas. Never guess.
3. **Build the trigger.** Subclass `BaseTrigger`, implement `check()` and `run_trigger_test()`.
4. **Test in sandbox.** Run the trigger class with `run("test")` in a single `sandbox_python` call.
5. **Create the trigger.** Call `create_mcp_trigger` only after the test succeeds.
6. **Report issues.** If something fails due to user-side configuration (wrong email, missing permissions), report clearly and ask the user to correct it.

## Discovering Tools

Discover all available tools BEFORE writing any code:

```bash
gumloop mcp list            # connected servers
gumloop mcp tools <server>  # tools + parameter schemas on a server
```

Never guess tool names. Never make API calls before discovering the correct tool names and parameters from this output.

## What You Write

Read `/home/user/skills/gumloop-sdk/SKILL.md` for the client API and `/home/user/skills/trigger-builder/scripts/trigger_base.py` for the BaseTrigger class.

You write a `class Trigger(BaseTrigger)` with two methods:
- `check(**inputs)` -- poll for changes, return `(fired: bool, data: list[dict] | None)`
- `run_trigger_test()` -- make real calls to verify the trigger works

The system provides: imports, client setup, state management, validation, and the runner. When passing `trigger_code` to `create_mcp_trigger`, do NOT include `from trigger_base import BaseTrigger` -- the system provides it. Only include it when testing in sandbox.

### Available on `self`:
- `self.client` -- MCP client (see the gumloop-sdk skill)
- `self.client.mcp.execute("server", "tool", {args})` -- parsed results in `resp.results[0].decoded_content`
- `self.state.latest("key")` -- last checkpoint value, or None
- `self.state.push({"key": "value"})` -- stage a checkpoint (committed after successful poll)
- `self.state.has_seen("key", value)` -- True if any checkpoint has key == value

### Example

```python
class Trigger(BaseTrigger):
    def _read(self, query, max_results):
        resp = self.client.mcp.execute("gmail", "read_emails",
            {"query": query, "max_results": max_results})
        return resp.results[0].decoded_content

    def check(self, sender_email):
        last_id = self.state.latest("last_id")
        emails = self._read(f"from:{sender_email}", 10)
        if not emails:
            return False, None
        latest_id = emails[0]["id"]
        if latest_id == last_id:
            return False, None
        self.state.push({"last_id": latest_id})
        if last_id is None:
            return False, None
        return True, [{"email_id": e["id"], "subject": e["subject"]}
                      for e in emails if e["id"] != last_id]

    def run_trigger_test(self):
        emails = self._read(f"from:{self._input_args['sender_email']}", 5)
        if not emails:
            return {"status": "no_data"}
        return {"status": "success",
                "baseline_state": [{"last_id": emails[0]["id"]}]}
```

## Contracts

**`check()` is read-only detection. The agent handles all actions.** The trigger detects the condition; the prompt tells the agent what to do with the data.

**Inputs**: `check()` receives `trigger_inputs` values as kwargs.
**Outputs**: `check()` returns `(fired: bool, data: list[dict] | None)`. Dict keys must match `trigger_outputs`.
**Class name**: Always `Trigger`.
**Trigger name**: Short descriptive name like "Email from {sender}" or "New message in {channel}".

**Data selectivity is critical.** `data` must contain ONLY items that are new since the last poll -- not everything the API returned. Use state to filter down to the delta.

**`poll_frequency`**: Choose based on the user's intent, not the default. "Notify me immediately" → 300s. "Send a daily report" → 86400. "Check every hour" → 3600. Match the cadence to what makes sense for the use case -- don't waste credits polling every 5 min when hourly is fine.

## State Management

State is a **sliding window of 5000 entries** persisted across poll cycles. It exists solely for dedup -- do NOT store raw API responses.

**One push per poll cycle.** Push a single checkpoint dict at the end of `check()` with the minimum needed for dedup.

**`latest()` is O(1)** -- primary dedup pattern. `has_seen()` scans all entries -- use only when needed. `get()` returns all entries -- if you need it, your dedup strategy is probably wrong.

Choose the right checkpoint for the use case -- don't default to `last_id` if the data doesn't have stable IDs. Think about what actually changes and what uniquely identifies "new" data. The sandbox has standard libraries (hashlib, collections, etc.) if needed. Never compromise on trigger accuracy to save a few bytes of state.

## Testing

Write the class AND test in a **single `sandbox_python` call** (sandbox state does not persist between calls):

```python
import sys, json
sys.path.insert(0, "/home/user/skills/trigger-builder/scripts")
from trigger_base import BaseTrigger

class Trigger(BaseTrigger):
    # ... your code ...

trigger = Trigger(
    state_data=[],
    input_args={"sender_email": "user@example.com"},
    expected_outputs={"email_id", "subject"}
)
result = trigger.run("test")
print(json.dumps(result, indent=2))
```

Only call `create_mcp_trigger` after the test succeeds.

## Testing an Existing Trigger

When the user wants to test a trigger after creation, use `manage_integration_trigger` with `action: "test_now"` and the `trigger_id`. This runs the trigger's `check()` live against the current state and returns the result directly.

Interpret the result: `status: "fired"` + `data` = new data detected (show the items). `status: "empty"` = no new data since the last poll. `status: "error"` = report the error.

## Gotchas

- **Tool call failures are not your problem to fix.** If `mcp.execute()` returns auth/credential/connection errors, surface the error to the user -- don't mock data or invent workarounds. Fix logic bugs in your code, not infrastructure issues.
- **Triggers ALWAYS fire THIS agent** -- NEVER ask "which agent" or "do you mean this agent". Just build it.
- Confirm user-provided INPUT VALUES (email addresses, URLs, etc.) before creating -- but don't ask about design decisions. Just build it.
- Extract shared logic between `check()` and `run_trigger_test()` into private helper methods -- don't copy-paste
- `mcp.execute(...).results[0].decoded_content` gives the JSON content already parsed (`.content` is the raw strings)
- Read-only tools only -- never use tools that create, update, delete, or send
- Push ONE checkpoint per cycle AFTER all API calls succeed -- not before, not per item
- First run = baseline -- when `state.latest()` returns `None`, push a checkpoint but return `(False, None)`

```

---

## المجلد: trigger-builder/scripts
يحتوي هذا المجلد على 1 ملف(ات).

### اسم الملف: trigger_base.py
**المسار الكامل:** `/home/user/skills/trigger-builder/scripts/trigger_base.py`

```
"""
Base class for MCP polling triggers.

AI subclasses BaseTrigger and implements:
  - check(**inputs) -> (fired: bool, data: list[dict] | None)
  - run_trigger_test() -> dict

BaseTrigger.run() handles validation, error classification, and output contract enforcement.

Triggers always fire the agent they're attached to. Never ask the user which agent to call.
"""

import json
import os
from typing import Any, Optional

from gumloop import Gumloop


class TriggerError(Exception):
    """Raise from check() or run_trigger_test() for clean, surfaceable errors."""
    pass


class TriggerState:
    """Checkpoint storage for deduplication across poll cycles.

    Available as self.state on BaseTrigger subclasses.

    Methods:
        get()                -> list[dict]  all checkpoints (committed + staged)
        push(entry: dict)    -> None        stage a new checkpoint
        latest(key=None)     -> dict | value | None   last checkpoint or field from it
        has_seen(key, value) -> bool        True if any checkpoint has key == value
    """

    MAX_ENTRIES = 5000  # Oldest entries are trimmed when state exceeds this limit

    def __init__(self, initial: list) -> None:
        self._current: list[dict] = list(initial)
        self._staged: list[dict] = []

    def get(self) -> list[dict]:
        """All checkpoints (committed + staged this cycle)."""
        return self._current + self._staged

    def push(self, entry: dict) -> None:
        """Stage a new checkpoint entry. Committed after successful poll.
        Trimming happens in _commit_state(), not here."""
        if not isinstance(entry, dict):
            raise TriggerError(f"state.push() expects dict, got {type(entry).__name__}")
        self._staged.append(entry)

    def latest(self, key: Optional[str] = None) -> Any:
        """Last checkpoint entry, or a specific field from it.

        state.latest()          -> last dict or None
        state.latest("last_id") -> value of "last_id" in last dict, or None
        """
        entries = self.get()
        if not entries:
            return None
        last = entries[-1]
        return last.get(key) if key else last

    def has_seen(self, key: str, value: Any) -> bool:
        """Check if any checkpoint has key == value. Useful for dedup."""
        return any(e.get(key) == value for e in self.get())

    def get_staged(self) -> list[dict]:
        """Entries staged this cycle (not yet committed)."""
        return self._staged


class _Client:
    """Gumloop SDK with a gumcp-compatible call_tool, so one client serves both:
    new triggers call self.client.mcp.execute(...); existing triggers call
    self.client.call_tool("server__tool", args). Project/team comes from the token.
    """

    def __init__(self) -> None:
        self._sdk = Gumloop()
        self.mcp = self._sdk.mcp

    def call_tool(self, slug: str, arguments: Optional[dict] = None) -> list:
        server_id, _, tool_name = slug.partition("__")
        response = self.mcp.execute(server_id, tool_name, arguments or {})
        if not response.results:
            raise TriggerError(f"{slug} returned no results")
        result = response.results[0]
        if result.status != "success":
            raise TriggerError((result.error or {}).get("message") or f"{slug} failed")
        return result.content or []


class BaseTrigger:
    """Abstract base for MCP polling triggers.

    Subclass this and implement:
        check(**inputs)        -> (fired: bool, data: list[dict] | None)
        run_trigger_test()     -> dict with test results

    Available on self:
        self.client  -- MCP client: self.client.mcp.execute("gmail", "read_emails", args)
                        (existing triggers' self.client.call_tool("gmail__read_emails", args) also works)
        self.state   -- TriggerState with get/push/latest/has_seen
    """

    def __init__(
        self,
        state_data: list,
        input_args: dict[str, Any],
        expected_outputs: set[str],
    ) -> None:
        self.state = TriggerState(state_data)
        self._client = None
        self._input_args = input_args
        self._expected_outputs = expected_outputs

    @property
    def client(self):
        if self._client is None:
            self._client = _Client()
        return self._client

    def check(self, **inputs: Any) -> tuple[bool, Optional[list[dict]]]:
        """Override this. Return (fired, data).

        fired: True if the trigger should fire, False otherwise
        data:  list of dicts matching trigger_outputs when fired, None otherwise
        """
        raise NotImplementedError("Subclass must implement check()")

    def run_trigger_test(self) -> dict:
        """Override this. Make real calls to verify the trigger works.

        Return a dict, e.g.:
            {"status": "success", "baseline_state": [{"last_id": "..."}]}
            {"status": "no_data", "message": "No items found"}
        """
        raise NotImplementedError("Subclass must implement run_trigger_test()")

    def run(self, mode: str = "check") -> dict:
        """System entry point. Wraps check/test with validation and error handling."""
        try:
            if mode == "test":
                return self.run_trigger_test()

            result = self.check(**self._input_args)

            if not isinstance(result, tuple) or len(result) != 2:
                return _error("contract", "check() must return (fired: bool, data)")

            fired, data = result

            if fired and data:
                if not isinstance(data, list) or not all(isinstance(d, dict) for d in data):
                    return _error("contract", "data must be list[dict]")
                if self._expected_outputs:
                    for item in data:
                        missing = self._expected_outputs - set(item.keys())
                        if missing:
                            return _error(
                                "contract",
                                f"data missing keys {missing} from trigger_outputs",
                            )
                return {
                    "status": "fired",
                    "data": data,
                    "staged_state": self.state.get_staged(),
                }

            return {"status": "empty", "staged_state": self.state.get_staged()}

        except TriggerError as e:
            return _error("trigger", str(e))
        except Exception as e:
            return _error(_classify_error(e), str(e))


def _error(error_type: str, message: str) -> dict:
    return {"status": "error", "error_type": error_type, "message": message}


def _classify_error(e: Exception) -> str:
    try:
        err = json.loads(str(e))
        code = err.get("error_status", 0)
        if code == 429:
            return "rate_limit"
        if code in (401, 403):
            return "auth"
    except Exception:
        if "timeout" in str(e).lower():
            return "timeout"
    return "unknown"

```

---

