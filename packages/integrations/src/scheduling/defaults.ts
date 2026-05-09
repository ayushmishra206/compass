// Hardcoded scheduler defaults. Phase 2 swaps the body of these getters
// for `getUserProfile()` reads when UserProfile persistence ships.
//
// Why constants here instead of importing from packages/core fixtures:
// the fixture is a test artifact; production code should not depend on
// fixtures. This file IS the seam Phase 2 replaces.

export const BRIEFING_HOUR = 8;
export const REFLECTION_HOUR = 18;
