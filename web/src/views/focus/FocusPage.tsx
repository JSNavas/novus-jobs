import { useEffect, useState } from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { getFocus, type Focus, type FocusTopic } from '../../api/client';
import { AppAlert, AppChip, BlankCard, PageContainer } from '../../components/ui';

/**
 * ENFOQUE — qué estudiar, según lo que piden las vacantes que le sirven.
 *
 * La idea es suya: si dos o tres vacantes piden lo mismo, eso es lo relevante.
 * Lo que se enseña no son etiquetas sueltas («Docker») sino las frases reales
 * de los anuncios, porque una lista de estudio hecha de palabras no dice qué
 * hay que saber de cada cosa.
 */

const TopicRow = ({ topic, total }: { topic: FocusTopic; total: number }) => (
  <Box>
    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="subtitle1">{topic.name}</Typography>
      <AppChip label={`${topic.vacancies} de ${total}`} tone={topic.vacancies >= total / 3 ? 'success' : 'neutral'} />
      <Typography variant="caption" color="textSecondary">{topic.share}% de las vacantes</Typography>
    </Stack>
    <LinearProgress variant="determinate" value={topic.share} sx={{ my: 0.75, height: 6, borderRadius: 3 }} />
    {topic.examples.map((example) => (
      <Typography key={example} variant="body2" color="textSecondary" sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider', mb: 0.5 }}>
        {example}
      </Typography>
    ))}
  </Box>
);

const FocusPage = () => {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFocus()
      .then(setFocus)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const toStudy = focus?.topics.filter((t) => !t.known) ?? [];
  const known = focus?.topics.filter((t) => t.known) ?? [];

  return (
    <PageContainer
      title="Enfoque"
      subtitle="Lo que piden en común las vacantes que te sirven"
      breadcrumbs={[{ title: 'Enfoque' }]}
    >
      <Stack spacing={3}>
        {error ? <AppAlert severity="error">{error}</AppAlert> : null}

        {focus && focus.analysed === 0 ? (
          <AppAlert severity="info">
            Todavía no hay ofertas aceptadas que analizar. Esto se llena solo con las búsquedas.
          </AppAlert>
        ) : null}

        {focus && focus.analysed > 0 ? (
          <>
            <Typography variant="body2" color="textSecondary">
              Sobre <strong>{focus.analysed} vacantes aceptadas</strong>. Solo cuenta lo aceptado: las
              descartadas piden C# o inglés avanzado, y contarlas convertiría esto en una lista de lo
              que no quieres hacer. Cada tema cuenta <strong>una vez por vacante</strong>, no por
              menciones.
            </Typography>

            <BlankCard>
              <Stack spacing={2.5} p={3}>
                <Box>
                  <Typography variant="h5">Para estudiar</Typography>
                  {/* La honestidad del título importa: lo que esto sabe es que
                      no está en su perfil, no que no lo sepa. Git sale aquí
                      porque el perfil lista tecnologías, no prácticas. */}
                  <Typography variant="body2" color="textSecondary">
                    Lo que piden y no está en tu perfil. Puede que algo ya lo hagas: el perfil lista
                    tecnologías, no prácticas — si es tu caso, añádelo ahí y dejará de salir aquí.
                  </Typography>
                </Box>
                {toStudy.length
                  ? toStudy.map((topic) => <TopicRow key={topic.name} topic={topic} total={focus.analysed} />)
                  : <Typography variant="body2">Nada se repite en dos vacantes todavía.</Typography>}
              </Stack>
            </BlankCard>

            <BlankCard>
              <Stack spacing={2.5} p={3}>
                <Box>
                  <Typography variant="h5">Lo que ya tienes</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Está en tu perfil y lo piden. Esto es lo que conviene tener fresco para una
                    entrevista, y lo que vale la pena nombrar en la motivación.
                  </Typography>
                </Box>
                {known.map((topic) => <TopicRow key={topic.name} topic={topic} total={focus.analysed} />)}
              </Stack>
            </BlankCard>
          </>
        ) : null}
      </Stack>
    </PageContainer>
  );
};

export default FocusPage;
