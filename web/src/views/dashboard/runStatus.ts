import { t } from '../../i18n';
import { RunStatus, type RunInfo } from '../../types';
import type { AppStatusTone } from '../../components/ui';

export const runStatusTone = (run: RunInfo): AppStatusTone => {
  if (run.status === RunStatus.Error) return 'error';
  if (run.status === RunStatus.Running) return 'neutral';
  return 'success';
};

export const runStatusLabel = (run: RunInfo): string => {
  if (run.status === RunStatus.Error) return t('run.failed');
  if (run.status === RunStatus.Running) return t('run.running');
  return t('run.ok');
};
