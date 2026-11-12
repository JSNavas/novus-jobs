import { useEffect, useState } from 'react';
import { Box, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { getFocus, getSettings, markFocusSeen, type Focus, type FocusTopic } from '../../api/client';
import { t } from '../../i18n';
import { AppAlert, AppChip, BlankCard, PageContainer } from '../../components/ui';

const TopicRow = ({ topic, total }: { topic: FocusTopic; total: number }) => (
  <Box sx={topic.isNew ? { pl: 1.5, py: 1, borderLeft: 3, borderColor: 'success.main', bgcolor: 'action.hover', borderRadius: 1 } : undefined}>
    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="subtitle1">{topic.name}</Typography>
      {topic.isNew ? <AppChip label={t('focus.new')} tone="success" /> : null}
      <AppChip label={t('focus.outOf', { count: topic.vacancies, total })} tone={topic.vacancies >= total / 3 ? 'success' : 'neutral'} />
    </Stack>
    <LinearProgress variant="determinate" value={topic.share} sx={{ my: 0.75, height: 6, borderRadius: 3 }} />
    {topic.examples.map((example) => (
      <Typography key={example} variant="body2" color="textSecondary" sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider', mb: 0.5 }}>
        {example}
      </Typography>
    ))}
  </Box>
);

const WINDOWS = [3, 6, 12, 24];

const FocusPage = () => {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<number | null>(null);

  useEffect(() => {
    getSettings()
      .then((settings) => setMonths((current) => current ?? settings.focusWindowMonths))
      .catch(() => setMonths((current) => current ?? 6));
  }, []);

  useEffect(() => {
    if (months === null) return;
    getFocus(months)
      .then(setFocus)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [months]);

  useEffect(() => () => { void markFocusSeen().catch(() => undefined); }, []);

  return (
    <PageContainer
      title={t('focus.title')}
      subtitle={t('focus.subtitle')}
      breadcrumbs={[{ title: t('focus.title') }]}
    >
      <Stack spacing={3}>
        {error ? <AppAlert severity="error">{error}</AppAlert> : null}

        {focus && focus.analysed === 0 ? (
          <AppAlert severity="info">
            {t('focus.empty')}
          </AppAlert>
        ) : null}

        {focus && focus.analysed > 0 ? (
          <>
            <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="textSecondary">
                  {t('focus.basis', { count: focus.analysed })}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('focus.verbatim')}
                </Typography>
              </Stack>
              <TextField
                select
                size="small"
                label={t('focus.window')}
                value={months ?? ''}
                onChange={(event) => setMonths(Number(event.target.value))}
                sx={{ minWidth: 160 }}
              >
                {WINDOWS.map((option) => (
                  <MenuItem key={option} value={option}>{t('focus.lastMonths', { months: option })}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <BlankCard>
              <Stack spacing={2.5} p={3}>
                <Typography variant="h5">{t('focus.topics')}</Typography>
                {focus.topics.length
                  ? focus.topics.map((topic) => <TopicRow key={topic.name} topic={topic} total={focus.analysed} />)
                  : <Typography variant="body2">{t('focus.topics.empty')}</Typography>}
              </Stack>
            </BlankCard>
            {focus.emerging.length ? (
              <BlankCard>
                <Stack spacing={2} p={3}>
                  <Box>
                    <Typography variant="h5">{t('focus.emerging')}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {t('focus.emerging.help')}
                    </Typography>
                  </Box>
                  {focus.emerging.map((item) => (
                    <Box
                      key={item.term}
                      sx={item.isNew ? { pl: 1.5, py: 1, borderLeft: 3, borderColor: 'success.main', bgcolor: 'action.hover', borderRadius: 1 } : undefined}
                    >
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="subtitle1">{item.term}</Typography>
                        <AppChip label={t('focus.outOf', { count: item.vacancies, total: focus.analysed })} tone="neutral" />
                        {item.isNew ? <AppChip label={t('focus.new')} tone="success" /> : null}
                      </Stack>
                      {item.example ? (
                        <Typography variant="body2" color="textSecondary" sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
                          {item.example}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </BlankCard>
            ) : null}
          </>
        ) : null}
      </Stack>
    </PageContainer>
  );
};

export default FocusPage;
