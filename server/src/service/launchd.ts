import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../config.js';

/**
 * Servicio de usuario de macOS (launchd). Mismo patrón que el instalador de
 * Clauxy: RunAtLoad + KeepAlive, y launchd relanza el proceso si cae. Solo macOS.
 */
const LABEL = 'com.novus.job-dashboard';

interface PlistInput {
  label: string;
  nodePath: string;
  entryPath: string;
  workingDir: string;
  logFile: string;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderPlist(input: PlistInput): string {
  const logFile = escapeXml(input.logFile);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>${escapeXml(input.label)}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${escapeXml(input.nodePath)}</string>
        <string>${escapeXml(input.entryPath)}</string>
    </array>
    <key>WorkingDirectory</key><string>${escapeXml(input.workingDir)}</string>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>${logFile}</string>
    <key>StandardErrorPath</key><string>${logFile}</string>
</dict>
</plist>
`;
}

function plistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
}

function guiDomain(): string {
  const uid = process.getuid?.();
  if (uid === undefined) throw new Error('no se puede leer el uid del usuario');
  return `gui/${uid}`;
}

function launchctl(args: readonly string[]): { ok: boolean; output: string } {
  const result = spawnSync('launchctl', [...args], { encoding: 'utf8' });
  return { ok: result.status === 0, output: `${result.stderr}${result.stdout}`.trim() };
}

function requireMac(): void {
  if (process.platform !== 'darwin') throw new Error('el servicio solo está soportado en macOS');
}

function install(): void {
  requireMac();
  const config = loadConfig();
  const logFile = join(config.dataDir, 'logs', 'server.log');
  mkdirSync(join(config.dataDir, 'logs'), { recursive: true });
  mkdirSync(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
  writeFileSync(plistPath(), renderPlist({
    label: LABEL,
    nodePath: process.execPath,
    entryPath: join(config.serverRoot, 'dist', 'index.js'),
    workingDir: config.serverRoot,
    logFile,
  }));
  launchctl(['bootout', guiDomain(), plistPath()]);
  const up = launchctl(['bootstrap', guiDomain(), plistPath()]);
  if (!up.ok) throw new Error(`launchctl rechazó el servicio: ${up.output}`);
  console.log(`servicio instalado: ${LABEL} (logs en ${logFile})`);
}

function uninstall(): void {
  requireMac();
  launchctl(['bootout', guiDomain(), plistPath()]);
  if (existsSync(plistPath())) unlinkSync(plistPath());
  console.log(`servicio eliminado: ${LABEL}`);
}

function restart(): void {
  requireMac();
  const result = launchctl(['kickstart', '-k', `${guiDomain()}/${LABEL}`]);
  if (!result.ok) throw new Error(`no se pudo reiniciar el servicio (¿instalado?): ${result.output}`);
  console.log(`servicio reiniciado: ${LABEL}`);
}

function main(): void {
  const action = process.argv[2];
  if (action === 'install') return install();
  if (action === 'uninstall') return uninstall();
  if (action === 'restart') return restart();
  throw new Error('uso: launchd.js install | uninstall | restart');
}

if (process.argv[1]?.endsWith('launchd.js')) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
