import assert from "node:assert/strict";
import test from "node:test";
import { validateBundle } from "./validator.mjs";

const validBundle = { metadata: { counts: { contacts: 1, businesses: 1, communications: 1, consents: 1, workflows: 1, tags: 1, deliveryHistory: 1 } }, contacts: [{ id: "c1", email: "owner@example.com" }], businesses: [{ id: "b1", name: "Cafe" }], communications: [{ id: "m1", contactId: "c1", businessId: "b1" }], consents: [{ id: "x1", contactId: "c1", channel: "email", status: "granted", provenance: "web form", capturedAt: "2026-01-01T00:00:00Z" }], workflows: [{ id: "w1" }], tags: [{ id: "t1" }], deliveryHistory: [{ id: "d1", communicationId: "m1" }] };

test("validates a reconciled export and reports every collection count", () => { const report = validateBundle(validBundle); assert.equal(report.valid, true); assert.equal(report.counts.communications, 1); assert.match(report.checksum, /^[a-f0-9]{64}$/); });
test("rejects broken references and count mismatches", () => { const bundle = structuredClone(validBundle); bundle.communications[0].contactId = "missing"; bundle.metadata.counts.contacts = 2; const report = validateBundle(bundle); assert.equal(report.valid, false); assert.ok(report.errors.some(error => error.includes("missing contact"))); assert.ok(report.errors.some(error => error.includes("Declared contacts count"))); });
test("flags duplicate identities for merge review without dropping records", () => { const bundle = structuredClone(validBundle); bundle.contacts.push({ id: "c2", email: "OWNER@example.com" }); bundle.metadata.counts.contacts = 2; const report = validateBundle(bundle); assert.equal(report.valid, true); assert.ok(report.warnings.some(warning => warning.includes("merge review"))); assert.equal(report.counts.contacts, 2); });
