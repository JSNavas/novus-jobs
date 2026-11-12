import { readlinkSync } from 'node:fs';
import { join } from 'node:path';

export function profileLockHolder(profileDir: string): number | null {
  let target: string;
  try {
    target = readlinkSync(join(profileDir, 'SingletonLock'));
  } catch {
    return null;
  }
  const pid = Number(target.split('-').pop());
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return pid;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM' ? pid : null;
  }
}

export function isProfileBusy(profileDir: string): boolean {
  return profileLockHolder(profileDir) !== null;
}
