"use client";

import { useState, useRef, type FormEvent } from "react";
import { submitPublicLead } from "./actions";

export default function LeadCapturePage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const data = new FormData(e.currentTarget);
    const result = await submitPublicLead(data);
    setSubmitting(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <h1 className="font-display text-2xl font-normal text-neutral-900 dark:text-neutral-50 mb-1">
          John Doe CRM
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
          Get in touch. We&apos;ll be back to you shortly.
        </p>

        {done ? (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8 text-center space-y-3">
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
              Thanks! We&apos;ll be in touch.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Your message was received. Expect a reply within one business day.
            </p>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8 space-y-5"
          >
            {/* Honeypot — hidden from humans, filled by bots */}
            <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Jane Smith"
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <label
                htmlFor="company"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                autoComplete="organization"
                placeholder="Acme Ltd."
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 000 0000"
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                How can we help?
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell us a bit about your project or question…"
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {submitting ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
