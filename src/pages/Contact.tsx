import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RibbonEdge } from '../components/RibbonEdge';
import { SelectField, TextAreaField, TextField } from '../components/Form';
import { Eyebrow, Glyph } from '../components/primitives';
import { BUDGETS, CONTACT, PROJECT_TYPES } from '../data/site';
import { usePageTitle } from '../hooks/usePageTitle';
import { asset, avifSet, srcSet } from '../lib/assets';
import {
  DETAILS_MAX,
  EMPTY,
  formatInquiry,
  getDelivery,
  loadDraft,
  mailtoHref,
  postInquiry,
  saveDraft,
  validate,
  validateField,
  type InquiryErrors,
  type InquiryValues,
} from '../lib/inquiry';
import './Contact.css';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'handoff'; href: string }
  | { kind: 'error'; message: string };

const ORDER: (keyof InquiryValues)[] = ['name', 'email', 'company', 'projectType', 'budget', 'details'];

export function ContactPage() {
  usePageTitle('Contact');
  const [params] = useSearchParams();
  const delivery = useMemo(getDelivery, []);

  const [values, setValues] = useState<InquiryValues>(() => {
    const draft = { ...EMPTY, ...loadDraft() };
    const t = params.get('type');
    if (t && PROJECT_TYPES.some((p) => p.value === t)) draft.projectType = t;
    return draft;
  });
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof InquiryValues, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [summary, setSummary] = useState('');
  const refs = useRef<Partial<Record<keyof InquiryValues, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => saveDraft(values), [values]);

  const set =
    (field: keyof InquiryValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const next = { ...values, [field]: e.target.value };
      setValues(next);
      if (touched[field] || errors[field]) setErrors((er) => ({ ...er, [field]: validateField(field, next) }));
      if (status.kind !== 'idle' && status.kind !== 'sending') setStatus({ kind: 'idle' });
    };
  const blur = (field: keyof InquiryValues) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((er) => ({ ...er, [field]: validateField(field, values) }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({ name: true, email: true, projectType: true, details: true });
    const bad = ORDER.filter((f) => found[f]);
    if (bad.length) {
      setSummary(`Please fix ${bad.length} ${bad.length === 1 ? 'field' : 'fields'} before sending.`);
      refs.current[bad[0]]?.focus();
      return;
    }
    setSummary('');

    if (delivery.kind === 'endpoint') {
      setStatus({ kind: 'sending' });
      try {
        await postInquiry(delivery.url, values);
        setStatus({ kind: 'sent' });
      } catch {
        setStatus({
          kind: 'error',
          message: `We couldn’t send your inquiry. Your details are still here — please try again, or email ${CONTACT.email}.`,
        });
      }
    } else {
      const href = mailtoHref(delivery.address, values);
      setStatus({ kind: 'handoff', href });
      // Hand off to the visitor's mail app; the draft is not sent until they press Send.
      window.location.href = href;
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  async function copyMessage() {
    const { subject, body } = formatInquiry(values);
    try {
      await navigator.clipboard.writeText(`To: ${delivery.kind === 'email' ? delivery.address : CONTACT.email}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const remaining = values.details.length;
  // Every required field valid: the primary action gets one sheen (CSS) to show it is ready.
  const ready = useMemo(() => Object.keys(validate(values)).length === 0, [values]);
  const handoffNote =
    delivery.kind === 'email'
      ? `Opens an email draft to ${delivery.address} in your mail app. Nothing is sent until you press Send.`
      : 'Sends your inquiry to the Vellora team.';
  const backdrop = asset('07-Contact/backgrounds/globe-and-ribbons-backdrop');
  const artVars = {
    '--panel-art': `url(${asset('07-Contact/backgrounds/inquiry-glass-panel').src})`,
  } as CSSProperties;

  return (
    <div className="page page--contact" style={artVars}>
      <section className="ct" aria-labelledby="ct-title">
        {/* One artwork layer in the 1199 × 613 source frame, cover-scaled to the section: the
            backdrop already contains the globe and both ribbons; the rigs use derived backings
            that equal the backdrop outside each light strip, so every feature renders once. */}
        <div className="ct-art decor" aria-hidden="true">
          <picture>
            <source type="image/avif" srcSet={avifSet('07-Contact/backgrounds/globe-and-ribbons-backdrop')} sizes="(min-width: 1024px) 160vw, 1200px" />
            <img
              className="ct-art__backdrop"
              src={backdrop.src}
              srcSet={srcSet('07-Contact/backgrounds/globe-and-ribbons-backdrop')}
              sizes="(min-width: 1024px) 160vw, 1200px"
              width={backdrop.w}
              height={backdrop.h}
              alt=""
              decoding="sync"
              {...{ fetchpriority: 'high' }}
            />
          </picture>
          <RibbonEdge
            base="07-Contact/motion-ribbons/top-edge/01-base-clean"
            strip="07-Contact/motion-ribbons/top-edge/02-ribbon"
            className="ct-art__ribbon ct-art__ribbon--top"
          />
          <RibbonEdge
            base="07-Contact/motion-ribbons/lower-edge/01-base-clean"
            strip="07-Contact/motion-ribbons/lower-edge/02-ribbon"
            className="ct-art__ribbon ct-art__ribbon--low"
          />
        </div>

        <div className="ct__layout">
          <div className="ct__intro">
            <Eyebrow flash="contact" className="ct__eyebrow">
              Contact Us
            </Eyebrow>
            <h1 id="ct-title" className="ct__title">
              Let’s Build <br />
              <span className="ct__title-l2">Something Great</span> <br />
              <span className="t-lime t-italic">Together</span>
            </h1>
            <p className="ct__lead">
              Have a project in mind? Tell us what you’re building, <br className="br-desktop" />
              <span className="ct__lead-l2">and our team will get back to you with the right approach,</span>{' '}
              <br className="br-desktop" />
              <span className="ct__lead-l3">timeline, and next steps.</span>
            </p>
            <ul className="ct__methods" role="list">
              <li className="ct-method ct-method--email">
                <Glyph k="Shared-Icons/contact/email" className="ct-method__icon" />
                <span className="ct-method__label">Email</span>
                <a className="ct-method__value ct-method__link" href={`mailto:${CONTACT.email}`}>
                  {CONTACT.email}
                </a>
              </li>
              <li className="ct-method ct-method--slack">
                <Glyph k="Shared-Icons/contact/slack" className="ct-method__icon" />
                <span className="ct-method__label">Slack</span>
                <span className="ct-method__value">{CONTACT.slack}</span>
              </li>
              <li className="ct-method ct-method--location">
                <Glyph k="Shared-Icons/contact/location" className="ct-method__icon" />
                <span className="ct-method__label">Location</span>
                <span className="ct-method__value">{CONTACT.location}</span>
              </li>
              <li className="ct-method ct-method--response">
                <Glyph k="Shared-Icons/contact/response-time" className="ct-method__icon" />
                <span className="ct-method__label">Response Time</span>
                <span className="ct-method__value">{CONTACT.response}</span>
              </li>
            </ul>
          </div>

          <form className="inquiry" noValidate onSubmit={onSubmit} aria-labelledby="inquiry-title" data-ready={ready ? 'true' : 'false'}>
            <div className="inquiry__head">
              <h2 id="inquiry-title" className="inquiry__title">
                <Glyph k="Shared-Icons/contact/send-plane" className="inquiry__plane" />
                Project Inquiry
              </h2>
              <p className="inquiry__sub">Tell us about your project</p>
            </div>
            <p className="visually-hidden">Fields marked with an asterisk are required.</p>

            <div className="inquiry__grid">
              <TextField
                ref={(el) => (refs.current.name = el)}
                id="f-name"
                className="f-name"
                label="Your Name"
                required
                icon="Shared-Icons/contact/name"
                name="name"
                autoComplete="name"
                placeholder="Enter your full name"
                value={values.name}
                onChange={set('name')}
                onBlur={blur('name')}
                error={errors.name}
              />
              <TextField
                ref={(el) => (refs.current.email = el)}
                id="f-email"
                className="f-email"
                label="Email Address"
                required
                icon="Shared-Icons/contact/email-field"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@example.com"
                value={values.email}
                onChange={set('email')}
                onBlur={blur('email')}
                error={errors.email}
              />
              <TextField
                ref={(el) => (refs.current.company = el)}
                id="f-company"
                className="f-company"
                label="Company"
                optional
                icon="Shared-Icons/contact/company"
                name="company"
                autoComplete="organization"
                placeholder="Your company name"
                value={values.company}
                onChange={set('company')}
              />
              <SelectField
                ref={(el) => (refs.current.projectType = el)}
                id="f-type"
                className="f-type"
                label="Project Type"
                required
                icon="Shared-Icons/contact/project-type"
                chevron="Shared-Icons/contact/form-dropdown-chevron"
                name="projectType"
                placeholder="Select a project type"
                options={PROJECT_TYPES}
                value={values.projectType}
                onChange={set('projectType')}
                onBlur={blur('projectType')}
                error={errors.projectType}
              />
              <SelectField
                ref={(el) => (refs.current.budget = el)}
                id="f-budget"
                className="f-budget"
                label="Budget"
                optional
                icon="Shared-Icons/contact/budget-wallet"
                chevron="Shared-Icons/contact/dropdown-chevron"
                name="budget"
                placeholder="Select budget range"
                options={BUDGETS}
                value={values.budget}
                onChange={set('budget')}
              />
              <TextAreaField
                ref={(el) => (refs.current.details = el)}
                id="f-details"
                className="f-details"
                label="Project Details"
                required
                icon="Shared-Icons/contact/project-details"
                name="details"
                rows={4}
                maxLength={DETAILS_MAX}
                placeholder="Tell us about your idea, goals, and any key requirements..."
                value={values.details}
                onChange={set('details')}
                onBlur={blur('details')}
                error={errors.details}
                hint="counter"
                counter={
                  <span id="f-details-hint" className="inquiry__counter" aria-live="off">
                    {remaining.toLocaleString('en-US')} / {DETAILS_MAX.toLocaleString('en-US')}
                    <span className="visually-hidden"> characters used</span>
                  </span>
                }
              />
            </div>

            <div className="inquiry__foot">
              <button type="submit" className="btn btn--primary inquiry__submit" aria-describedby="inquiry-handoff" disabled={status.kind === 'sending'}>
                <span>{status.kind === 'sending' ? 'Sending…' : 'Start a Conversation'}</span>
                <Glyph k="Shared-Icons/contact/conversation-arrow" className="btn__arrow" />
              </button>
              <div className="inquiry__notes">
                <p className="inquiry__privacy">
                  <Glyph k="Shared-Icons/contact/privacy-lock" className="inquiry__lock" />
                  <span>
                    Your information is kept private and will only be <br className="br-desktop" />
                    used to contact you about your inquiry.
                  </span>
                </p>
                <p id="inquiry-handoff" className="visually-hidden">
                  {handoffNote}
                </p>
              </div>
            </div>

            <p className="inquiry__summary" role="alert">
              {summary}
            </p>

            <div ref={resultRef} tabIndex={-1} className="inquiry__result-wrap" aria-live="polite">
              {status.kind === 'handoff' && (
                <div className="inquiry__result inquiry__result--handoff">
                  <p className="inquiry__result-title">Your email draft is ready.</p>
                  <p>
                    We opened your mail app with a message to <strong>{delivery.kind === 'email' ? delivery.address : CONTACT.email}</strong>.
                    Review it and press Send to reach the team. Your answers stay on this page.
                  </p>
                  <p className="inquiry__result-actions">
                    <a className="btn btn--outline" href={status.href}>
                      Open the draft again
                    </a>
                    <button type="button" className="btn btn--ghost" onClick={copyMessage}>
                      {copied ? 'Copied' : 'Copy message'}
                    </button>
                  </p>
                </div>
              )}
              {status.kind === 'sent' && (
                <div className="inquiry__result inquiry__result--ok">
                  <p className="inquiry__result-title">Thanks — your inquiry was sent.</p>
                  <p>We reply within one business day.</p>
                </div>
              )}
              {status.kind === 'error' && (
                <div className="inquiry__result inquiry__result--error" role="alert">
                  <p className="inquiry__result-title">Not sent.</p>
                  <p>{status.message}</p>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
