import type { StoredBlockRule } from '@compass/db';

/**
 * Translates stored block rules into declarativeNetRequest dynamic rules.
 *
 * This lives in the service worker because `chrome.declarativeNetRequest` is
 * unavailable to the offscreen document, and because DNR rules are browser
 * state rather than app state — the SW is the only context that outlives a
 * new-tab page.
 *
 * DNR is used rather than a blocking webRequest listener because MV3 removed
 * blocking webRequest, and rather than a content script because a content
 * script only runs after the page has already started loading.
 */

/** Reserved id space for Compass block rules, so nothing else collides. */
const RULE_ID_BASE = 1000;
/**
 * Separate id space for temporary "let me through" passes. Higher priority
 * than block rules so an allow wins, and cleared on the next rule sync — a
 * pass lasts until the focus state changes, not forever.
 */
const PASS_ID_BASE = 2000;

export interface BlockRuleContext {
  /** True while a pomodoro is running. focus-only rules apply only then. */
  focusActive: boolean;
  /** Where a blocked navigation is sent. */
  blockPageUrl: string;
}

export function applicableRules(rules: StoredBlockRule[], focusActive: boolean): StoredBlockRule[] {
  return rules.filter((r) => r.enabled && (!r.focusOnly || focusActive));
}

export function toDnrRules(
  rules: StoredBlockRule[],
  ctx: BlockRuleContext,
): chrome.declarativeNetRequest.Rule[] {
  return applicableRules(rules, ctx.focusActive).map((r, i) => ({
    id: RULE_ID_BASE + i,
    priority: 1,
    action: {
      type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
      redirect: {
        // The blocked host travels as a query param so the block page can name
        // it. Only the host — never the path the user was heading to.
        url: `${ctx.blockPageUrl}?host=${encodeURIComponent(r.pattern)}&mode=${r.mode}&rule=${encodeURIComponent(r.id)}`,
      },
    },
    condition: {
      // requestDomains covers subdomains without needing a wildcard pattern.
      requestDomains: [r.pattern],
      resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
    },
  }));
}

/**
 * Replaces Compass's dynamic rules wholesale.
 *
 * Removing by the ids we are about to add is not enough — a rule the user
 * deleted would survive. Every previously-installed Compass rule is cleared
 * first, so stored state is always the single source of truth.
 */
export async function applyBlockRules(
  rules: StoredBlockRule[],
  ctx: BlockRuleContext,
): Promise<number> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  // Clears passes as well as blocks: a pass granted during the last focus
  // session should not silently survive into the next one.
  const removeRuleIds = existing.filter((r) => r.id >= RULE_ID_BASE).map((r) => r.id);
  const addRules = toDnrRules(rules, ctx);

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  return addRules.length;
}

/**
 * Lets one host through until the next rule sync.
 *
 * Without this, following through on a soft block would immediately hit the
 * same redirect and loop. Scoped to the host the user actually chose, and
 * discarded the next time focus starts or stops.
 */
export async function grantPass(hostname: string): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const used = existing.filter((r) => r.id >= PASS_ID_BASE).map((r) => r.id);
  const id = used.length === 0 ? PASS_ID_BASE : Math.max(...used) + 1;

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id,
        priority: 2,
        action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
        condition: {
          requestDomains: [hostname],
          resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
        },
      },
    ],
  });
}
