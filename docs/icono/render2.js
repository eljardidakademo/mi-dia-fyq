const { chromium } = require('/opt/node-tools/node_modules/playwright');
const svg = require('./akademo.js') /* lienzo: docs/icono */;
const fs = require('fs');
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch());
  const p = await b.newPage();
  const out = async (name, opts, transparent) => {
    fs.writeFileSync(name + '.svg', svg(opts));
    await p.setViewportSize({ width: opts.tam, height: opts.tam });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(opts)}</body></html>`);
    await p.screenshot({ path: name + '.png', omitBackground: transparent, clip: { x: 0, y: 0, width: opts.tam, height: opts.tam } });
  };
  await out('icon', { tam: 1024, escala: 0.92 }, false);
  await out('android-icon-foreground', { tam: 512, escala: 0.78, fondo: null }, true);
  await out('android-icon-background', { tam: 512, escala: 0, fondo: '#2350D8' }, false);
  await out('android-icon-monochrome', { tam: 432, escala: 0.78, fondo: null, mono: true }, true);
  await out('splash-icon', { tam: 1024, escala: 0.9, fondo: null }, true);
  await out('favicon', { tam: 48, escala: 0.92 }, false);
  await b.close();
})();
