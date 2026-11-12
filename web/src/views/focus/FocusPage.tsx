import { useEffect, useState } from 'react';
import { Box, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { getFocus, getSettings, markFocusSeen, type Focus, type FocusTopic } from '../../api/client';
import { t } from '../../i18n';
import { AppAlert, AppChip, PageContainer } from '../../components/ui';

const WINDOWS = [3, 6, 12, 24];
const RANKED = 10;

const monoSx = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
} as const;

const Bar = ({ share, height = 6 }: { share: number; height?: number }) => (
  <Box sx={{ height, bgcolor: 'grey.300', borderRadius: 0 }}>
    <Box sx={{ width: `${Math.min(100, Math.max(0, share))}%`, height: '100%', bgcolor: 'primary.main' }} />
  </Box>
);

const RankRow = ({ topic, index, top, total }: { topic: FocusTopic; index: number; top: number; total: number }) => (
  <Tooltip
    title={t('focus.rank.cell', { count: topic.vacancies, total, share: topic.share })}
    placement="top"
  >
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '22px 1fr 62px', sm: '22px minmax(150px, 230px) 1fr 62px 46px' },
      alignItems: 'center',
      gap: 1.875,
      minHeight: 56,
      borderBottom: 1,
      borderColor: 'divider',
      '&:last-of-type': { borderBottom: 0 },
    }}
  >
    <Typography component="span" sx={{ ...monoSx, color: 'text.secondary' }}>
      {String(index + 1).padStart(2, '0')}
    </Typography>
    <Typography component="span" sx={{ ...monoSx, color: 'text.primary' }} noWrap title={topic.name}>
      {topic.name}
    </Typography>
    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
      <Bar share={top === 0 ? 0 : (topic.vacancies / top) * 100} />
    </Box>
    <Typography component="span" sx={{ ...monoSx, textAlign: 'right' }}>
      {`${topic.vacancies}/${total}`}
    </Typography>
    <Typography component="span" sx={{ ...monoSx, color: 'text.secondary', textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
      {`${topic.share}%`}
    </Typography>
  </Box>
  </Tooltip>
);

const DetailRow = ({ topic, total }: { topic: FocusTopic; total: number }) => (
  <Box
    sx={{
      py: 2,
      borderBottom: 1,
      borderColor: 'divider',
      '&:last-of-type': { borderBottom: 0 },
      ...(topic.isNew ? { pl: 1.5, borderLeft: 3, borderLeftColor: 'success.main' } : undefined),
    }}
  >
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{topic.name}</Typography>
      {topic.isNew ? <AppChip label={t('focus.new')} tone="success" /> : null}
      <AppChip
        label={t('focus.outOf', { count: topic.vacancies, total })}
        tone={topic.vacancies >= total / 3 ? 'success' : 'neutral'}
      />
    </Stack>

    <Box sx={{ my: 1.25, maxWidth: 520 }}><Bar share={topic.share} height={4} /></Box>

    {topic.examples.map((example) => (
      <Typography
        key={example}
        sx={{ fontSize: 12, lineHeight: 1.7, color: 'text.secondary', pl: 1.5, borderLeft: 2, borderColor: 'divider', mb: 0.75 }}
      >
        {example}
      </Typography>
    ))}
  </Box>
);

const Panel = ({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', p: 2.25 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={2.25}>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>
      {meta ? <AppChip label={meta} /> : null}
    </Stack>
    {children}
  </Box>
);

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

  const top = focus?.topics[0]?.vacancies ?? 0;

  return (
    <PageContainer
      title={t('focus.title')}
      subtitle={t('focus.subtitle')}
      action={focus && focus.analysed > 0 ? (
        <Typography variant="label" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
          {t('focus.analysed', { count: focus.analysed })}
        </Typography>
      ) : null}
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {focus && focus.analysed === 0 ? <AppAlert severity="info">{t('focus.empty')}</AppAlert> : null}

      {focus && focus.analysed > 0 ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px', xl: 'minmax(0, 1fr) 340px' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ minHeight: 39 }}>
                <Typography variant="h6" sx={{ fontSize: 14 }}>{t('focus.topics')}</Typography>
                <TextField
                  select
                  size="small"
                  label={t('focus.window')}
                  value={months ?? ''}
                  onChange={(event) => setMonths(Number(event.target.value))}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 170 }}
                >
                  {WINDOWS.map((option) => (
                    <MenuItem key={option} value={option}>{t('focus.lastMonths', { months: option })}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.25, mb: 1 }}>
                <Tooltip title={t('focus.rank.help', { total: focus.analysed })}>
                  <Typography variant="label" color="text.secondary" sx={{ cursor: 'help' }}>
                    {t('focus.rank.head')}
                  </Typography>
                </Tooltip>
              </Stack>

              {focus.topics.length ? (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', px: 2.75 }}>
                  {focus.topics.slice(0, RANKED).map((topic, index) => (
                    <RankRow key={topic.name} topic={topic} index={index} top={top} total={focus.analysed} />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">{t('focus.topics.empty')}</Typography>
              )}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Panel title={t('focus.emerging')} meta={String(focus.emerging.length)}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2.25, lineHeight: 1.7 }}>
                  {t('focus.emerging.help')}
                </Typography>

                {focus.emerging.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('focus.topics.empty')}</Typography>
                ) : focus.emerging.map((item) => (
                  <Box
                    key={item.term}
                    sx={{
                      py: 1.5,
                      borderTop: 1,
                      borderColor: 'divider',
                      ...(item.isNew ? { pl: 1.5, borderLeft: 3, borderLeftColor: 'success.main' } : undefined),
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{item.term}</Typography>
                      {item.isNew ? <AppChip label={t('focus.new')} tone="success" /> : null}
                    </Stack>
                    <Typography component="span" sx={{ ...monoSx, fontSize: 10, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                      {t('focus.mentions', { count: item.vacancies })}
                    </Typography>
                    {item.example ? (
                      <Typography sx={{ fontSize: 11, lineHeight: 1.7, color: 'text.secondary', mt: 0.875, pl: 1.25, borderLeft: 2, borderColor: 'divider' }}>
                        {item.example}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Panel>
            </Box>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontSize: 14, minHeight: 39, display: 'flex', alignItems: 'center' }}>
              {t('focus.requirements')}
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              {`${t('focus.basis', { count: focus.analysed })} ${t('focus.verbatim')}`}
            </Typography>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', px: 2.75, py: 0.5 }}>
              {focus.topics.map((topic) => (
                <DetailRow key={topic.name} topic={topic} total={focus.analysed} />
              ))}
            </Box>
          </Box>
        </>
      ) : null}
    </PageContainer>
  );
};

export default FocusPage;
