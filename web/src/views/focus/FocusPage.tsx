import { useEffect, useState } from 'react';
import { Box, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { getFocus, markFocusSeen, type Focus, type FocusTopic } from '../../api/client';
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
  // Resaltado con un borde y un fondo tenue, no con el texto en otro color:
  // lo que hay que poder leer de un vistazo es CUÁL es nuevo, y eso se ve
  // antes por la forma del bloque que por el tono de una palabra.
  <Box sx={topic.isNew ? { pl: 1.5, py: 1, borderLeft: 3, borderColor: 'success.main', bgcolor: 'action.hover', borderRadius: 1 } : undefined}>
    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="subtitle1">{topic.name}</Typography>
      {topic.isNew ? <AppChip label="nuevo" tone="success" /> : null}
      {/* El mismo número estaba escrito tres veces: «9 de 15», «60% de las
          vacantes» y la barra. Se queda el dato exacto y la barra, que es lo
          que deja comparar 39 filas de un vistazo sin leer ninguna. */}
      <AppChip label={`${topic.vacancies} de ${total}`} tone={topic.vacancies >= total / 3 ? 'success' : 'neutral'} />
    </Stack>
    <LinearProgress variant="determinate" value={topic.share} sx={{ my: 0.75, height: 6, borderRadius: 3 }} />
    {topic.examples.map((example) => (
      <Typography key={example} variant="body2" color="textSecondary" sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider', mb: 0.5 }}>
        {example}
      </Typography>
    ))}
  </Box>
);

/**
 * La ventana vive AQUÍ y no en Configuración, y la diferencia importa: esto no
 * cambia qué se guarda —de eso se encarga el filtro de la búsqueda— sino con
 * cuánto pasado se mira lo ya guardado. Es una lente, y las lentes se cambian
 * mirando.
 */
const WINDOWS = [3, 6, 12, 24];

const FocusPage = () => {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    getFocus(months)
      .then(setFocus)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [months]);

  /*
   * AL SALIR, no al entrar.
   *
   * Marcarlo al entrar apagaría el resaltado en el mismo instante en que se
   * dibuja: el aviso existiría en la base de datos y nunca en la pantalla.
   * Se marca al desmontar, que es cuando él ya ha tenido la página delante.
   *
   * Sin dependencias a propósito: cambiar la ventana no cuenta como salir.
   */
  useEffect(() => () => { void markFocusSeen().catch(() => undefined); }, []);

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
            {/* Dos frases cortas y no un párrafo: esto se lee una vez, para
                saber de dónde sale el número, y luego se mira la lista. */}
            <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="textSecondary">
                  Sobre <strong>{focus.analysed} vacantes aceptadas</strong>, contando cada tema una
                  vez por vacante.
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Las frases son de los anuncios, tal cual las escribieron.
                </Typography>
              </Stack>
              <TextField
                select
                size="small"
                label="Ventana"
                value={months}
                onChange={(event) => setMonths(Number(event.target.value))}
                sx={{ minWidth: 160 }}
              >
                {WINDOWS.map((option) => (
                  <MenuItem key={option} value={option}>{`Últimos ${option} meses`}</MenuItem>
                ))}
              </TextField>
            </Stack>

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
            {/* ═══ LO QUE NADIE CLASIFICÓ ═══
                El catálogo de temas es la fuerza y el agujero de esta página:
                lo que no está en él no se detecta por mucho que lo pidan. Esto
                lo cierra por el otro lado, buscando cualquier palabra que se
                repita y no tengamos. Va aparte y no mezclado con los temas
                porque lo de arriba está curado y esto es materia prima. */}
            {focus.emerging.length ? (
              <BlankCard>
                <Stack spacing={2} p={3}>
                  <Box>
                    <Typography variant="h5">Apareciendo</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Palabras que se repiten en los requisitos y que todavía no se miden arriba. Esto
                      sale solo, sin que nadie las haya previsto: si algo nuevo empieza a pedirse,
                      asoma aquí primero.
                    </Typography>
                  </Box>
                  {focus.emerging.map((item) => (
                    <Box
                      key={item.term}
                      sx={item.isNew ? { pl: 1.5, py: 1, borderLeft: 3, borderColor: 'success.main', bgcolor: 'action.hover', borderRadius: 1 } : undefined}
                    >
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="subtitle1">{item.term}</Typography>
                        <AppChip label={`${item.vacancies} de ${focus.analysed}`} tone="neutral" />
                        {item.isNew ? <AppChip label="nuevo" tone="success" /> : null}
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
