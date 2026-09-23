# Platformer / Runner Reference

Use this for side-scrollers, 3D platformers, endless runners, chase games, and obstacle-course designs.

## What Must Be Clear in the Spec

- movement fantasy: precise, floaty, fast, forgiving, demanding
- obstacle readability
- fail and recovery loop
- level flow: handcrafted course, chunks, endless stream, laps
- how score, distance, checkpoints, or goals create momentum

## Good Clarifying Questions

- Is the main joy jump timing, speed, lane switching, or route choice?
- Is the camera fixed, follow, or player-controlled?
- Does failure restart the whole run, a checkpoint, or instantly rewind?
- Is the game endless or level-based?
- What is the minimum obstacle set needed for v1?

## Scope Traps

- too many movement abilities before one feels good
- long levels before obstacle readability is validated
- procedural generation before handcrafted pacing works
- too many collectible / upgrade layers on top of weak movement

## Healthy V1 Shape

- one movement model
- one short test course or endless chunk loop
- 2-4 obstacle types
- simple score, distance, or finish condition

## Strong Early Slices

1. Movement and camera feel
2. One obstacle interaction and fail state
3. Short course or endless chunk loop
4. Score / distance / checkpoint logic
5. HUD and restart flow

## Signs the Spec Is Too Thin

- movement is described only by genre label
- challenge comes from random clutter, not readable patterns
- endless mode has no pacing change
- checkpoints or retries are undefined
