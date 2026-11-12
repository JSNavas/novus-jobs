import { useState } from 'react';
import { Box, Button, Collapse, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import {
  IconArchive, IconBookmark, IconChevronDown, IconChevronUp, IconExternalLink, IconInbox, IconLink,
  IconMail, IconFileText, IconEye,
} from '@tabler/icons-react';
import { AppChip, AppStatusPilot, BlankCard } from '../../components/ui';
import { formatDate, formatTime } from '../../format';
import { jobLocationLabel, jobSourceLabel } from '../../labels';
import { plural, t, type TranslationKey } from '../../i18n';
import { JobLocation, JobStatus, JobVerdict, type Job } from '../../types';
import type { Settings } from '../../api/client';
import { gmailComposeUrl, motivationLetter, shouldOfferApplication } from './apply';
import RejectionBadge from './RejectionBadge';

interface JobCardProps {
  job: Job;
  busy: boolean;
  settings: Settings | null;
  onStatusChange: (status: JobStatus) => void;
}

const COPIED_FEEDBACK_MS = 2000;
const SUMMARY_CHARS = 240;
const MAX_CHIPS = 4;

const statusActions: { status: JobStatus; label: TranslationKey; icon: typeof IconInbox }[] = [
  { status: JobStatus.New, label: 'card.action.new', icon: IconInbox },
  { status: JobStatus.Seen, label: 'card.action.seen', icon: IconEye },
  { status: JobStatus.Saved, label: 'card.action.save', icon: IconBookmark },
  { status: JobStatus.Dismissed, label: 'card.action.dismiss', icon: IconArchive },
];

const linkLabel = (url: string): string => {
  if (/\/(feed\/update|posts)\//.test(url)) return t('card.link.post');
  if (/linkedin\.com\/in\//.test(url)) return t('card.link.profile');
  if (/linkedin\.com\/(company|school)\//.test(url)) return t('card.link.company');
  return t('card.link.other');
};

const locationText = (job: Job): string => {
  const hasReason = job.locationKind === JobLocation.OtherCountry || job.locationKind === JobLocation.Onsite;
  return hasReason ? (job.location ?? jobLocationLabel(job.locationKind)) : jobLocationLabel(job.locationKind);
};

const summaryOf = (job: Job): string => {
  const title = job.title ?? '';
  const body = job.text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== title && line !== job.author)
    .join(' ');
  return body.length > SUMMARY_CHARS ? `${body.slice(0, SUMMARY_CHARS).trimEnd()}…` : body;
};

const metaSx = { fontSize: 11, color: 'text.secondary' } as const;

const JobCard = ({ job, busy, settings, onStatusChange }: JobCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<'link' | 'letter' | 'email' | null>(null);

  const copy = async (what: 'link' | 'letter' | 'email', payload: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(what);
      setTimeout(() => setCopied(null), COPIED_FEEDBACK_MS);
    } catch {
      setCopied(null);
    }
  };

  const actions = statusActions.filter((action) => action.status !== job.status);
  const canApplyByEmail = !job.applyUrl && shouldOfferApplication(job);

  const responseText = (): string | null => {
    const days = job.responseDays;
    if (!days) return null;
    if (days.min && days.max) return t('card.responseRange', { min: days.min, max: days.max });
    const one = days.max ?? days.min;
    return one ? t('card.responseAbout', { days: one }) : null;
  };

  const competition = [
    job.applications === null ? null : plural(job.applications, 'card.applications.one', 'card.applications.many'),
    responseText(),
  ].filter(Boolean).join(' · ');

  const contactLine = job.applyUrl
    ? null
    : job.contactEmail
      ? t(canApplyByEmail ? 'card.sendCvTo' : 'card.contact', { email: job.contactEmail })
      : t('card.noContact');

  const iconAction = (title: string, icon: React.ReactNode, onClick: () => void, disabled = false) => (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" aria-label={title} onClick={onClick} disabled={disabled}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <BlankCard>
      <Box sx={{ px: 2.5, py: 2.375 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            aria-hidden
            sx={{
              width: 34, height: 34, flexShrink: 0, border: 1, borderColor: 'divider', borderRadius: 1,
              bgcolor: 'grey.300', color: 'text.secondary', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {(job.company ?? job.author ?? job.source).trim().slice(0, 1).toUpperCase()}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, mb: 0.875 }}>
              {job.title ?? t('card.untitled')}
            </Typography>
            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap sx={metaSx}>
              <span>{job.company ?? job.author ?? t('card.unknownAuthor')}</span>
              <span>·</span>
              <span>{locationText(job)}</span>
              <span>·</span>
              <Box
                aria-hidden
                sx={{
                  width: 20, height: 20, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.300',
                  color: 'text.primary', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                }}
              >
                {jobSourceLabel(job.source).slice(0, 1)}
              </Box>
              <span>{jobSourceLabel(job.source)}</span>
              <Typography variant="mono" component="span" sx={{ fontSize: '0.6875rem' }}>
                {job.postedAt
                  ? t('card.postedOn', { date: formatDate(job.postedAt) })
                  : `${formatDate(job.foundAt)} · ${formatTime(job.foundAt)}`}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {job.status === JobStatus.New ? (
              <AppStatusPilot tone="success" label={t('card.status.new')} />
            ) : null}
            {job.isUncertain ? (
              <Tooltip title={t('card.uncertain.help')}>
                <span><AppStatusPilot tone="neutral" label={t('card.uncertain')} /></span>
              </Tooltip>
            ) : null}
            {job.isAggregator ? (
              <Tooltip title={t('card.aggregator')}>
                <span><AppStatusPilot tone="neutral" label={t('card.aggregator.short')} /></span>
              </Tooltip>
            ) : null}
            {job.verdict === JobVerdict.Rejected ? (
              <AppStatusPilot tone="error" label={t('card.rejected')} />
            ) : null}
          </Stack>
        </Stack>

        {job.verdict === JobVerdict.Rejected || job.rejectionReason || job.rejectionCode ? (
          <Box sx={{ mt: 1.875 }}><RejectionBadge job={job} /></Box>
        ) : null}

        <Typography sx={{ fontSize: 12, lineHeight: 1.7, color: 'text.secondary', mt: 1.875, mb: 1.5, maxWidth: 850 }}>
          {summaryOf(job)}
        </Typography>

        {competition || contactLine ? (
          <Typography sx={{ ...metaSx, display: 'block', mb: 1.5 }}>
            {[competition, contactLine].filter(Boolean).join(' · ')}
          </Typography>
        ) : null}

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', lg: 'center' }}
          spacing={1.75}
        >
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            {job.stackMatch.slice(0, MAX_CHIPS).map((tech) => <AppChip key={tech} label={tech} />)}
            {job.stackMatch.length > MAX_CHIPS ? (
              <Tooltip title={job.stackMatch.slice(MAX_CHIPS).join(', ')}>
                <span><AppChip label={`+${job.stackMatch.length - MAX_CHIPS}`} /></span>
              </Tooltip>
            ) : null}
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded((value) => !value)}
              endIcon={expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            >
              {expanded ? t('card.hideAd') : t('card.fullAd')}
            </Button>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            {job.applyUrl ? (
              <Button
                variant="contained"
                size="small"
                component="a"
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<IconExternalLink size={13} />}
              >
                {t('card.apply')}
              </Button>
            ) : canApplyByEmail ? (
              <Button
                variant="contained"
                size="small"
                component="a"
                href={gmailComposeUrl(job, settings?.gmailAccount ?? null)}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<IconExternalLink size={13} />}
              >
                {t('card.composeGmail')}
              </Button>
            ) : job.url ? (
              <Button
                variant="contained"
                size="small"
                component="a"
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<IconExternalLink size={13} />}
              >
                {linkLabel(job.url)}
              </Button>
            ) : null}

            {iconAction(
              copied === 'link' ? t('card.copied') : t('card.copyLink'),
              <IconLink size={16} stroke={1.6} />,
              () => void copy('link', job.url ?? job.applyUrl ?? [job.title, job.text].filter(Boolean).join('\n\n')),
            )}

            {settings?.motivationTemplate ? iconAction(
              copied === 'letter' ? t('card.copiedLetter') : t('card.copyLetter'),
              <IconFileText size={16} stroke={1.6} />,
              () => void copy('letter', motivationLetter(job, settings.motivationTemplate)),
            ) : null}

            {job.contactEmail ? iconAction(
              copied === 'email' ? t('card.copied') : t('card.copyEmail'),
              <IconMail size={16} stroke={1.6} />,
              () => void copy('email', job.contactEmail ?? ''),
            ) : null}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            {actions.map((action) => iconAction(
              t(action.label),
              <action.icon size={16} stroke={1.6} />,
              () => onStatusChange(action.status),
              busy,
            ))}
          </Stack>
        </Stack>

        <Collapse in={expanded} unmountOnExit>
          <Typography
            component="pre"
            sx={{
              mt: 2, mb: 0, p: 2.25, border: 1, borderColor: 'divider', borderRadius: 1,
              bgcolor: 'background.default', whiteSpace: 'pre-wrap', overflowX: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, lineHeight: 1.8,
            }}
          >
            {job.text}
          </Typography>
        </Collapse>
      </Box>
    </BlankCard>
  );
};

export default JobCard;
