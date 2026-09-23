# Ralph `prd.json` Conversion

Read this only after the markdown spec is approved and the user explicitly asks for `prd.json`.

## Output

- file: `tasks/prd-[game-name].json`
- one JSON entry per implementation slice / story

## Format

```json
{
  "project": "[Game Name]",
  "branchName": "ralph/[game-name-kebab-case]",
  "description": "[Short game summary]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [player/developer], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Typecheck passes"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Conversion Rules

1. Each implementation slice becomes one JSON story.
2. Keep stories small enough for one focused implementation pass.
3. Order priorities by dependency, not by document order alone.
4. Use sequential IDs: `US-001`, `US-002`, etc.
5. Set `passes` to `false` and `notes` to an empty string.
6. Include `Typecheck passes` when the story changes code.
7. Include browser verification for scene / UI / visual work when relevant.

## Good Story Size

Good:

- create the first playable room or arena
- implement one movement / control model
- implement one core mechanic
- add one enemy / obstacle / rule set
- add HUD values the player needs
- add game-over or win flow

Too big:

- implement the full game
- add every level and every enemy type
- build all UI, progression, and polish together

## Final Check

Before writing JSON, verify:

- the markdown spec is stable enough
- scope is still realistic
- stories do not depend on later stories
- acceptance criteria are concrete and checkable
