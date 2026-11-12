import type { NewJob } from '../db/jobs.repository.js';
import { t } from '../i18n/index.js';
import type { Language } from '../profile/types.js';
import { RunFailure } from '../types.js';
import { sourceLabelOf } from '../sources/registry.js';
import type { Mail } from './mailer.js';

const MAX_LISTED = 12;

export function headline(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 15);
  const raw = line ?? text.trim();
  return raw.length > 110 ? `${raw.slice(0, 107)}…` : raw;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function offersSubject(count: number, language: Language): string {
  return count === 1
    ? t(language, 'mail.subject.one')
    : t(language, 'mail.subject.many', { count });
}

function sourceLabel(source: string): string {
  return sourceLabelOf(source);
}

export function offersMail(jobs: readonly NewJob[], dashboardUrl: string, language: Language): Mail {
  const listed = jobs.slice(0, MAX_LISTED);
  const rest = jobs.length - listed.length;

  const lines = listed.map((job) => {
    const stack = job.stackMatch.slice(0, 5).join(', ');
    const where = job.location ?? t(language, 'mail.noLocation');
    return {
      title: headline(job.text),
      meta: [sourceLabel(job.source), where, stack].filter(Boolean).join(' · '),
    };
  });

  const text = [
    jobs.length === 1 ? t(language, 'mail.text.one') : t(language, 'mail.text.many', { count: jobs.length }),
    dashboardUrl,
    '',
    ...lines.map((l) => `• ${l.title}\n  ${l.meta}`),
    rest > 0 ? `\n${t(language, 'mail.more', { count: rest })}` : '',
  ].filter(Boolean).join('\n');

  const html = [
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">',
    `<p>${jobs.length === 1
      ? t(language, 'mail.html.one')
      : t(language, 'mail.html.many', { count: jobs.length })}</p>`,
    '<ul style="padding-left:18px">',
    ...lines.map((l) =>
      `<li style="margin-bottom:10px"><strong>${escapeHtml(l.title)}</strong>` +
      `<br><span style="color:#6b7280;font-size:13px">${escapeHtml(l.meta)}</span></li>`),
    '</ul>',
    rest > 0 ? `<p style="color:#6b7280">${t(language, 'mail.more.html', { count: rest })}</p>` : '',
    `<p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:10px 18px;background:#5d87ff;color:#fff;border-radius:6px;text-decoration:none">${t(language, 'mail.openDashboard')}</a></p>`,
    `<p style="color:#9ca3af;font-size:12px">${t(language, 'mail.footer')}</p>`,
    '</div>',
  ].filter(Boolean).join('');

  return { subject: offersSubject(jobs.length, language), html, text };
}

export function failureMail(
  failure: RunFailure,
  detail: string,
  dashboardUrl: string,
  language: Language,
  source = 'linkedin',
): Mail {
  const what: Record<RunFailure, string> = {
    [RunFailure.LoginRequired]: t(language, 'mail.fail.loginRequired', { source: sourceLabel(source) }),
    [RunFailure.ProfileBusy]: t(language, 'mail.fail.profileBusy'),
    [RunFailure.Layout]: t(language, 'mail.fail.layout'),
    [RunFailure.Other]: t(language, 'mail.fail.other'),
  };
  const fix: Record<RunFailure, string> = {
    [RunFailure.LoginRequired]: t(language, 'mail.fix.loginRequired', { source }),
    [RunFailure.ProfileBusy]: t(language, 'mail.fix.profileBusy'),
    [RunFailure.Layout]: t(language, 'mail.fix.layout'),
    [RunFailure.Other]: t(language, 'mail.fix.other'),
  };

  const subject = what[failure];
  const text = [
    subject, '', fix[failure], '',
    t(language, 'mail.detail', { detail }), '',
    t(language, 'mail.dashboard', { url: dashboardUrl }),
  ].join('\n');
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">' +
    `<p><strong>${escapeHtml(subject)}</strong></p>` +
    `<p>${escapeHtml(fix[failure])}</p>` +
    `<p style="color:#6b7280;font-size:13px">${escapeHtml(t(language, 'mail.detail', { detail }))}</p>` +
    `<p><a href="${escapeHtml(dashboardUrl)}">${t(language, 'mail.openDashboard')}</a></p></div>`;

  return { subject, html, text };
}
