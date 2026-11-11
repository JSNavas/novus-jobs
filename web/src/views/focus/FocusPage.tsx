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
            Todavía no hay ofertas aceptadas de los últimos meses que analizar. Esto se llena solo
            con las búsquedas.
          </AppAlert>
        ) : null}

        {focus && focus.analysed > 0 ? (
          <>
            <Typography variant="body2" color="textSecondary">
              Sobre <strong>{focus.analysed} vacantes aceptadas</strong> de los últimos{' '}
              <strong>{Math.round(focus.windowDays / 30)} meses</strong>. Solo cuenta lo aceptado: las
              descartadas piden C# o inglés avanzado, y contarlas convertiría esto en una lista de lo
              que no quieres hacer. Cada tema cuenta <strong>una vez por vacante</strong>, no por
              menciones.
            </Typography>

            {/* UNA SOLA LISTA. Estuvo partida en «para estudiar» y «lo que ya
                tienes», y la división sobraba: el stack ya hizo de filtro al
                decidir QUÉ VACANTES entran, así que separar otra vez por lo
                que él sabe era filtrar dos veces por lo mismo. Lo que se viene
                a ver aquí es qué piden los requisitos, lo sepa o no. */}
            <BlankCard>
              <Stack spacing={2.5} p={3}>
                <Typography variant="h5">Qué están pidiendo las vacantes</Typography>
                {focus.topics.length
                  ? focus.topics.map((topic) => <TopicRow key={topic.name} topic={topic} total={focus.analysed} />)
                  : <Typography variant="body2">Nada se repite en dos vacantes todavía.</Typography>}
              </Stack>
            </BlankCard>
          </>
        ) : null}
      </Stack>
    </PageContainer>
  );
};

export default FocusPage;
