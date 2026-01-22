#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Adapted for cursor-agent instead of amp
# Usage: ./ralph.sh [max_iterations]

# Don't exit on errors - we want to continue the loop
# set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$PROJECT_ROOT/prd.json"
PROGRESS_FILE="$PROJECT_ROOT/progress.txt"
PROMPT_FILE="$PROJECT_ROOT/prompt.md"
LOG_DIR="$PROJECT_ROOT/.ralph"
MASTER_LOG="$LOG_DIR/ralph.log"

# Logging function
log() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $1" | tee -a "$MASTER_LOG"
}

# Ensure cursor-agent is available
if ! command -v cursor-agent &> /dev/null; then
  echo "Error: cursor-agent not found. Install via: curl https://cursor.com/install -fsS | bash"
  exit 1
fi

# Ensure required files exist
if [ ! -f "$PRD_FILE" ]; then
  echo "Error: prd.json not found at $PRD_FILE"
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: prompt.md not found at $PROMPT_FILE"
  exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"

# Initialize master log
echo "" >> "$MASTER_LOG"
echo "========================================" >> "$MASTER_LOG"
log "Ralph session started"
log "Max iterations: $MAX_ITERATIONS"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Check if all stories pass
check_all_pass() {
  local remaining=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null)
  echo "${remaining:-0}"
}

# Get next story to work on
get_next_story() {
  jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0].id // empty' "$PRD_FILE" 2>/dev/null
}

# Get story title
get_story_title() {
  local story_id="$1"
  jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .title' "$PRD_FILE" 2>/dev/null
}

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  🐛 Ralph Wiggum - Autonomous Development Loop"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Project: $(jq -r '.name' "$PRD_FILE" 2>/dev/null)"
echo "Max iterations: $MAX_ITERATIONS"
echo "Stories remaining: $(check_all_pass)"
echo "Log file: $MASTER_LOG"
echo ""

cd "$PROJECT_ROOT"

for i in $(seq 1 $MAX_ITERATIONS); do
  REMAINING=$(check_all_pass)
  
  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  🎉 Ralph completed all tasks!"
    echo "═══════════════════════════════════════════════════════"
    log "SUCCESS: All stories completed at iteration $i"
    exit 0
  fi
  
  NEXT_STORY=$(get_next_story)
  STORY_TITLE=$(get_story_title "$NEXT_STORY")
  ITER_LOG="$LOG_DIR/iteration-$i.log"
  ITER_PROMPT="$LOG_DIR/iteration-$i-prompt.md"
  
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  Stories remaining: $REMAINING"
  echo "  Working on: $NEXT_STORY - $STORY_TITLE"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  
  log "Starting iteration $i - Story: $NEXT_STORY ($STORY_TITLE)"
  
  # Build the prompt file for this iteration
  cat "$PROMPT_FILE" > "$ITER_PROMPT"
  cat >> "$ITER_PROMPT" << PROMPT_END

---

## Current PRD State

$(cat "$PRD_FILE")

---

## Progress So Far (Last 100 lines)

$(tail -100 "$PROGRESS_FILE")

---

## Guardrails (Read First!)

$(cat "$LOG_DIR/guardrails.md" 2>/dev/null || echo "No guardrails yet.")

---

## Your Task This Iteration

**Story:** $NEXT_STORY - $STORY_TITLE

**Instructions:**
1. Read the story's acceptance criteria from prd.json above
2. Implement the required changes (modify files, create components, etc.)
3. Run: npm run build
4. If build passes, update prd.json to set passes: true for story $NEXT_STORY
5. Append learnings to progress.txt with format:
   ### Story $NEXT_STORY - $(date '+%Y-%m-%d')
   **What I Did:** [summary]
   **Patterns Found:** [patterns]
   **Gotchas:** [gotchas]
   **For Next Time:** [advice]
6. Commit: git add -A && git commit -m "feat($NEXT_STORY): [description]"

**CRITICAL:** You MUST update progress.txt with learnings and set passes: true in prd.json when done!

When ALL stories have passes: true, output: COMPLETE
PROMPT_END

  log "Prompt file created: $ITER_PROMPT ($(wc -l < "$ITER_PROMPT") lines)"
  
  # Record start time
  START_TIME=$(date +%s)
  
  # Run cursor-agent with the prompt
  # Using --output-format to try to capture output better
  log "Launching cursor-agent..."
  echo "--- cursor-agent output start ---" > "$ITER_LOG"
  
  # Run cursor-agent and capture all output
  cursor-agent -p "$(cat "$ITER_PROMPT")" >> "$ITER_LOG" 2>&1
  AGENT_EXIT_CODE=$?
  
  echo "--- cursor-agent output end ---" >> "$ITER_LOG"
  
  # Record end time
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  log "cursor-agent finished (exit code: $AGENT_EXIT_CODE, duration: ${DURATION}s)"
  log "Output log: $ITER_LOG ($(wc -l < "$ITER_LOG") lines)"
  
  # Check if story was marked complete
  NEW_REMAINING=$(check_all_pass)
  if [ "$NEW_REMAINING" -lt "$REMAINING" ]; then
    log "✅ Story completed! Stories remaining: $NEW_REMAINING"
  else
    log "⚠️ Story not marked complete. Stories remaining: $NEW_REMAINING"
  fi
  
  # Check for git commits
  LATEST_COMMIT=$(git log --oneline -1 2>/dev/null)
  log "Latest commit: $LATEST_COMMIT"
  
  # Add iteration summary to progress file
  echo "" >> "$PROGRESS_FILE"
  echo "### Iteration $i - $(date '+%Y-%m-%d %H:%M')" >> "$PROGRESS_FILE"
  echo "- Story: $NEXT_STORY" >> "$PROGRESS_FILE"
  echo "- Duration: ${DURATION}s" >> "$PROGRESS_FILE"
  echo "- Status: $([ "$NEW_REMAINING" -lt "$REMAINING" ] && echo "Completed ✅" || echo "In Progress")" >> "$PROGRESS_FILE"
  
  echo ""
  echo "Iteration $i complete. Waiting 3 seconds before next..."
  sleep 3
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ⚠️  Ralph reached max iterations ($MAX_ITERATIONS)"
echo "═══════════════════════════════════════════════════════"
log "Max iterations reached. Stories remaining: $(check_all_pass)"
echo "Stories remaining: $(check_all_pass)"
echo "Check $MASTER_LOG for details."
exit 1
