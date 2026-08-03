#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
OPENCODE_DIR=${OPENCODE_DIR:-"$HOME/.config/opencode"}
SKILLS_SRC="$SCRIPT_DIR/skills"
AGENTS_SRC="$SCRIPT_DIR/agents"
COMMANDS_SRC="$SCRIPT_DIR/commands"
SKILLS_DST="$OPENCODE_DIR/skills"
AGENTS_DST="$OPENCODE_DIR/agents"
COMMANDS_DST="$OPENCODE_DIR/commands"

install_skills=false
install_agents=false
install_commands=false
force=false
selected_agents=()

# name|short description
AGENT_PACKS=(
  "skein|Minimal end-to-end: plan, parallel build, review, fix. YAGNI-first."
  "athena|Planning only. Explores the repo and writes an implementation plan."
  "hermes|Execution. Splits a plan into parallel workstreams, verifies, finishes."
  "atlas|Builds a sparse AGENTS.md network for a repository."
)

usage() {
  cat <<'EOF'
Usage: ./install.sh [options]

Install handy-opencode skills, agents, and commands into your OpenCode config.

Options:
  --skills              Install skills
  --agents              Install all agent packs
  --agent <name>        Install one agent pack (repeatable)
  --commands            Install commands
  --all                 Install skills, all agents, and commands
  --force               Replace existing targets
  --help                Show this help text

Agent packs:
EOF
  local entry name desc
  for entry in "${AGENT_PACKS[@]}"; do
    name=${entry%%|*}
    desc=${entry#*|}
    printf '  %-10s %s\n' "$name" "$desc"
  done
  cat <<'EOF'

If no install target is provided, the script runs in interactive mode.
EOF
}

agent_pack_names() {
  local entry
  for entry in "${AGENT_PACKS[@]}"; do
    printf '%s\n' "${entry%%|*}"
  done
}

is_known_agent() {
  local name=$1 entry
  for entry in "${AGENT_PACKS[@]}"; do
    if [[ "${entry%%|*}" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

add_agent() {
  local name=$1 existing
  if ! is_known_agent "$name"; then
    printf 'Unknown agent pack: %s\n' "$name" >&2
    printf 'Available: %s\n' "$(agent_pack_names | paste -sd' ' -)" >&2
    exit 1
  fi
  for existing in "${selected_agents[@]+"${selected_agents[@]}"}"; do
    if [[ "$existing" == "$name" ]]; then
      return 0
    fi
  done
  selected_agents+=("$name")
  install_agents=true
}

select_all_agents() {
  local name
  selected_agents=()
  while IFS= read -r name; do
    selected_agents+=("$name")
  done < <(agent_pack_names)
  install_agents=true
}

prompt_choice() {
  printf 'Select what to install:\n'
  printf '  1) Skills\n'
  printf '  2) Agents\n'
  printf '  3) Commands\n'
  printf '  4) Skills, agents, and commands\n'
  printf 'Choice [1-4]: '
  read -r choice

  case "$choice" in
    1)
      install_skills=true
      ;;
    2)
      install_agents=true
      ;;
    3)
      install_commands=true
      ;;
    4)
      install_skills=true
      install_agents=true
      install_commands=true
      ;;
    *)
      printf 'Invalid choice: %s\n' "$choice" >&2
      exit 1
      ;;
  esac
}

