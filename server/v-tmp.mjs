import { chromium } from 'playwright';
const b = await chromium.launch();
for (const u of [
  'https://app.remotelatinos.com/job/closser-id6af62492619e5d9aa6c8350c',
  'https://app.remotelatinos.com/jobs/6af62492619e5d9aa6c8350c',
]) {
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(6000);
  const txt = (await p.locator('body').innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 150);
  console.log('──', u.slice(30));
  console.log('   ', txt);
  await p.close();
}
await b.close();
