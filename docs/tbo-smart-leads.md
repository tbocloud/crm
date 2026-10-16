# TBO smart leads in the CRM

The CRM side of tbo_smart's smart leads: lead scores, the daily Call today list, follow-ups,
AI call notes, the lead brief, WhatsApp drafts and the triage of stale leads. The rules, data,
AI and permissions belong to tbo_smart: see `docs/smart-leads.md` in tbocloud/tbo_smart, the
living spec. Every call goes to `tbo_smart.api.smart_leads` (or `smart_leads_settings`), which
checks the switches and Frappe CRM's own permissions; the UI only hides what a user can't do.

Each feature has its own switch in **TBO Smart Settings**, off by default. While every switch
is off, or tbo_smart is not installed, nothing below appears (the access call fails or says
disabled).

## What users see

**Call today** (`/crm/call-today`, sidebar, while lead scoring is on; for a sales head also
while follow-ups or the triage are on).

- The person's leads to call today: overdue follow-ups first, then due today, then the leads
  with no follow-up by score. Each row: name, organization, status and source; the
  **Hot / Warm / Cold** chip with the score (status colour plus an icon and a label); the score's
  reason; why it is listed (overdue / due today / no follow-up planned, with the date); the last
  touch; the phone (a `tel:` link, `+91` added to 10 digits); **WhatsApp**; **Log call**;
  **Follow-up**; **Status**.
  - **Log call** opens the note box in a dialog, set to a call.
  - **WhatsApp** opens the draft dialog when AI notes are on, else `wa.me` directly.
  - **Status** changes the status at once; Closed – Lost gets CRM's lost reason "Other".
- A **Salesperson** select when the user may open other lists (team leads, sales heads,
  managers); the server refuses anyone else's.
- A follow-up summary line ("2 overdue · 5 due today · 40 no follow-up") while follow-ups are on.
- "N more leads are waiting" when the list is full.
- **Needs owner** tab (sales heads): open leads whose owner is disabled or missing, with
  checkboxes and **Reassign**.
- **Triage** tab (Sales Manager / System Manager, triage on): **Run a preview**, the run's
  status (polled every 4 s while it runs), counts and AI cost; **Call again** with the planned
  date and person, **Create N follow-ups** (with a confirmation); **Suggest close** with
  checkboxes, **Close as Closed – Lost** and a confirmation. Nothing is closed unless a
  person ticks it and confirms.
- States: loading, switched off, not permitted (403), error with *Try again*, nothing to call.

**Lead page** (desktop side panel under the name; on a phone at the top of the Details tab):

- The score chip and reason (scoring on), the next follow-up (with Overdue), **Call**,
  **WhatsApp** / **Draft WhatsApp**, **Set follow-up**.
- **Lead brief** (AI notes on): three lines, written when there is none or the lead changed
  since (the server caches it), with a Refresh button, a loading skeleton and an error line.
- **Log call / note** box: rough words in English or Malayalam (a mic button dictates where the
  browser supports it, in English or Malayalam). With AI: **Draft with AI** shows the clean
  note, call or note, the next status and the next follow-up with what to do, all editable, and
  **Save** writes them; **Save as written** skips the AI. Without AI: Call / Note and **Save**.
  The panel reloads the lead and its activities after a save.

**Settings → TBO → TBO smart leads** (System Managers, when tbo_smart is installed):

- AI providers: primary, fallback switch, and for OpenAI and Anthropic-compatible (Kimi): a
  state chip (Answering, Fallback, Failing, Paused, Not set up, Not used), the failure reason,
  model, base URL, API key (masked; Add / Replace / Remove; never shown again), prices per 1M
  tokens and **Test connection** (uses the saved settings, so it waits for Save).
- The switches and numbers of scoring, follow-ups and the triage; the sales head, the fallback
  owner, the managers' role, the **Teams DM workflow URL** (a secret like the keys) and **Send
  me a test digest**.

The CRM dashboard gets **Call today** and **Overdue lead follow-ups** number cards from
tbo_smart's `crm_dashboard_layout` hook (no CRM change).

## Where it lives

| File | What it does |
| --- | --- |
| `frontend/src/tbo/smartLeads/api.js` | Method names, the shared access resource, the write calls. |
| `frontend/src/tbo/smartLeads/smartLeads.js` | Pure rules: phone normalisation, `wa.me` / `tel:` links, band styles, follow-up date check, the note payload, the summary line, the triage split. Tested in `frontend/tests/unit/tboSmartLeads.test.js`. |
| `frontend/src/tbo/smartLeads/CallToday.vue` | The page and its tabs. |
| `frontend/src/tbo/smartLeads/NeedsOwner.vue`, `LeadTriage.vue` | The Needs owner and Triage tabs. |
| `frontend/src/tbo/smartLeads/LeadSmartPanel.vue` | The lead page panel. |
| `frontend/src/tbo/smartLeads/NoteBox.vue`, `LogNoteDialog.vue`, `WhatsAppDialog.vue`, `SetFollowUpDialog.vue`, `BandChip.vue` | The note box, its dialog, the WhatsApp and follow-up dialogs, the score chip. |
| `frontend/src/tbo/smartLeads/SmartLeadsSettings.vue`, `SecretField.vue`, `SwitchRow.vue` | The settings page. |
| `frontend/src/tbo/smartLeads/navigation.js` | `tboSmartLeadsNavigationItems()` (sidebar: Call today). |

Small hooks into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/pages/Lead.vue` | `<LeadSmartPanel>` after the header block of the side panel. |
| `frontend/src/pages/MobileLead.vue` | `<LeadSmartPanel>` at the top of the Details tab. |
| `frontend/src/components/Layouts/AppSidebar.vue` | `...tboSmartLeadsNavigationItems()` in `links`. |
| `frontend/src/router.js` | The `/call-today` route (`Call Today`). |
| `frontend/src/components/Settings/Settings.vue` | A **TBO** group with **TBO smart leads**, for System Managers while tbo_smart answers. |

On an upstream merge conflict in one of these, keep upstream's change and add the hook back.

## Design notes

- One accent: the solid button of each view is its main action (Draft with AI, Save, Create
  follow-ups, Reassign). Row actions are plain buttons. Hot / Warm / Cold and overdue / due today
  use the status colours with an icon and a label; everything else is neutral.
- Phone numbers, scores, dates and counts are in Geist Mono with tabular numbers.
- At 390px the rows stack and the action buttons wrap; tables scroll inside their border.
