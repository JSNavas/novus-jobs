import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AppAlert, AppChip, BlankCard } from '../../components/ui';
import { formatDate, formatDateTime } from '../../format';
import { jobLocationLabel, jobSourceLabel, jobStatusLabel } from '../../labels';
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

const statusActions: { status: JobStatus; label: TranslationKey; variant: 'contained' | 'outlined' | 'text' }[] = [
  { status: JobStatus.New, label: 'card.action.new', variant: 'text' },
  { status: JobStatus.Seen, label: 'card.action.seen', variant: 'outlined' },
  { status: JobStatus.Saved, label: 'card.action.save', variant: 'outlined' },
  { status: JobStatus.Dismissed, label: 'card.action.dismiss', variant: 'text' },
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

const COLLAPSED_HEIGHT = 140;
const COPIED_FEEDBACK_MS = 2000;

const JobCard = ({ job, busy, settings, onStatusChange }: JobCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLPreElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node) return;
    setOverflows(node.scrollHeight > COLLAPSED_HEIGHT + 4);
  }, [job.text]);

  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [lettered, setLettered] = useState(false);

  const share = async (): Promise<void> => {
    const link = job.url ?? job.applyUrl;
    const payload = link ?? [job.title, job.text].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(payload);
      setShared(true);
      setTimeout(() => setShared(false), COPIED_FEEDBACK_MS);
    } catch {
      setShared(false);
    }
  };

  const copyLetter = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(motivationLetter(job, settings?.motivationTemplate ?? ''));
      setLettered(true);
      setTimeout(() => setLettered(false), COPIED_FEEDBACK_MS);
    } catch {
      setLettered(false);
    }
  };

  const copyEmail = async (): Promise<void> => {
    if (!job.contactEmail) return;
    try {
      await navigator.clipboard.writeText(job.contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  };

  const actions = statusActions.filter((action) => action.status !== job.status);

  const responseText = (): string | null => {
    const days = job.responseDays;
    if (!days) return null;
    if (days.min && days.max) return t('card.responseRange', { min: days.min, max: days.max });
    const one = days.max ?? days.min;
    return one ? t('card.responseAbout', { days: one }) : null;
  };
  const competition = [
    job.applications === null
      ? null
      : plural(job.applications, 'card.applications.one', 'card.applications.many'),
    responseText(),
  ].filter(Boolean).join(' · ');
  const canApplyByEmail = !job.applyUrl && shouldOfferApplication(job);

  const contactLine = job.applyUrl
    ? t('card.applyAt', { url: job.applyUrl })
    : job.contactEmail
      ? t(canApplyByEmail ? 'card.sendCvTo' : 'card.contact', { email: job.contactEmail })
      : t('card.noContact');

  return (
    <BlankCard>
      <Stack spacing={1.5} p={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} flexWrap="wrap">
          <Box>
            <Typography variant="h5">{job.title ?? t('card.untitled')}</Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {[
                jobSourceLabel(job.source),
                job.company,
                job.postedAt
                  ? t('card.postedOn', { date: formatDate(job.postedAt) })
                  : t('card.foundOn', { date: formatDateTime(job.foundAt) }),
              ].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {job.isUncertain ? <AppChip label={t('card.uncertain')} tone="warning" /> : null}
            {job.verdict === JobVerdict.Rejected ? <AppChip label={t('card.rejected')} tone="error" /> : null}
            <AppChip label={jobStatusLabel(job.status)} />
          </Stack>
        </Stack>

        {job.verdict === JobVerdict.Rejected || job.rejectionReason || job.rejectionCode
          ? <RejectionBadge job={job} />
          : null}

        <Typography variant="body2">{t('card.postedBy', { author: job.author ?? t('card.unknownAuthor') })}</Typography>
        {job.stackMatch.length > 0 ? (
          <Typography variant="body2">{t('card.matches', { list: job.stackMatch.join(', ') })}</Typography>
        ) : null}
        <Typography variant="body2">{t('card.location', { place: locationText(job) })}</Typography>
        {competition ? <Typography variant="body2">{competition}</Typography> : null}

        <Stack spacing={1}>
          {contactLine ? <Typography variant="body2">{contactLine}</Typography> : null}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {job.applyUrl ? (
              <Button variant="contained" component="a" href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                {t('card.apply')}
              </Button>
            ) : null}
            {canApplyByEmail ? (
              <Button
                variant="contained"
                component="a"
                href={gmailComposeUrl(job, settings?.gmailAccount ?? null)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('card.composeGmail')}
              </Button>
            ) : null}
            {job.url && job.url !== job.applyUrl ? (
              <Button variant="outlined" component="a" href={job.url} target="_blank" rel="noopener noreferrer">
                {linkLabel(job.url)}
              </Button>
            ) : null}
            {settings?.motivationTemplate ? (
              <Button variant="outlined" onClick={() => void copyLetter()}>
                {lettered ? t('card.copiedLetter') : t('card.copyLetter')}
              </Button>
            ) : null}
            <Button variant="outlined" onClick={() => void share()}>
              {shared ? t('card.copied') : t('card.copyLink')}
            </Button>
            {job.contactEmail ? (
              <Button variant="outlined" onClick={() => void copyEmail()}>
                {copied ? t('card.copied') : t('card.copyEmail')}
              </Button>
            ) : null}
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                disabled={busy}
                onClick={() => onStatusChange(action.status)}
              >
                {t(action.label)}
              </Button>
            ))}
          </Stack>
        </Stack>

        {job.isAggregator ? (
          <AppAlert severity="warning">{t('card.aggregator')}</AppAlert>
        ) : null}

        <Typography
          variant="mono"
          component="pre"
          ref={textRef}
          sx={{
            m: 0,
            p: 2,
            borderRadius: 1,
            bgcolor: 'grey.100',
            whiteSpace: 'pre-wrap',
            maxHeight: expanded ? 'none' : COLLAPSED_HEIGHT,
            overflow: 'hidden',
          }}
        >
          {job.text}
        </Typography>
        {overflows ? (
          <Button variant="text" onClick={() => setExpanded((value) => !value)} sx={{ alignSelf: 'flex-start' }}>
            {expanded ? t('card.showLess') : t('card.showMore')}
          </Button>
        ) : null}

      </Stack>
    </BlankCard>
  );
};

export default JobCard;
