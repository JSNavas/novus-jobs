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
      title="Descartadas por el filtro"
      subtitle="No encajaban con tu perfil. Cada una dice por qué se descartó"
      breadcrumbs={[{ title: 'Dashboard', to: '/' }, { title: 'Descartadas por el filtro' }]}
    >
      <JobList query={query} empty="El filtro no ha descartado nada todavía." />
    </PageContainer>
  );
};

export default RejectedPage;
