---
name: game-prd
description: "Create a lightweight game spec / PRD before implementation. Use when planning a new game, clarifying a fuzzy game idea, auditing a game spec, or turning a casual game concept into a scoped implementation plan. Triggers: plan my game, spec out this game, game PRD, game requirements, game design doc, audit this game spec, convert game spec to prd.json."
---

# Game Spec / PRD

This skill exists to prevent shallow game implementation.

Do not jump straight into scene edits, scripts, assets, or systems. First lock down:

- what the player actually does
- why a session is compelling
- what is in scope for the first playable version
- what the implementation slices are

Aim for a useful middle ground:

- more concrete than a vague idea dump
- lighter than a full studio GDD
- tuned for casual or small-to-medium games unless the user clearly wants more

## Default Stance

- Prefer a lean spec over a bloated one.
- Ask only the questions that materially change the build plan.
- Use concrete examples and constraints, but do not force fake precision too early.
- Keep engine-specific terminology mostly in implementation notes, not in the concept section.
- Stop after the spec and implementation plan unless the user explicitly asks to build.

## Choose the Right Output

Pick one of these modes based on how clear the request already is.

### 1. Discovery Brief

Use when the idea is still fuzzy.

Output:

- one-line game concept
- player fantasy
- likely core loop
- biggest unknowns
- a short list of next decisions

### 2. Lean Game Spec

Default for most requests.

Use when the user wants a practical spec that can lead to implementation without becoming overly formal.

Output:

- concept and player experience
- core loop
- core systems
- scope / non-goals
- content outline
- success criteria
- first implementation slices

### 3. Full Game Spec

Use only when the game has multiple interacting systems, unusual constraints, or the user explicitly asks for more detail.

Add:

- progression / economy if relevant
- controls / camera
- UI / HUD
- technical notes
- tuning table only for values that really matter up front

### 4. Ralph `prd.json`

Only do this after the markdown spec is accepted and the user explicitly asks for JSON conversion.

When needed, read [references/ralph-json.md](references/ralph-json.md).

## Workflow

### Step 1: Understand the Game Before Specifying It

Figure out these items before writing the plan:

- game promise: what makes this worth playing?
- player verbs: move, dodge, shoot, collect, solve, place, race, survive, etc.
- session shape: how a run / level starts, escalates, and ends
- scope target: toy prototype, polished vertical slice, or small complete game
- production constraints: assets, platform, controls, performance, deadline

If the user already answered most of this, do not ask redundant questions.

### Step 2: Ask Targeted Clarifying Questions

Ask 0-5 questions depending on ambiguity. Do not mechanically ask 5 every time.

Good topics:

- what the player does most of the time
- what makes the player win, lose, or finish a session
- how much content exists in v1
- what must feel good early
- what must stay intentionally simple
- whether assets / platform / perspective are fixed

Use short options when the user seems undecided, but do not force lettered multiple choice if natural language is faster.

Example prompts:

```text
1. Which play pattern is closest?
   A. Combat / survival
   B. Collection / exploration
   C. Puzzle / physics
   D. Platforming / runner
   E. Other

2. What ends a run or level?
   A. Survive long enough
   B. Reach a goal or exit
   C. Collect / score enough
   D. Solve the puzzle
   E. Endless until failure

3. What is the target for v1?
   A. Tiny prototype to prove the loop
   B. Short polished vertical slice
   C. Small complete casual game

4. What should stay deliberately minimal in v1?
   A. Art / assets
   B. Enemy or obstacle variety
   C. Progression / meta systems
   D. UI / menus
   E. Story / narrative
```

Do not ask for every numeric stat up front. Many values can stay qualitative until the implementation plan.

## Write the Spec at the Right Level

### Lean Game Spec Template

Use this by default.

```markdown
# Game Spec: [Game Name]

## One-Line Pitch
[One sentence: fantasy + loop + differentiator]

## Player Experience
- Who the player is
- What should feel satisfying or tense
- Session length / pacing target

## Core Loop
[Moment-to-moment loop and what creates repetition + escalation]

## Core Systems
- Movement / controls
- Main interaction or mechanic
- Hazards / opponents / puzzle rules
- Scoring / progression / fail state

## World / Content Outline
- Level or arena structure
- Content budget for v1
- Required assets or placeholders

## Scope and Non-Goals
- Explicit in-scope items
- Explicit out-of-scope items

## Success Criteria
- What must be true for the first playable version to count as successful

## Implementation Plan
### Slice 1: [First playable]
- Outcome
- Acceptance criteria

### Slice 2: [Next highest-leverage step]
- Outcome
- Acceptance criteria
```

### Full Game Spec Additions

Add these only when they matter:

- controls / camera model
- progression or economy
- UI / HUD / menus
- tuning table
- technical notes
- open questions / risks

If a section would be filler, omit it.

## Implementation Plan Rules

The plan should help an agent build the game in deliberate steps, not invite premature overbuilding.

### Story / Slice Size

Each slice should be small enough for one focused implementation pass.

Good slices:

- set up one playable arena or course
- implement one movement model
- implement one primary mechanic
- add one hazard / enemy / puzzle rule
- add HUD for the values the player actually needs
- add end-state and restart flow

Too big:

- build the whole game
- add all enemies, all levels, and polish
- create the full UI and progression system

### Ordering

Use dependency-aware ordering, but do not force a single template on every genre.

Typical order:

1. play space / basic level shell
2. player controller or interaction model
3. state / rules that make the loop meaningful
4. primary challenge or objective
5. scoring / progression / fail state
6. UI and screens
7. polish

Adjust this when the genre needs a different order. For example, a puzzle game may need rule logic before level dressing.

### Acceptance Criteria

Acceptance criteria must be observable and testable.

Good:

- player reaches the exit after collecting 3 keys
- one enemy patrols between 2 points and damages on contact
- timer counts down from 60 and triggers lose state at 0

Bad:

- game feels fun
- controls are good
- enemy works correctly

For implementation-facing slices:

- include `Typecheck passes` when code changes are expected
- include browser verification for visual / scene / UI work when relevant

## Auditing an Existing Game Spec

When the user asks for an audit or critique, evaluate the spec against these questions:

1. Does it clearly state the player fantasy and minute-to-minute loop?
2. Does it define when a session ends, succeeds, or fails?
3. Is the v1 scope realistic for a casual game?
4. Are the implementation slices small and buildable in order?
5. Does it avoid forcing unnecessary detail too early?
6. Are engine / technical details supporting the plan rather than dominating it?

Common failure modes:

- overfitting the spec to one genre template
- using technical jargon in place of actual game design decisions
- writing long sections without clarifying the core loop
- specifying too many systems for v1
- creating backlog items that are too large for one implementation pass

## Genre References

Read only the closest-fit reference, and only when it will sharpen the spec:

- [references/combat-survival.md](references/combat-survival.md)
- [references/collection-exploration.md](references/collection-exploration.md)
- [references/puzzle-physics.md](references/puzzle-physics.md)
- [references/platformer-runner.md](references/platformer-runner.md)

If the game blends multiple patterns, use one primary reference and borrow lightly from another.

## Engine / Repo Notes

If the user is planning a game in this repo:

- keep the concept section engine-agnostic
- move oncyber-specific details into implementation notes
- use the `engine` skill only when you need API patterns or scene constraints

The spec should explain the game first and the engine second.

## Output

If the user asked for a spec / PRD file, save it to:

- `tasks/prd-[game-name].md`

Use kebab-case for the filename.

If the conversation is still exploratory, it is fine to present the draft inline first and only write the file once the idea stabilizes.
