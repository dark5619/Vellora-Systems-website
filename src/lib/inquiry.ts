import { BUDGETS, CONTACT, PROJECT_TYPES } from '../data/site';

export interface InquiryValues {
  name: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  details: string;
}

export type InquiryErrors = Partial<Record<keyof InquiryValues, string>>;

export const DETAILS_MAX = 1000;
const DETAILS_MIN = 20;

export const EMPTY: InquiryValues = { name: '', email: '', company: '', projectType: '', budget: '', details: '' };

// Pragmatic address check: something@something.tld, no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateField(field: keyof InquiryValues, v: InquiryValues): string | undefined {
  switch (field) {
    case 'name':
      if (!v.name.trim()) return 'Enter your name.';
      if (v.name.trim().length < 2) return 'Your name should be at least 2 characters.';
      return;
    case 'email':
      if (!v.email.trim()) return 'Enter your email address.';
      if (!EMAIL_RE.test(v.email.trim())) return 'Enter an email address like name@company.com.';
      return;
    case 'projectType':
      if (!v.projectType) return 'Choose the type of project.';
      return;
    case 'details':
      if (!v.details.trim()) return 'Tell us a little about your project.';
      if (v.details.trim().length < DETAILS_MIN) return `Add a few more details (at least ${DETAILS_MIN} characters).`;
      if (v.details.length > DETAILS_MAX) return `Keep it under ${DETAILS_MAX.toLocaleString('en-US')} characters.`;
      return;
    default:
      return;
  }
}

export function validate(v: InquiryValues): InquiryErrors {
  const out: InquiryErrors = {};
  for (const f of ['name', 'email', 'projectType', 'details'] as const) {
    const e = validateField(f, v);
    if (e) out[f] = e;
  }
  return out;
}

const label = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? '';

export function formatInquiry(v: InquiryValues): { subject: string; body: string } {
  const type = label(PROJECT_TYPES, v.projectType) || 'New project';
  const lines = [
    `Name: ${v.name.trim()}`,
    `Email: ${v.email.trim()}`,
    v.company.trim() ? `Company: ${v.company.trim()}` : null,
    `Project type: ${type}`,
    v.budget ? `Budget: ${label(BUDGETS, v.budget)}` : null,
    '',
    'Project details:',
    v.details.trim(),
  ].filter((l): l is string => l !== null);
  return { subject: `Project inquiry — ${type}`, body: lines.join('\n') };
}

/** How the form delivers. Configure at build time; never guessed. */
export type Delivery =
  | { kind: 'endpoint'; url: string }
  | { kind: 'email'; address: string };

export function getDelivery(): Delivery {
  const url = import.meta.env.VITE_INQUIRY_ENDPOINT as string | undefined;
  if (url) return { kind: 'endpoint', url };
  const address = (import.meta.env.VITE_INQUIRY_EMAIL as string | undefined) || CONTACT.email;
  return { kind: 'email', address };
}

export function mailtoHref(address: string, v: InquiryValues) {
  const { subject, body } = formatInquiry(v);
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function postInquiry(url: string, v: InquiryValues, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...v, source: 'vellora-website' }),
    signal,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
}

const DRAFT_KEY = 'vellora.inquiry.draft';
export function loadDraft(): Partial<InquiryValues> {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<InquiryValues>) : {};
  } catch {
    return {};
  }
}
export function saveDraft(v: InquiryValues) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable: values stay in memory */
  }
}
