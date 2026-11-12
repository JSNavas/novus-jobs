import { t } from '../../i18n';
import { useMemo } from 'react';
import type { JobQuery } from '../../api/client';
import { PageContainer } from '../../components/ui';
import { JobVerdict } from '../../types';
import JobList from '../jobs/JobList';

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
