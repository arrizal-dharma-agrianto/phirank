# Web Audit

This document explains the website audit feature currently implemented in the application.

## Overview

The Web Audit feature lets an authenticated user submit a public website URL, run a background audit, track progress, and review saved audit results inside the active workspace.

The feature is tenant-scoped. Users only see audit records that belong to their active tenant.

## Main Routes

```txt
/dashboard
/dashboard/audits
/dashboard/audits/[audit-id]
```

- `/dashboard` contains the new audit form, running audits, and the latest completed or failed audits.
- `/dashboard/audits` shows the saved audit history for the current workspace.
- `/dashboard/audits/[audit-id]` shows one audit result or the progress state while the audit is still running.

## User Flow

1. The user opens the Web Audit dashboard.
2. The user enters a public `http` or `https` URL.
3. The client validates the input with `webAuditSchema`.
4. The client posts the URL to `/api/web-audits`.
5. The API creates a `QUEUED` audit record with initial progress.
6. The API schedules background processing with `after()`.
7. The UI refreshes audit queries while any audit is queued or running.
8. When processing completes, the record is updated to `COMPLETED` or `FAILED`.
9. The user can open the detail page to review scores, categories, priority findings, and status.

## UI Features

### New Website Audit

The form is implemented in:

```txt
src/modules/web-audit/components/web-audit-form.tsx
```

It requires a valid URL using `http` or `https`. The form can also prefill the URL from the `url` query parameter, which is used by the "Run again" action on an audit detail page.

### Running Audits

The dashboard separates queued and running audits from recent audit snapshots.

Running audits show:

- URL
- Audit timestamp
- Status badge
- Progress bar
- Current processing step

The query refetches every 2 seconds while any audit has status `QUEUED` or `RUNNING`.

### Recent Audits

Recent audits exclude records that are still `QUEUED` or `RUNNING`.

The dashboard shows the latest 3 non-running snapshots. The audit history page shows the latest 25 non-running snapshots returned by the API.

### Audit Detail

The detail page is implemented in:

```txt
src/modules/web-audit/components/audit-detail.tsx
src/modules/web-audit/components/audit-result.tsx
```

If the audit is still in progress, the detail page shows a progress card and refreshes every 2 seconds. Once the audit is complete, it renders the full audit result.

### Category Statistics

The audit result displays five score cards:

- Performance
- SEO
- Accessibility
- Best Practices
- Security

Each score card is clickable. Clicking a category opens the matching Priority Findings section and scrolls to it.

### Priority Findings

Priority findings are grouped by category:

- Performance
- SEO
- Accessibility
- Best Practices
- Security

Each category group can be minimized or expanded. Groups show a count badge and an empty state when there are no findings in that category.

New audit results store each finding with an optional `category` value. Older audit results that do not have this field are still supported by inferring the category from the finding title and description.

### Delete Audit

Audit history records can be deleted from the history page. Deleting asks for confirmation and then calls:

```txt
DELETE /api/web-audits/[audit-id]
```

## API Endpoints

### List Audits

```txt
GET /api/web-audits
```

Returns up to 25 audit records for the active tenant, ordered by newest first.

### Create Audit

```txt
POST /api/web-audits
```

Creates a queued audit and returns the serialized audit with HTTP status `202`.

Request body:

```json
{
  "url": "https://example.com"
}
```

Validation rules:

- URL is required.
- URL must be syntactically valid.
- URL protocol must be `http` or `https`.

Runtime safety checks also reject:

- `localhost`
- `.localhost` domains
- private or internal network IPs
- hostnames that cannot be resolved

### Get Audit Detail

```txt
GET /api/web-audits/[audit-id]
```

Returns one audit record if it belongs to the active tenant.

### Delete Audit

```txt
DELETE /api/web-audits/[audit-id]
```

Deletes one audit record if it belongs to the active tenant.

## Rate Limits

Audit creation is limited by:

- 5 audits per user per minute
- 50 audits per user per day
- 250 audits per tenant per day

When a limit is exceeded, the API returns HTTP `429`.

## Processing Pipeline

The background processing function is:

```txt
processWebAudit()
```

The analyzer is implemented in:

```txt
src/modules/web-audit/utils/analyze-website-url.ts
```

Current progress steps include:

