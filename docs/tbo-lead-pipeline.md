# TBO lead pipeline in the CRM

The CRM side of tbo_smart's lead pipeline: the lead's meetings and their minutes (MOM), the
"needs immediate follow-up" flag and the deal made at Closed – Won. The rules, data and
permissions belong to tbo_smart: see `docs/lead-pipeline.md` in tbocloud/tbo_smart, the living
spec. Every call goes to `tbo_smart.api.lead_pipeline`, which checks the switch and Frappe CRM's
own permissions on the lead; the UI only hides what a user can't do.

Everything here is behind **TBO Smart Settings → Lead pipeline**, off by default. While it is
off, or tbo_smart is not installed, the lead page is the stock one.

The 13 pipeline statuses (New Lead … Closed – Won / Closed – Lost) are ordinary CRM Lead
Statuses, so the status menu, kanban and filters need no change. tbo_smart migrates the old ones
on deploy.

## What users see

**Lead → Meetings tab** (after Activity):

- One card per meeting, oldest first: "1st meeting", "2nd meeting", "3rd meeting", then
  "Additional meeting N"; the status chip (icon plus text: Scheduled and In Progress in the info
  colour, MOM Submitted in green, MOM Pending in red, Follow-up Required in amber, the rest
  neutral); the date and time; Google Meet / Microsoft Teams (from the pasted link) or the
  client's place; the BDE.
- A MOM Pending card has a red border and says the minutes are due, and who has been told (the
  BDM, then the sales head).
- Cards with minutes show the first line of the discussion, the client's interest, actions done
  (2/3) and the next follow-up.
- Actions: **Join** (the pasted link, online meetings), **Write MOM** (once the meeting has
  started; solid on a MOM Pending card), **View MOM**, and a menu with **Reschedule**, **Needs a
  follow-up** and **Cancel meeting** (with a confirmation; it stays on the lead).
- **Schedule meeting** is the tab's one primary action. States: loading, error with *Try
  again*, and "No meetings yet".

**Schedule / Reschedule dialog:** Online or Physical visit (a segmented control), date, time,
duration, the meeting link (any https link; Google Meet or Teams) or the client's location,
participants and, for a new meeting, the agenda. A meeting can't be in the past. A new time
makes the meeting Rescheduled.

**MOM dialog:**

- **Draft from your notes** (while AI call notes and a provider are on): rough English or
  Malayalam notes, then **Draft MOM from my notes** fills the fields below. Nothing is saved;
  any part the AI wrote with a number that wasn't in the notes is left out with a warning.
- Agenda, key discussion points (required to submit), client requirements, decisions, client
  interest (Positive / Neutral / Negative), objections, quotation feedback.
- Action items: action, responsible, due date, done; add and remove rows (they stack at 390px).
- Next step: next follow-up date, next meeting details, **Schedule the next meeting now** (type,
  link or place, date, time), and the lead status (left as it is, the lead moves on by itself;
  Closed – Lost asks why).
- Attachments (private files on the meeting).
- **Save draft** or **Submit MOM**. Submitting needs the discussion and a next step (a
  follow-up date, the next meeting or a closing status); it creates the follow-up task and moves
  the lead.

**Lead side panel** (on a phone, at the top of the Details tab): **Needs immediate follow-up**
in red with its reasons (MOM pending, a meeting that needs a follow-up, an overdue follow-up,
nothing planned), then the last meeting date, the next activity (meeting or follow-up), meetings
done and the deal once the lead is Closed – Won.

**Convert to Deal** is gone from the lead page while the pipeline is on: the deal is made when
the lead becomes Closed – Won (tbo_smart also refuses a manual conversion).

**Lead → Quotations tab** (behind **Quotations on the lead** as well):

- One card per quotation family, newest first: the number, *Revision N* and *Latest* when it has
  revisions, the quote status chip (Accepted in green; Rejected and Expired in red; Pending
  Approval and Revision Required in amber; Sent, Viewed and Under Negotiation in the info colour;
  the rest neutral; always with an icon and the text), the grand total, valid till, when and how
  it was sent and the package. Earlier revisions open under it.
- Drafts show the discount/commission approval chips and **Request approval** from
  `docs/tbo-quotation-approvals.md` (the same component as the deal).
