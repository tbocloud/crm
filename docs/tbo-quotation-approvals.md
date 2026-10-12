# TBO quotation approvals

Salespeople and approvers handle quotation discount and commission approvals
in the CRM, without opening `/app`. The rules, limits and audit trail belong
to tbo_smart: see `docs/quotation-discount-control.md` in tbocloud/tbo_smart.
The CRM only shows them and calls tbo_smart's APIs, which check every
permission on the server. The UI only hides what a user can't do.

## What users see

**Deal → Quotations tab.** Each quotation gets a line under it:

- A chip for each limited kind (discount, commission or both, as set in
  TBO Quotation Approval Settings): *Within limit*, *Needs approval*,
  *Pending with BDM*, *Approved 8%*, *Rejected* or *Overridden 30%*. Each chip
  has an icon as well as its colour.
- "Your limit: 5%" beside each chip. The limit is the viewer's own, so
  *Within limit* means "within your limit".
- **Trail** (when you may read the request; tbo_smart shares only the state
  of another BDE's request) opens a side panel with the request's append-only steps
  (requested, forwarded, approved, ...), who did each and their remarks.
- **Request approval** appears on draft quotations that are above your limit,
  not yet covered, and have nothing already waiting. It opens a dialog with the
  kind, the % (prefilled from the quotation) and a required reason.

Clicking a quotation still opens the ERPNext form, as before.

**Approvals** (`/crm/approvals`). It appears in the sidebar for approvers (BDM,
Sales & Marketing Head, Director, CEO, or any level with a level below it) and
for anyone with an open request of their own.

- Tabs: *Waiting for me* (with a count), *I requested*, and *All* (Director and
  CEO only).
- Each row shows the customer, the deal (a link), the quotation and kind,
  current → requested %, the quotation value, the requester, the request's age
  and its stage.
- Row actions: **Approve** (in full, or a lower %; above your limit you can
  approve up to your limit), **Reject** (only when the request is within your
  limit, with a reason), **Forward** (to the next level, while there is one), and
  **Override** for the CEO (any %, reason required, also on decided requests in
  *All*). Each one posts `decide_adjustment`.
- States: loading, empty, error with *Try again*, not permitted (a 403 from the
  server), no approval level, and "not switched on".

## Where it lives

All of it is in one TBO folder, so upstream merges from frappe/crm rarely
touch it:

| File | What it does |
| --- | --- |
| `frontend/src/tbo/quotationApprovals/api.js` | Method names, the shared access resource (`get_adjustment_limits`), `load()` (fetch without an unhandled rejection), error text, and `useAdjustmentRefresh`. |
| `frontend/src/tbo/quotationApprovals/status.js` | Pure rules for chips, stages, who may request and which actions to show. Tested in `frontend/tests/unit/tboQuotationApprovals.test.js`. |
| `frontend/src/tbo/quotationApprovals/useQuotationAdjustments.js` | One batch call (`get_quotations_adjustment_status`) for every quotation on a deal. |
| `frontend/src/tbo/quotationApprovals/QuotationAdjustments.vue` | The line under each quotation on the deal tab. |
| `frontend/src/tbo/quotationApprovals/RequestApprovalDialog.vue` | Request dialog (`request_adjustment`). |
| `frontend/src/tbo/quotationApprovals/DecisionDialog.vue` | Approve / reject / forward / override dialog (`decide_adjustment`). |
| `frontend/src/tbo/quotationApprovals/TrailPanel.vue` | The trail side panel (`get_adjustment_trail`). Esc closes it, focus stays inside while open and returns to the button afterwards. |
| `frontend/src/tbo/quotationApprovals/QuotationApprovals.vue` | The Approvals page. |
| `frontend/src/tbo/quotationApprovals/AdjustmentChip.vue`, `StateMessage.vue` | Chip and empty/error state. |
| `frontend/src/tbo/quotationApprovals/navigation.js` | `tboNavigationItems()`, the sidebar entry. |

Small hooks into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/router.js` | The `/approvals` route, named `Quotation Approvals`. |
| `frontend/src/components/Layouts/AppSidebar.vue` | `links` is a computed of `getNavigationItems()` plus `tboNavigationItems()`, so the entry appears once access loads. |
| `frontend/src/components/Activities/QuotationsList.vue` | `useQuotationAdjustments()`, a `<QuotationAdjustments>` after each row's link, and an extra `adjustments.reload()` in the `crm_quotation_update` handler. |

On an upstream merge conflict in one of these, keep upstream's change and add
the hook back.

## APIs (tbo_smart.api.quotation_adjustment)

`get_adjustment_limits`, `get_quotations_adjustment_status`,
`get_pending_approvals`, `get_adjustment_requests`, `get_adjustment_trail`,
`request_adjustment`, `decide_adjustment`. The CRM has no backend change of
its own.

## When tbo_smart is missing or switched off

If `get_adjustment_limits` fails (tbo_smart not installed) or returns
`enabled: false` (enforcement off), the deal tab shows no chips or buttons, the
sidebar entry stays hidden, and `/crm/approvals` says approvals are not switched
on. Nothing errors in the user's face.

## Refresh

- The deal tab reloads on the CRM's existing `crm_quotation_update` event,
  which fires when a quotation changes. A quotation change can void an
  approval.
- Both screens reload on Frappe's `list_update` event for
  `TBO Quotation Adjustment` (Frappe broadcasts it to desk users on every
  save, so a decision made elsewhere shows up), and when the window regains
  focus. Reloads are debounced by 300 ms.
- The same events, and a successful request, also re-read the user's access
  (level and open requests), so the sidebar entry appears without a page
  reload.

## Not in this change

- Creating or editing quotations inside the CRM. That arrived with the finance
  workflow's Phase 1 (`docs/tbo-finance.md`): while it is on, the deal's
  Finance tab shows these chips and adds the New quotation dialog.
- A count badge on the sidebar entry, and an Approvals command in the command
  palette.
