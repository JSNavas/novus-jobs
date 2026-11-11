import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AppAlert, AppChip, BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import { jobLocationLabel, jobSourceLabel, jobStatusLabel } from '../../labels';
import { JobLocation, JobSeniority, JobStatus, JobVerdict, type Job } from '../../types';
import type { Settings } from '../../api/client';
import { gmailComposeUrl, motivationLetter, shouldOfferApplication } from './apply';
import RejectionBadge from './RejectionBadge';

interface JobCardProps {
  job: Job;
  busy: boolean;
  settings: Settings | null;
  onStatusChange: (status: JobStatus) => void;
}

const statusActions: { status: JobStatus; label: string; variant: 'contained' | 'outlined' | 'text' }[] = [
  { status: JobStatus.New, label: 'Marcar como nueva', variant: 'text' },
  { status: JobStatus.Seen, label: 'Marcar como vista', variant: 'outlined' },
  // Con borde como el resto, y no relleno. En su bloque de antes era la acción
  // principal; en la fila común el relleno es de "Postularse", y dos botones
  // rellenos compiten por el mismo sitio en la mirada.
  { status: JobStatus.Saved, label: 'Guardar', variant: 'outlined' },
  { status: JobStatus.Dismissed, label: 'Descartar', variant: 'text' },
];

/**
 * El botón tiene que decir A DÓNDE lleva.
 *
 * LinkedIn no expone el enlace permanente de una publicación, así que hay una
 * cadena de respaldo: enlace del post → enlace externo de la oferta → perfil
 * de quien publica. Pero el botón decía siempre "Ver publicación", y al pulsar
 * te plantaba en el perfil de una persona. El respaldo está bien; mentir sobre
 * él, no.
 */