- Actions: **Mark sent** (the latest revision, once nothing is pending approval), **Edit**
  (drafts), **Convert to Sales Order** (accepted, for people who may create Sales Orders; it opens
  the deal's Finance tab), and a menu with **Preview PDF**, **Download PDF**, **Save PDF to the
  lead**, **Create revision**, **Revision history** and the with-the-client moves (Viewed /
  Acknowledged, Under Negotiation, Revision Required, Accepted, Rejected).
- **New quotation** is the tab's one primary action. States: loading, error with *Try again*,
  "No quotations yet". After the lead is won, a line says the quotations belong to the deal.

**Quotation builder:** the deal's **New quotation dialog**, reused with a `lead` prop. On the
lead it adds a **Package** pick (fills its lines, shows the project duration) and **Add a
service** (services grouped by category, with their rate), a description under each line,
payment terms and a terms template. The totals (subtotal, discount, tax from the template's rate,
grand total) update as you type, on the deal too. **Review** shows the client's view of the lines,
totals, payment terms and terms, and warns when the discount is above your limit; **Save draft**
saves it. A meeting card's **Create quotation** opens it linked to that meeting.

**Mark sent dialog:** Email (to the lead's email unless another is typed; ERPNext sends it with
the TBO PDF), WhatsApp (opens `wa.me` with the message) or Already sent, the message, and the
follow-up days (3; 0 for none). **Status dialog:** a note; Rejected asks why and can close the
lead as Closed – Lost with a reason; Accepted says the deal will be created. **Revision history:**
each version with its total, discount, validity and what changed from the one before.

**Settings → TBO → Lead pipeline** (System Managers): the switches, the reminder minutes, the
quotation defaults (validity, follow-up days, terms, payment terms, print format, the roles that
edit prices) and, once quotations are on, the **Quotation catalogue**: packages (New package /
Edit: name, category, duration, validity, description, lines with service, description, qty and
rate) and each service's rate, editable only by those roles.

**Call today → Triage:** the suggested-close leads close as **Closed – Lost** (no more Junk /
Unqualified choice).

## Where it lives

| File | What it does |
| --- | --- |
| `frontend/src/tbo/leadPipeline/api.js` | Method names, the shared access resource, the write calls, `useLeadPipelineRefresh` (the `tbo_lead_pipeline_update` realtime event and window focus). |
| `frontend/src/tbo/leadPipeline/pipeline.js` | Pure rules: status tones, card actions, link labels, date and time, schedule and MOM validation and payloads, merging an AI draft. Tested in `frontend/tests/unit/tboLeadPipeline.test.js`. |
| `frontend/src/tbo/leadPipeline/LeadMeetings.vue` | The Meetings tab. |
| `frontend/src/tbo/leadPipeline/MeetingDialog.vue`, `MomDialog.vue`, `StatusChip.vue` | Schedule / reschedule, the MOM form, the status chip (meetings and quotations). |
| `frontend/src/tbo/leadPipeline/quotes.js` | Pure quotation rules: status tones, row actions, families, revision change lines, print and PDF links. Tested with the pipeline rules. |
| `frontend/src/tbo/leadPipeline/LeadQuotations.vue`, `MarkSentDialog.vue`, `QuoteStatusDialog.vue`, `RevisionsDialog.vue` | The Quotations tab and its dialogs. |
| `frontend/src/tbo/leadPipeline/QuotationCatalogue.vue`, `PackageDialog.vue` | The catalogue on the settings page. |
| `frontend/src/tbo/finance/QuotationDialog.vue`, `TotalsBlock.vue` | The shared quotation dialog (deal and lead) and its totals. |
| `frontend/src/tbo/leadPipeline/LeadPipelineSummary.vue` | The side panel summary and the follow-up flag. |
| `frontend/src/tbo/leadPipeline/PipelineSettings.vue` | The settings page. |
| `frontend/src/tbo/leadPipeline/navigation.js` | `leadMeetingsTab()`, `leadQuotationsTab()` and `useConversionLock()`. |

Small hooks into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/pages/Lead.vue`, `frontend/src/pages/MobileLead.vue` | `leadMeetingsTab(...)` and `leadQuotationsTab(...)` in the tabs; `<LeadPipelineSummary>` before `<LeadSmartPanel>`; the Convert button's `Tooltip` has `v-if="!tboConversionLocked"`. |
| `frontend/src/components/Activities/Activities.vue` | `<LeadMeetings v-else-if="title == 'Meetings'">` after `DealFinance`; the stock `QuotationsList` only for `CRM Deal`, and `<LeadQuotations>` for the lead's Quotations tab. |
| `frontend/src/components/Activities/ActivityHeader.vue` | No "New" menu on the Meetings tab. |
| `frontend/src/components/Settings/Settings.vue` | **Lead pipeline** in the TBO group. |

On an upstream merge conflict in one of these, keep upstream's change and add the hook back.

## Refresh

The tab and the side panel share one resource per lead and reload on tbo_smart's
`tbo_lead_pipeline_update` event (a meeting saved), when the lead's status changes and when the
window regains focus. After a meeting or MOM is saved, the lead document reloads too, because the
lead may have moved on.

## Design notes

- One accent: Schedule meeting, Submit MOM and a MOM Pending card's Write MOM are the solid
  buttons. Colour appears only on the status chips and the follow-up flag, always with an icon
  and text.
- Dates, times and counts are in Geist Mono with tabular numbers.
- At 390px the card actions wrap under the details and the dialog rows stack.
