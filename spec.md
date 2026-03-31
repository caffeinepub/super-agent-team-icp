# Super Agent Team ICP

## Current State
- Backend: 260-line Motoko actor with one HTTP outcall to r/forhire (adds 1 hardcoded job if connected), manual `runCycle()` only, no heartbeat
- Frontend: 1069-line cyberpunk React dashboard with RUN CYCLE button and Settings panel
- No auto-scheduling, no DFINITY Forum/Gitcoin/r/dfinity/r/InternetComputer sources

## Requested Changes (Diff)

### Add
- Canister heartbeat (`system func heartbeat()`) that auto-triggers a cycle every 30 minutes
- `lastCycleAt`, `heartbeatCount`, `autoCycleEnabled` state variables
- Scout scans: r/InternetComputer, r/dfinity, DFINITY Forum (bounty + grants tags), Gitcoin open bounties
- `getHeartbeatStatus()` query returning `{ lastCycleAt, heartbeatCount, autoCycleEnabled, intervalNs }`
- `toggleAutoCycle()` update function
- Frontend: auto-cycle status widget showing last run time, cycle count, and on/off toggle

### Modify
- `runCycle()` logic extracted to private `_doCycle()` so heartbeat and public function share the same implementation
- Scout section in `_doCycle()` extended with 4 additional HTTP outcall targets
- `backend.d.ts` updated with new methods
- App.tsx updated to show heartbeat status and toggle

### Remove
- Nothing removed

## Implementation Plan
1. Rewrite `main.mo`: add heartbeat vars, `system func heartbeat()`, extract `_doCycle()`, expand Scout with 4 new HTTP outcall targets, add `getHeartbeatStatus` and `toggleAutoCycle`
2. Update `backend.d.ts` with new types and methods
3. Frontend agent: add auto-cycle status bar/widget to App.tsx using new backend methods
