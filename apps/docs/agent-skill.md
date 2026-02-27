# Agent Skill

Install the `cryptowi.re` skill to help your coding agent work with this repo and API conventions.

## Install With skill-installer

Use the built-in skill installer script:

```sh
python3 "$CODEX_HOME/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo han1ue/cryptowire \
  --path skills/cryptowi-re
```

If `CODEX_HOME` is not set, use `~/.codex`:

```sh
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo han1ue/cryptowire \
  --path skills/cryptowi-re
```

After install, restart Codex so the new skill loads.

## What The Skill Includes

- Repository layout and common workflows
- API/local endpoint behavior
- Widget and docs update guardrails
- Validation checklist before shipping changes
