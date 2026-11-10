import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderPlist } from './launchd.js';

describe('renderPlist', () => {
  const plist = renderPlist({
    label: 'com.novus.job-dashboard',
    nodePath: '/opt/homebrew/bin/node',
    entryPath: '/srv/novus/server/dist/index.js',
    workingDir: '/srv/novus/server',
    logFile: '/srv/novus/server/data/logs/server.log',
  });

  it('arranca al cargar y se relanza si cae', () => {
    assert.match(plist, /<key>RunAtLoad<\/key><true\/>/);
    assert.match(plist, /<key>KeepAlive<\/key><true\/>/);
  });

  it('ejecuta node con el punto de entrada compilado y el directorio de trabajo', () => {
    assert.match(plist, /<string>\/opt\/homebrew\/bin\/node<\/string>\s*<string>\/srv\/novus\/server\/dist\/index\.js<\/string>/);
    assert.match(plist, /<key>WorkingDirectory<\/key><string>\/srv\/novus\/server<\/string>/);
  });

  it('manda stdout y stderr al log del servidor', () => {
    assert.equal((plist.match(/data\/logs\/server\.log/g) ?? []).length, 2);
  });

  it('escapa los caracteres XML de las rutas', () => {
    const escaped = renderPlist({
      label: 'x',
      nodePath: '/usr/bin/node',
      entryPath: '/tmp/a&b/<c>/index.js',
      workingDir: '/tmp/a&b',
      logFile: '/tmp/log',
    });
    assert.match(escaped, /\/tmp\/a&amp;b\/&lt;c&gt;\/index\.js/);
  });
});
