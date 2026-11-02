import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const admin = await readFile(new URL("../src/pages/Admin.tsx", import.meta.url), "utf8");

test("communications UI exposes source, recovery, filters, and refresh", () => {
  assert.match(admin, /First-party CRM/);
  assert.match(admin, /Legacy fallback/);
  assert.match(admin, /Clear the filters or refresh/);
  assert.match(admin, /setCommsRefresh/);
  assert.match(admin, /value="queued">Queued/);
  assert.match(admin, /error_detail/);
  assert.match(admin, /retry-message/);
  assert.match(admin, /Message retry blocked/);
});

test("CRM contacts UI is searchable, read-only, and exposes recovery guidance", () => {
  assert.match(admin, /First-party CRM Contacts/);
  assert.match(admin, /Search by name, email, or phone/);
  assert.match(admin, /This view is read-only/);
  assert.match(admin, /Confirm the CRM migration/);
  assert.match(admin, /Search results are limited to 50 records/);
});

test("business removal is presented as recoverable archive", () => {
  assert.match(admin, /Archive Business Listing/);
  assert.match(admin, /data is retained for recovery/);
  assert.doesNotMatch(admin, /Delete Permanently/);
});
