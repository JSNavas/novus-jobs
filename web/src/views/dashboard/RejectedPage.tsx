import { t } from '../../i18n';
import { useMemo } from 'react';
import type { JobQuery } from '../../api/client';
import { PageContainer } from '../../components/ui';
import { JobVerdict } from '../../types';
import JobList from '../jobs/JobList';

/**
 * Lo que el filtro tiró, con su motivo.
 *
 * Es la pantalla de auditoría del criterio, y existe por lo que dice el README:
 * una oferta buena descartada por error es la que nunca sabrías que existió.
 * Guardar el descarte no sirve de nada si no hay dónde leerlo.
 *
 * No va en el menú de la bandeja a propósito: no es trabajo pendiente, es el
 * archivo del filtro. Se entra desde el dashboard, que es donde estaba la
 * pregunta ("¿y las otras setenta?").
 */
const RejectedPage = () => {
  const query = useMemo<JobQuery>(() => ({ verdict: JobVerdict.Rejected }), []);

  return (
    <PageContainer
      title={t('rejected.title')}
      subtitle={t('rejected.subtitle')}
      breadcrumbs={[{ title: t('dash.title'), to: '/' }, { title: t('rejected.title') }]}
    >
      <JobList query={query} empty={t('rejected.empty')} />
    </PageContainer>
  );
};

export default RejectedPage;
