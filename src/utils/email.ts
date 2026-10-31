/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GmailComposeOptions {
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

/**
 * Requirement 3: Email Integration
 * Redirects the user directly to Gmail web composer with recipient, subject,
 * and body prefilled so the user sends the email from Gmail themselves.
 */
export function openGmailCompose({ to, subject, body, cc, bcc }: GmailComposeOptions): void {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  if (cc) params.set('cc', cc);
  if (bcc) params.set('bcc', bcc);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
}
