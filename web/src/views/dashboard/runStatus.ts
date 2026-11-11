import { RunStatus, type RunInfo } from '../../types';
import type { AppStatusTone } from '../../components/ui';

export const runStatusTone = (run: RunInfo): AppStatusTone => {
  if (run.status === RunStatus.Error) return 'error';
  if (run.status === RunStatus.Running) return 'neutral';
  return 'success';
};

export const runStatusLabel = (run: RunInfo): string => {
  if (run.status === RunStatus.Error) return 'Falló';
  if (run.status === RunStatus.Running) return 'En curso';
  return 'Correcta';
};