prompt_agents() {
  local entry name desc i=1
  local -a names=()

  printf '\nSelect agent packs (comma-separated, or "all"):\n'
  for entry in "${AGENT_PACKS[@]}"; do
    name=${entry%%|*}
    desc=${entry#*|}
    names+=("$name")
    printf '  %d) %-10s %s\n' "$i" "$name" "$desc"
    i=$((i + 1))
  done
  printf 'Choice [all]: '
  read -r choice

  if [[ -z "$choice" || "$choice" == all ]]; then
    select_all_agents
    return
  fi

  selected_agents=()
  local part idx
  IFS=',' read -ra parts <<< "$choice"
  for part in "${parts[@]}"; do
    part=${part//[[:space:]]/}
    if [[ "$part" =~ ^[0-9]+$ ]]; then
      idx=$((part - 1))
      if (( idx < 0 || idx >= ${#names[@]} )); then
        printf 'Invalid choice: %s\n' "$part" >&2
        exit 1
      fi
      add_agent "${names[$idx]}"
    else
      add_agent "$part"
    fi
  done

  if [[ ${#selected_agents[@]} -eq 0 ]]; then
    printf 'No agent packs selected.\n' >&2
    exit 1
  fi
}

ensure_dir() {
  local dir=$1
  mkdir -p "$dir"
}

link_one() {
  local src=$1
  local target=$2
  local label=$3

  if [[ -e "$target" || -L "$target" ]]; then
    if [[ "$force" == true ]]; then
      rm -rf "$target"
    else
      printf 'Skipping existing %s: %s\n' "$label" "$target"
      return 1
    fi
  fi

  ln -s "$src" "$target"
  printf 'Linked %s: %s -> %s\n' "$label" "$target" "$src"
  return 0
}

link_directory_contents() {
  local src_dir=$1
  local dst_dir=$2
  local label=$3

  if [[ ! -d "$src_dir" ]]; then
    printf 'Skipping %s: source directory not found at %s\n' "$label" "$src_dir"
    return
  fi

  ensure_dir "$dst_dir"

  local installed=0
  local skipped=0

  shopt -s nullglob
  local src name target
  for src in "$src_dir"/*; do
    name=$(basename "$src")
    target="$dst_dir/$name"
    if link_one "$src" "$target" "$label"; then
      installed=$((installed + 1))
    else
      skipped=$((skipped + 1))
    fi
  done
  shopt -u nullglob

  printf '%s complete: %d installed, %d skipped\n' "$label" "$installed" "$skipped"
}

link_agent_packs() {
  local pack src_dir installed=0 skipped=0
  local src name target

  if [[ ${#selected_agents[@]} -eq 0 ]]; then
    select_all_agents
  fi

  ensure_dir "$AGENTS_DST"

  shopt -s nullglob
  for pack in "${selected_agents[@]}"; do
    src_dir="$AGENTS_SRC/$pack"
    if [[ ! -d "$src_dir" ]]; then
      printf 'Skipping agent pack %s: not found at %s\n' "$pack" "$src_dir"
      continue
    fi

    printf 'Installing agent pack: %s\n' "$pack"
    for src in "$src_dir"/*.md; do
      name=$(basename "$src")
      target="$AGENTS_DST/$name"
      if link_one "$src" "$target" "agent"; then
        installed=$((installed + 1))
      else
        skipped=$((skipped + 1))
      fi
    done
  done
  shopt -u nullglob

  printf 'agents complete: %d installed, %d skipped\n' "$installed" "$skipped"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills)
      install_skills=true
      ;;
    --agents)
      select_all_agents
      ;;
    --agent)
      if [[ $# -lt 2 ]]; then
        printf '--agent requires a name\n' >&2
        exit 1
      fi
      add_agent "$2"
      shift
      ;;
    --agent=*)
      add_agent "${1#*=}"
      ;;
    --commands)
      install_commands=true
      ;;
    --all)
      install_skills=true
      install_commands=true
      select_all_agents
      ;;
    --force)
      force=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "$install_skills" == false && "$install_agents" == false && "$install_commands" == false ]]; then
  prompt_choice
fi

if [[ "$install_agents" == true && ${#selected_agents[@]} -eq 0 ]]; then
  prompt_agents
fi

printf 'Installing into %s\n' "$OPENCODE_DIR"

if [[ "$install_skills" == true ]]; then
  link_directory_contents "$SKILLS_SRC" "$SKILLS_DST" "skills"
fi

if [[ "$install_agents" == true ]]; then
  link_agent_packs
fi

if [[ "$install_commands" == true ]]; then
  link_directory_contents "$COMMANDS_SRC" "$COMMANDS_DST" "commands"
fi

printf 'Done.\n'
