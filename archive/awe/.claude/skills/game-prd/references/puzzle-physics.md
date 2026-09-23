# Puzzle / Physics Reference

Use this for rule-based games, physics toys with goals, spatial puzzles, chain-reaction mechanics, and interaction-driven logic games.

## What Must Be Clear in the Spec

- the core rule set
- what the player can manipulate
- how the game communicates cause and effect
- what counts as solving a level or challenge
- how new complexity is introduced without confusion

## Good Clarifying Questions

- What is the single rule the player must learn first?
- Is success about logic, timing, dexterity, or setup?
- Are failures reset instantly, or do they carry penalties?
- How many mechanics are introduced in v1?
- Are levels handcrafted or generated from reusable patterns?

## Scope Traps

- too many interacting mechanics at once
- vague puzzle goals
- physics chaos without readable feedback
- adding progression before the core rule teaches well

## Healthy V1 Shape

- one primary mechanic
- a short ladder of levels or scenarios
- instant reset / undo or other low-friction retry
- very explicit success and failure feedback

## Strong Early Slices

1. Implement the core rule with one test chamber
2. Add success / fail detection
3. Add quick reset / retry flow
4. Add 3-5 escalating puzzle setups
5. Add optional presentation polish

## Signs the Spec Is Too Thin

- puzzles are described by theme instead of rules
- difficulty is expected to "emerge" without authored structure
- failure state exists but recovery is slow or unclear
- the player has too many actions before the first rule lands
