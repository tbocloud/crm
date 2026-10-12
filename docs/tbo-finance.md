# TBO finance workflow in the CRM

The CRM side of TBO's lead-to-cash workflow. The rules, data and permissions
belong to tbo_smart: see `docs/crm-finance-workflow.md` in tbocloud/tbo_smart,
the living spec. The CRM shows the data and calls tbo_smart's APIs, which check
every permission on the server. The UI only hides what a user can't do.

Everything here is behind **TBO Smart Settings → Finance workflow (Phase 1)**,
which is off by default. While it is off, or when tbo_smart is not installed,
the deal keeps the stock **Quotations** tab and nothing below appears.

## What users see (Phase 1)

**Deal → Finance tab.** It replaces the Quotations tab while the workflow is on.

- **Stage strip:** Onboarding → Quotation → Invoiced → Collecting → Collected →
  Closed. tbo_smart computes the stage from the deal's documents. Done steps
  have a tick, and the current step is the only brand-coloured element.
- **Mark onboarding complete** (anyone who may edit the deal, or a finance user)
  and **Close finance / Reopen** (Accounts Manager or System Manager, only once
  everything invoiced is collected). Both are logged on the deal.
- **Totals** per currency: invoiced, received, outstanding and overdue. Overdue
  is red and has an icon.
- **Quotations:** status, validity, total, and the discount/commission approval
  chips from `docs/tbo-quotation-approvals.md`. **New quotation** opens the
  dialog. Drafts also get **Edit** and **Submit**; submitting still goes through
  the approval control.
- **Sales orders**, **Invoices** (with their payment terms under a disclosure,
  overdue terms flagged) and **Payments received** (date, mode, reference,
  amount; refunds are marked). Numbers open the ERPNext document.
- **Follow-ups:** the deal's open CRM tasks, earliest due first ("Next").
- When TBO Smart Settings → "BDE can see invoice/payment amounts" is off, a
  salesperson without a manager or accounts role sees the documents without
  amounts, and a note says why.
- States: loading, not permitted (403), error with *Try again*, and an empty
  line per section.

**New quotation dialog.** It replaces the "Create Quotation" action, which
opened `/app/quotation/new` (tbo_smart hides that action while the workflow is
on). Items come prefilled from the deal's products, and customer, company and
contact from the deal. You can set the company, valid till, taxes template,
items (qty, rate, discount %), additional discount %, commission % and terms.
Under each % it shows "Your limit" from the approval settings. **Save draft**
creates or updates a draft Quotation. **Open in ERPNext** is there for anything
more advanced. On a phone the item rows stack.

**BDE conversion** (`/crm/bde-conversion`, in the sidebar while the workflow is
on). Leads, deals, conversion rate, submitted quotations, won deals and won
value per salesperson, with date, client and company filters. The columns
sort, and there is a total row. The table scrolls sideways on a phone. A
salesperson sees their own row, a manager their team, and Sales Managers,
System Managers and the finance roles see everyone.

## What users see (Phase 2)

Behind **TBO Smart Settings → Receivables and reminders (Phase 2)** as well.

