import { t } from '../../i18n';
import { JobSeniority, type Job } from '../../types';

const GREETING = (): string => t('apply.greeting');
const BODY = (vacancy: string): string => t('apply.body', { vacancy });

export function shouldOfferApplication(job: Job): boolean {
  return job.seniority !== JobSeniority.Junior && !!job.contactEmail;
}

function vacancyName(job: Job): string {
  const role = job.role?.trim();
  if (role) return role;
  const title = job.title?.trim();
  if (!title || title.length > 80) return t('apply.thePosting');
  return title;
}

export function applicationSubject(job: Job): string {
  return vacancyName(job);
}

export function applicationBody(job: Job): string {
  return `${GREETING()}\n\n${BODY(vacancyName(job))}`;
}

export function gmailComposeUrl(job: Job, account: string | null): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: job.contactEmail ?? '',
    su: applicationSubject(job),
    body: applicationBody(job),
  });
  const inbox = account ? `u/${encodeURIComponent(account)}/` : '';
  return `https://mail.google.com/mail/${inbox}?${params.toString()}`;
}

const STACK_IN_LETTER = 4;
const MAX_LETTER_CHARS = 1000;

function employerName(job: Job): string {
  const company = job.company?.trim();
  if (company) return company;
  const author = job.author?.trim();
  return job.source === 'getonbrd' && author ? author : 'la empresa';
}

function positionName(job: Job): string {
  return job.role?.trim() || job.title?.trim() || 'la vacante';
}

function withoutRedundant(stack: readonly string[]): string[] {
  return stack.filter((tech) => !stack.some((other) =>
    other !== tech && other.toLowerCase().includes(tech.toLowerCase()),
  ));
}

function stackList(job: Job): string {
  const stack = withoutRedundant(job.stackMatch).slice(0, STACK_IN_LETTER);
  if (!stack.length) return '';
  if (stack.length === 1) return stack[0]!;
  return `${stack.slice(0, -1).join(', ')} y ${stack[stack.length - 1]}`;
}

function dropSentencesWith(template: string, placeholder: string): string {
  return template
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !sentence.includes(placeholder))
    .join(' ')
    .trim();
}

function fill(template: string, job: Job, stack: string): string {
  return template
    .split('{puesto}').join(positionName(job))
    .split('{empresa}').join(employerName(job))
    .split('{tecnologias}').join(stack);
}

export function motivationLetter(job: Job, template: string): string {
  const stack = stackList(job);
  const base = stack ? template : dropSentencesWith(template, '{tecnologias}');
  const letter = fill(base, job, stack);

  if (letter.length <= MAX_LETTER_CHARS) return letter;
  return fill(dropSentencesWith(template, '{tecnologias}'), job, '');
}
