import { JobLocation, JobSeniority, JobStatus } from './types';

export const jobStatusLabel: Record<JobStatus, string> = {
  [JobStatus.New]: 'Nueva',
  [JobStatus.Seen]: 'Vista',
  [JobStatus.Saved]: 'Guardada',
  [JobStatus.Dismissed]: 'Descartada',
};

export const jobSeniorityLabel: Record<JobSeniority, string> = {
  [JobSeniority.Regular]: 'Para ti',
  [JobSeniority.Junior]: 'Extras (junior)',
};

export const jobLocationLabel: Record<JobLocation, string> = {
  [JobLocation.Venezuela]: 'Venezuela',
  [JobLocation.Global]: 'remoto global / LATAM',
  [JobLocation.OtherCountry]: 'remoto desde otro país',
  [JobLocation.Onsite]: 'presencial',
  [JobLocation.Unknown]: 'no dice desde dónde se puede trabajar',
};