- **Receivables** (`/crm/receivables`, sidebar). Ageing totals per currency
  (outstanding, overdue, not due, 1-30, 31-60, 61-90, 90+ days by each term's
  due date), then an Invoices / Clients switch. Each invoice row shows the
  client and company, due date and days overdue, outstanding, overdue, BDE and
  accounts owner, escalation level, last reminder, promise to pay and any open
  exception, with **Follow-up** and **Exception** actions. Filters: client,
  company, BDE, accounts owner. **Export** downloads the rows as CSV. A
  salesperson sees only their own (or team's) deals; with "BDE can see
  invoice/payment amounts" off they get the not-permitted state and no sidebar
  entry.
- **Follow-up dialog:** next date, remark, promised date and amount. It
  updates the invoice's collection task (or creates one), so the CRM Tasks
  page's **Collections** view (added by tbo_smart) lists it.
- **Exception dialog:** extend the due date, pause reminders, client dispute
  or write-off, for the whole invoice or one term, with a reason (and the
  credit note or journal entry for a write-off). It is sent straight for
  approval.
- **Finance exceptions** (`/crm/finance-exceptions`, sidebar). Tabs *Waiting
  for a decision* (approvers), *Open* and *All*. Approve or Reject (a reason is
  required) for a TBO Finance Approver who did not raise or send the request;
  Reopen for rejected ones.
- **Deal → Finance tab:** accounts owner (editable by accounts and managers),
  *Add follow-up* and *Request exception* under each open invoice, collection
  level and promise on follow-ups, and an Exceptions section.

## What users see (Phase 3)

Behind **TBO Smart Settings → Allocation and transfers (Phase 3)**, and only for
accounts, finance and management (tbo_smart refuses everyone else).

- **Allocations** (`/crm/allocations`, sidebar). Totals: payable to the
  partner, settled, pending transfer and due from the partner. Three tabs:
  - *Allocations*: one row per receipt, with gross, net, share and outstanding,
    plus status and reversal badges.
  - *Transfers*: status, sent, settled, difference, and the achieved rate once
    India has received it. A transfer that is still waiting has a **Confirm
    receipt** action, which links India's Payment Entry.
  - *Before start date*: a preview of what earlier receipts would have
    allocated. It records nothing.
- **New transfer** dialog. Pick the sending Payment Entry (booked in ERPNext),
  the date, a reference and any withholding tax. The open allocations are listed
  oldest first, with amounts suggested from what was sent. Reversals are netted
  first, and every amount can be edited. Sent, settles and difference are shown
  live; a difference above the tolerance becomes an exception for the Finance
  Manager.
- **Deal → Finance tab** shows an Allocation section (partner share, settled,
  pending) to those roles only.
- Nothing here posts to the accounts. The page says so (memo only, open
  question Q1).

## What users see (Phase 4)

Behind **TBO Smart Settings → Reconciliation and approvals (Phase 4)**.

- **Finance exceptions** now lists every category: receivable, allocation,
  transfer and bank reconciliation. A category filter narrows it. The page
  appears once any of Phases 2-4 is on.
- An exception above the second-approval amount shows "First approval by …; a
  second approver is needed" until a different approver approves it.
- A **Bank lines** tab for accounts, finance and management:
  - lines matched in ERPNext's Bank Reconciliation Tool and waiting for
    verification, with **Verify** for a second person (it says "You matched it"
    to the person who matched it);
  - lines not matched yet, with their age (red after the alert days) and any
    possible-duplicate flag.
- **Deal → Finance tab:** the stage strip adds Settling and Reconciled.
  *Close finance* appears once the deal reaches the stage tbo_smart requires:
  Reconciled with Phase 4 on.

## Where it lives

| File | What it does |
| --- | --- |
| `frontend/src/tbo/finance/api.js` | Method names, the shared access resource (`get_finance_access`), the write calls, and `useDealFinanceRefresh`. |
| `frontend/src/tbo/finance/finance.js` | Pure rules: stage steps, line and net totals, dialog validation and payload, status tones, overdue terms, report sorting. Tested in `frontend/tests/unit/tboFinance.test.js`. |
| `frontend/src/tbo/finance/DealFinance.vue` | The Finance tab. |
| `frontend/src/tbo/finance/StageStrip.vue`, `FinanceSection.vue`, `NumberField.vue` | Stage strip, section shell, numeric input. |
| `frontend/src/tbo/finance/QuotationDialog.vue` | New / edit quotation dialog. |
| `frontend/src/tbo/finance/BdeConversion.vue` | The BDE conversion report page. |
| `frontend/src/tbo/finance/navigation.js` | `tboFinanceNavigationItems()` (sidebar: BDE conversion; Receivables and Finance exceptions in Phase 2) and `dealFinanceTab()` (Finance or Quotations). |
| `frontend/src/tbo/finance/Receivables.vue` | The Receivables page. |
| `frontend/src/tbo/finance/FinanceExceptions.vue` | The Finance exceptions page with the decision dialog. |
| `frontend/src/tbo/finance/FollowUpDialog.vue`, `ExceptionDialog.vue` | Follow-up and exception request dialogs (Receivables page and Finance tab). |
| `frontend/src/tbo/finance/Allocations.vue`, `TransferDialog.vue` | Allocations & transfers page and the New transfer dialog (Phase 3). |
| `frontend/src/tbo/finance/BankLines.vue` | The Bank lines tab of Finance exceptions (Phase 4). |

Small hooks into upstream files:

| Upstream file | Hook |
| --- | --- |
| `frontend/src/pages/Deal.vue`, `frontend/src/pages/MobileDeal.vue` | The last tab is `dealFinanceTab(...)` instead of the Quotations entry. |
| `frontend/src/components/Activities/Activities.vue` | `<DealFinance v-else-if="title == 'Finance'">` after `QuotationsList`. |
| `frontend/src/components/Activities/ActivityHeader.vue` | No "New" menu on the Finance tab either. |
| `frontend/src/components/Layouts/AppSidebar.vue` | `...tboFinanceNavigationItems()` in `links`. |
| `frontend/src/router.js` | The `/bde-conversion`, `/receivables`, `/finance-exceptions` and `/allocations` routes (`BDE Conversion`, `Receivables`, `Finance Exceptions`, `Allocations`). |
| `crm/api/__init__.py` | `check_app_permission` also asks the `crm_app_permission` hooks. |
| `crm/permissions/org_hierarchy.py` | `_unrestricted()` asks the `crm_unrestricted_access` hooks before applying the sales hierarchy. |

On an upstream merge conflict in one of these, keep upstream's change and add
the hook back.

## Backend extension points (for any app)

- `crm_app_permission`: a list of dotted paths to functions with no
  arguments. If a user has the FCRM module but none of CRM's own roles, the CRM
  admits them when any function returns True. tbo_smart registers
  `tbo_smart.finance.access.has_crm_app_access`, which admits the finance roles
  in TBO Smart Settings while "Let finance roles open the CRM" is on.
- `crm_unrestricted_access`: a list of dotted paths to functions
  `(user, doctype, ptype) -> bool`. When one returns True, that user skips the
  sales-hierarchy rule for that doctype and permission type (the list
  condition and the per-document check). tbo_smart returns True only for
  `CRM Deal` and read-type permissions, so finance roles read every deal but
  never get write through it. Their actual read right comes from a Custom
  DocPerm that tbo_smart adds when the setting is saved.

Both are tested in `crm/permissions/test_org_hierarchy.py` and
`crm/tests/test_app_permission.py`.

## Refresh

The Finance tab reloads on tbo_smart's `tbo_deal_finance_update` realtime
event (published after a linked quotation, order, invoice or payment is saved,
submitted or cancelled, or the stage changes), on the CRM's own
`crm_quotation_update` event, and when the window regains focus. Reloads are
debounced by 300 ms.

## Not built yet

- Finance dashboard cards: Phase 5.
