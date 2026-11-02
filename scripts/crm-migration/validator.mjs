import { createHash } from "node:crypto";

const COLLECTIONS = ["contacts", "businesses", "communications", "consents", "workflows", "tags", "deliveryHistory"];
const array = (value) => Array.isArray(value) ? value : [];
const duplicateValues = (rows, key) => {
  const seen = new Set(); const duplicates = new Set();
  for (const row of rows) { const value = String(row?.[key] ?? "").trim().toLowerCase(); if (!value) continue; if (seen.has(value)) duplicates.add(value); else seen.add(value); }
  return [...duplicates];
};

export function checksumBundle(bundle) {
  return createHash("sha256").update(JSON.stringify(bundle)).digest("hex");
}

export function validateBundle(bundle) {
  const errors = []; const warnings = [];
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) return { valid: false, errors: ["Export must be a JSON object."], warnings, counts: {}, checksum: "" };
  const counts = Object.fromEntries(COLLECTIONS.map(name => [name, array(bundle[name]).length]));
  for (const name of COLLECTIONS) if (!Array.isArray(bundle[name])) errors.push(`${name} must be an array.`);

  const contacts = array(bundle.contacts); const businesses = array(bundle.businesses); const communications = array(bundle.communications);
  const contactIds = new Set(contacts.map(row => String(row?.id ?? "")).filter(Boolean));
  const businessIds = new Set(businesses.map(row => String(row?.id ?? "")).filter(Boolean));
  for (const value of duplicateValues(contacts, "id")) errors.push(`Duplicate contact id: ${value}`);
  for (const value of duplicateValues(businesses, "id")) errors.push(`Duplicate business id: ${value}`);
  for (const value of duplicateValues(contacts, "email")) warnings.push(`Duplicate contact email requires merge review: ${value}`);
  for (const value of duplicateValues(contacts, "phone")) warnings.push(`Duplicate contact phone requires merge review: ${value}`);

  for (const row of contacts) if (!row?.id || (!row?.email && !row?.phone && !row?.authUserId)) errors.push(`Contact ${row?.id || "<missing>"} has no stable identity.`);
  for (const row of communications) {
    if (!row?.id) errors.push("Communication is missing id.");
    if (row?.contactId && !contactIds.has(String(row.contactId))) errors.push(`Communication ${row.id} references missing contact ${row.contactId}.`);
    if (row?.businessId && !businessIds.has(String(row.businessId))) errors.push(`Communication ${row.id} references missing business ${row.businessId}.`);
  }
  for (const row of array(bundle.consents)) {
    if (!contactIds.has(String(row?.contactId ?? ""))) errors.push(`Consent ${row?.id || "<missing>"} references a missing contact.`);
    if (!row?.capturedAt || !row?.provenance || !row?.channel || !row?.status) errors.push(`Consent ${row?.id || "<missing>"} lacks provenance, channel, status, or capturedAt.`);
  }
  for (const row of array(bundle.deliveryHistory)) if (row?.communicationId && !communications.some(message => String(message?.id) === String(row.communicationId))) errors.push(`Delivery ${row?.id || "<missing>"} references missing communication ${row.communicationId}.`);

  const sourceCounts = bundle.metadata?.counts;
  if (sourceCounts && typeof sourceCounts === "object") for (const name of COLLECTIONS) if (Number(sourceCounts[name]) !== counts[name]) errors.push(`Declared ${name} count ${sourceCounts[name]} does not match exported count ${counts[name]}.`);
  return { valid: errors.length === 0, errors, warnings, counts, checksum: checksumBundle(bundle) };
}