const linkLabel = (url: string): string => {
  if (/\/(feed\/update|posts)\//.test(url)) return 'Ver publicación';
  if (/linkedin\.com\/in\//.test(url)) return 'Ver perfil de quien publica';
  if (/linkedin\.com\/(company|school)\//.test(url)) return 'Ver página de la empresa';
  return 'Abrir enlace de la oferta';
};

const locationText = (job: Job): string => {
  const hasReason = job.locationKind === JobLocation.OtherCountry || job.locationKind === JobLocation.Onsite;
  return hasReason ? (job.location ?? jobLocationLabel[job.locationKind]) : jobLocationLabel[job.locationKind];
};

const COLLAPSED_HEIGHT = 140;
/** Cuánto se queda el botón diciendo "Copiado" antes de volver a su texto. */
const COPIED_FEEDBACK_MS = 2000;

const JobCard = ({ job, busy, settings, onStatusChange }: JobCardProps) => {
  const [expanded, setExpanded] = useState(false);
  // El botón "ver más" solo tiene sentido si hay algo escondido. Salía siempre,
  // así que en una oferta corta se pulsaba y no pasaba nada — y un botón que no
  // hace nada parece una aplicación rota.
  const textRef = useRef<HTMLPreElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node) return;
    setOverflows(node.scrollHeight > COLLAPSED_HEIGHT + 4);
  }, [job.text]);

  // ═══ EL CORREO NO PUEDE DEPENDER DE UN CLIENTE DE CORREO ═══
  //
  // El botón era un `mailto:` a secas. En un Mac sin app de correo por defecto
  // —lo normal si se usa Gmail en el navegador— pulsarlo no hace NADA: ni
  // abre, ni avisa, ni falla. Un botón que no hace nada no es un botón.
  //
  // Así que la acción principal es copiar la dirección, que funciona siempre,
  // y abrir el cliente queda como opción secundaria.
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [lettered, setLettered] = useState(false);

  /**
   * Lo que se le pasa a otra persona: el enlace si lo hay, y si no el texto de
   * la oferta con el enlace que tengamos. LinkedIn no siempre deja el enlace de
   * la publicación, y quedarse sin poder compartir por eso sería absurdo.
   */
  const share = async (): Promise<void> => {
    const parts = [job.title, job.text, job.url].filter(Boolean) as string[];
    try {
      await navigator.clipboard.writeText(parts.join('\n\n'));
      setShared(true);
      setTimeout(() => setShared(false), COPIED_FEEDBACK_MS);
    } catch {
      setShared(false);
    }
  };

  /**
   * El «¿por qué te interesa trabajar aquí?» de la postulación, ya adaptado a
   * esta oferta. Se copia en vez de abrirse en un cuadro: el destino es un
   * formulario en otra pestaña, y lo único que hace falta ahí es pegar.
   */
  const copyLetter = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(motivationLetter(job));
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
      // Sin permiso de portapapeles la dirección sigue a la vista, escrita al
      // lado del botón: se puede seleccionar a mano.
      setCopied(false);
    }
  };


  const actions = statusActions.filter((action) => action.status !== job.status);
  const canApplyByEmail = !job.applyUrl && shouldOfferApplication(job);

  /**
   * La línea de contacto. En una junior se enseña el correo pero NO se ofrece
   * escribir: él no se postula a esas, y decir "sin enlace ni correo" cuando el
   * anuncio trae uno era mentirle justo en la oferta que pide pasarla a otro.
   */
  const contactLine = job.applyUrl
    ? `Postularse en: ${job.applyUrl}`
    : job.contactEmail
      ? `${canApplyByEmail ? 'Enviar CV a' : 'Contacto'}: ${job.contactEmail}`
      : 'Sin enlace ni correo — hay que responder por LinkedIn';

  return (
    <BlankCard>
      <Stack spacing={1.5} p={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} flexWrap="wrap">
          <Box>
            <Typography variant="h5">{job.title ?? 'Sin título'}</Typography>
            {/* DE DÓNDE SALIÓ, lo primero de la línea. Con dos plataformas
                —y con la vía de postulación cambiando según cuál sea— saber si
                una oferta viene de LinkedIn o de Get on Board deja de ser un
                detalle: es lo que dice si hay que responder a un recruiter o
                rellenar un formulario. */}
            <Typography variant="subtitle2" color="textSecondary">
              {[jobSourceLabel(job.source), job.company, formatDateTime(job.foundAt)].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {job.isUncertain ? <AppChip label="Por confirmar" tone="warning" /> : null}
            {job.verdict === JobVerdict.Rejected ? <AppChip label="Descartada por el filtro" tone="error" /> : null}
            <AppChip label={jobStatusLabel[job.status]} />
          </Stack>
        </Stack>

        {/* THE DISCARD REASON, IN SIGHT.
            It was stored from the start and shown nowhere, so auditing it meant
            opening the database. A criterion you can't read can't be corrected,
            and the one error that really matters — a good offer thrown out — is
            only visible here. */}
        {job.rejectionReason ? <RejectionBadge reason={job.rejectionReason} /> : null}

        <Typography variant="body2">Publicado por {job.author ?? 'autor desconocido'}</Typography>
        {job.stackMatch.length > 0 ? (
          <Typography variant="body2">Coincide con: {job.stackMatch.join(', ')}</Typography>
        ) : null}
        <Typography variant="body2">Ubicación: {locationText(job)}</Typography>

        {/* ═══ LO QUE SE PUEDE HACER CON LA OFERTA ═══
            Una sola fila, no tres sueltas. Antes el contacto, el enlace y el
            compartir vivían en bloques distintos con estilos distintos, y
            "Copiar para compartir" acababa solo en una línea propia, colgando
            del resto. Las acciones de la oferta van juntas y jerarquizadas: la
            principal rellena, las de apoyo con borde, y las de bandeja al
            final. Debajo del anuncio solo queda "Ver más", que es lo único
            que habla del texto y no de la oferta. */}
        <Stack spacing={1}>
          {contactLine ? <Typography variant="body2">{contactLine}</Typography> : null}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {job.applyUrl ? (
              <Button variant="contained" component="a" href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                Postularse
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
                Redactar en Gmail
              </Button>
            ) : null}
            {/* Si el enlace de la publicación ES el de postulación, un segundo
                botón al mismo sitio solo hace dudar de cuál es cuál. Pasa a
                menudo: el `lnkd.in` que lleva a la oferta es también el único
                enlace que trae el post. */}
            {job.url && job.url !== job.applyUrl ? (
              <Button variant="outlined" component="a" href={job.url} target="_blank" rel="noopener noreferrer">
                {linkLabel(job.url)}
              </Button>
            ) : null}
            {/* Para pasarle la oferta a alguien: muchas publicaciones lo piden
                expresamente ("si conocés a alguien, pasale esta publicación"). */}
            {/* Solo donde se va a usar: él no se postula a las junior, así que
                ofrecerle la carta ahí es ofrecerle algo que no va a pegar. */}
            {job.seniority !== JobSeniority.Junior ? (
              <Button variant="outlined" onClick={() => void copyLetter()}>
                {lettered ? '✓ Copiada' : 'Copiar motivación'}
              </Button>
            ) : null}
            <Button variant="outlined" onClick={() => void share()}>
              {shared ? '✓ Copiado' : 'Copiar para compartir'}
            </Button>
            {job.contactEmail ? (
              <Button variant="outlined" onClick={() => void copyEmail()}>
                {copied ? '✓ Copiado' : 'Copiar correo'}
              </Button>
            ) : null}
            {/* Mover la oferta por la bandeja va en la MISMA fila. Estaba
                aparte, abajo del todo, separando "qué hago con la oferta" de
                "dónde la guardo": dos sitios distintos obligaban a recorrer la
                tarjeta entera para una acción de un clic. Van al final de la
                fila y con el peso visual más bajo, que es lo que mantiene la
                jerarquía sin partirla en dos bloques. */}
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                disabled={busy}
                onClick={() => onStatusChange(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </Stack>

        {job.isAggregator ? (
          <AppAlert severity="warning">VÍA AGREGADOR — no la publica quien contrata</AppAlert>
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
            {expanded ? 'Ver menos' : 'Ver más'}
          </Button>
        ) : null}

      </Stack>
    </BlankCard>
  );
};

export default JobCard;