- Starting audit
- Validating target URL and fetching HTML
- Reading metadata and response headers
- Checking robots.txt and sitemap.xml
- Running Lighthouse audit
- Merging Lighthouse and HTTP findings
- Saving final audit result
- Audit completed

If the audit fails, the record is updated with:

- `status: "FAILED"`
- `progress: 100`
- `currentStep: "Audit failed"`
- `overallScore: 0`
- a high-severity failure finding
- `errorMessage`

## Audit Categories

The analyzer produces five categories.

### Performance

HTTP-based checks include:

- Successful HTTP status
- Initial response time at or below 1200ms
- Reasonable HTML payload size
- Low redirect count

When Lighthouse is available, Lighthouse performance results replace the HTTP fallback score.

### SEO

Checks include:

- HTML content type
- Title tag presence and recommended length
- Meta description presence and recommended length
- Canonical URL
- Exactly one H1
- `robots.txt`
- `sitemap.xml`

When Lighthouse is available, Lighthouse SEO results replace the HTTP fallback score.

### Accessibility

Checks include:

- Viewport metadata
- At least one H1
- Image alt text coverage

When Lighthouse is available, Lighthouse accessibility results replace the HTTP fallback score.

### Best Practices

Checks include:

- HTTPS usage
- Successful HTTP status
- Open Graph title
- No `noindex` robots directive

When Lighthouse is available, Lighthouse best-practices results replace the HTTP fallback score.

### Security

Checks include:

- HTTPS usage
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`

Security currently uses the HTTP/header analyzer score.

## Lighthouse Integration

The analyzer attempts to run Lighthouse unless:

```txt
WEB_AUDIT_LIGHTHOUSE_ENABLED=false
```

Lighthouse runs with these categories:

- Performance
- Accessibility
- Best Practices
- SEO

If Lighthouse succeeds, its category scores replace the HTTP fallback scores for matching categories. Lighthouse opportunities below the score threshold are added as priority findings and mapped back to their Lighthouse category when possible.

If Lighthouse fails, the audit still completes using HTTP analyzer data and adds a medium-severity "Lighthouse audit unavailable" finding.

## Data Model

Audit records are stored in the `web_audits` table through the `WebAudit` Prisma model.

Important fields:

```txt
id
tenantId
userId
url
status
progress
currentStep
overallScore
categories
findings
errorMessage
createdAt
updatedAt
```

`categories` and `findings` are stored as JSON.

Valid statuses:

```txt
QUEUED
RUNNING
COMPLETED
FAILED
```

## Serialized Result Shape

Client components consume serialized audit results through:

```txt
src/modules/web-audit/utils/serialize-web-audit.ts
```

The serialized result includes:

```txt
id
url
status
progress
currentStep
auditedAt
createdAt
errorMessage
overallScore
categories
findings
```

Each category contains:

```txt
key
label
score
summary
```

Each finding contains:

```txt
title
description
severity
category
```

`category` is optional for backward compatibility with older saved records.

## Query Keys

TanStack Query uses:

```txt
["web-audits"]
["web-audits", auditId]
```

The list query is invalidated after creating or deleting an audit. Tenant changes remove and invalidate the audit list query so the UI does not leak stale workspace data.

## Access Control

All audit API handlers require authentication through `withAuth`.

The active tenant is resolved with:

```txt
getAuthorizationContext(userId)
```

All list, detail, and delete operations include `tenantId` filtering, so users can only access records for the active workspace.

## Important Files

```txt
src/app/(tenant)/dashboard/page.tsx
src/app/(tenant)/dashboard/audits/page.tsx
src/app/(tenant)/dashboard/audits/[audit-id]/page.tsx
src/app/api/web-audits/route.ts
src/app/api/web-audits/[audit-id]/route.ts
src/modules/web-audit/components/web-audit-dashboard.tsx
src/modules/web-audit/components/web-audit-form.tsx
src/modules/web-audit/components/audit-history.tsx
src/modules/web-audit/components/audit-detail.tsx
src/modules/web-audit/components/audit-result.tsx
src/modules/web-audit/schemas/web-audit.schema.ts
src/modules/web-audit/services/web-audit.service.ts
src/modules/web-audit/utils/analyze-website-url.ts
src/modules/web-audit/utils/serialize-web-audit.ts
prisma/schema.prisma
```
