# Running Compass as your daily driver

Everything below runs locally. There is no Compass server, no account, and
nothing to sign up for.

---

## 1. Build and install

```bash
pnpm install
pnpm build
```

**chrome://extensions** → **Developer mode** on → **Load unpacked** →
`apps/extension/.output/chrome-mv3`

Open a new tab. You should see a photo, a greeting, and an onboarding prompt.

> Firefox: use `apps/extension/.output/firefox-mv2` via **about:debugging** →
> **This Firefox** → **Load Temporary Add-on**. Firefox unloads temporary
> add-ons on restart, so Chrome is the better daily driver for now.

### When you rebuild

Click the **reload** icon on the extension card. Chrome does not pick up a new
build automatically, and a stale service worker is the most common cause of
"my change did nothing".

Reload is also **required** after any change to `permissions` in the manifest —
Chrome will not grant a newly-declared permission to an already-loaded
extension. Site blocking silently does nothing until you do this.

---

## 2. Add an LLM key

Onboarding is dismiss-locked until a key validates. Any one of:

- **OpenAI** — `sk-…` from platform.openai.com
- **Anthropic** — `sk-ant-…` from console.anthropic.com
- **OpenRouter** — one-click sign-in

The key is stored on this device. **Profile → Encryption** adds passphrase
encryption at rest; you will be asked for the passphrase once per browser
session.

**Cost.** Everything except the morning brief is on-demand. A day of normal use
is a few cents. The `llm_cost_ledger` table records every call with an
estimated cost, and the §6.5 soft cap defaults to $2/month.

---

## 3. Connect Google (optional, recommended)

See **[setup-google-calendar.md](./setup-google-calendar.md)** — about ten
minutes, once. Calendar is what makes the morning brief stop writing about an
empty day.

Gmail is a second, separate opt-in from the same screen.

---

## What works, and what is honestly still missing

| Surface | State                                                      |
| ------- | ---------------------------------------------------------- |
| Brief   | Real. Morning + EOD, grounded in your calendar and goals   |
| Today   | Real calendar, needs the Google setup                      |
| Goals   | Real, local only. LLM decomposition into weekly milestones |
| Notes   | Real. Local embeddings, hybrid search, auto-linking        |
| Inbox   | Real, read-only. Needs the Gmail opt-in                    |
| Focus   | Real timer, synthesised soundscapes, working site blocker  |
| Profile | Real. Keys, encryption, times, connections                 |
| ⌘K      | Nav real; ask mode answers from your notes                 |

**Not built, deliberately:**

- **Draft replies.** Would need a Gmail write scope, a preview gate, and its
  own red-team pass. Reading your mail and writing it are different risk
  categories.
- **Block negotiation.** The block page asks why you want through and records
  the outcome, but no model reads your answer. The conversational version needs
  adversarial testing first.
- **Sleep / recovery / heart rate.** There is no Fitbit integration. These were
  removed rather than faked.
- **Multimodal** — voice, OCR, vision board.
- **Sync.** Everything is per-device. There is no cloud copy of anything.

---

## Where your data lives

| Data                                              | Where                                            | Leaves the device?                        |
| ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| Notes, goals, focus history, calendar, mail index | OPFS SQLite, this browser profile                | No                                        |
| LLM API key                                       | `chrome.storage.local`, optionally encrypted     | Only to your chosen provider              |
| Google refresh token                              | Encrypted envelope                               | Only to Google                            |
| Note text, email bodies, calendar details         | —                                                | Only to your LLM provider, under your key |
| Email bodies                                      | Never stored — held in memory for one extraction | No                                        |

There is no telemetry. Nothing is sent to any Compass-operated service, because
there isn't one.

---

## When something breaks

**The new tab is blank.** Open devtools on the tab. A failure in the offscreen
document usually shows there. Reload the extension.

**"DB unavailable" in a drawer.** sqlite-wasm needs cross-origin isolation that
a plain MV3 offscreen document does not have; this is a known limitation
tracked in the offscreen entrypoint. Reloading usually recovers it.

**The brief says the day looks open when it isn't.** Calendar isn't connected,
or the sync failed. Check **Profile → Calendar**.

**Blocking does nothing.** Reload the extension — see the permissions note in
step 1. Blocks are also focus-only by default: they apply while a pomodoro
runs, not all day.

**Nothing after changing a briefing hour.** Fixed, but it needs the rebuilt
service worker; reload the extension.

### Starting over

**Profile → Inbox → Clear local copy** wipes the mail index.
Removing the extension drops everything, including OPFS.
Revoke Google access independently at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions).

---

## What to pay attention to while testing

The things most likely to be wrong are judgement calls, not crashes:

- Does the morning brief say anything you didn't already know?
- Are the extracted email commitments things you actually committed to, or
  plausible-sounding noise?
- Is the goal decomposition specific enough to act on?
- Does the peak-hour reading match when you actually work well?

Those are the questions a test suite can't answer.
