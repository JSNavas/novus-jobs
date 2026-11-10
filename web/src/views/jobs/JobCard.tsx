import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AppAlert, AppChip, BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import { jobLocationLabel, jobStatusLabel } from '../../labels';
import { JobLocation, JobStatus, type Job } from '../../types';
import type { Settings } from '../../api/client';
import { gmailComposeUrl, shouldOfferApplication } from './apply';

interface JobCardProps {
  job: Job;
  busy: boolean;
  settings: Settings | null;
  onStatusChange: (status: JobStatus) => void;
}

const statusActions: { status: JobStatus; label: string; variant: 'contained' | 'outlined' | 'text' }[] = [
  { status: JobStatus.New, label: 'Marcar como nueva', variant: 'text' },
  { status: JobStatus.Seen, label: 'Marcar como vista', variant: 'outlined' },
  { status: JobStatus.Saved, label: 'Guardar', variant: 'contained' },
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
            <Typography variant="subtitle2" color="textSecondary">
              {[job.company, formatDateTime(job.foundAt)].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {job.isUncertain ? <AppChip label="Por confirmar" tone="warning" /> : null}
            <AppChip label={jobStatusLabel[job.status]} />
          </Stack>
        </Stack>

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
            principal rellena, las de apoyo con borde. Lo de abajo es otra cosa
            —mover la oferta por la bandeja— y por eso sigue aparte. */}
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
            {job.url ? (
              <Button variant="outlined" component="a" href={job.url} target="_blank" rel="noopener noreferrer">
                {linkLabel(job.url)}
              </Button>
            ) : null}
            {/* Para pasarle la oferta a alguien: muchas publicaciones lo piden
                expresamente ("si conocés a alguien, pasale esta publicación"). */}
            <Button variant="outlined" onClick={() => void share()}>
              {shared ? '✓ Copiado' : 'Copiar para compartir'}
            </Button>
            {job.contactEmail ? (
              <Button variant="outlined" onClick={() => void copyEmail()}>
                {copied ? '✓ Copiado' : 'Copiar correo'}
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {job.isAggregator ? (
          <AppAlert severity="warning">VÍA AGREGADOR — no la publica quien contrata</AppAlert>
        ) : null}

        <Box
          component="pre"
          ref={textRef}
          sx={{
            m: 0,
            p: 2,
            borderRadius: 1,
            bgcolor: 'grey.100',
            fontFamily: 'monospace',
            fontSize: 13,
            whiteSpace: 'pre-wrap',
            maxHeight: expanded ? 'none' : COLLAPSED_HEIGHT,
            overflow: 'hidden',
          }}
        >
          {job.text}
        </Box>
        {overflows ? (
          <Button variant="text" onClick={() => setExpanded((value) => !value)} sx={{ alignSelf: 'flex-start' }}>
            {expanded ? 'Ver menos' : 'Ver más'}
          </Button>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap">
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
    </BlankCard>
  );
};

export default JobCard;
