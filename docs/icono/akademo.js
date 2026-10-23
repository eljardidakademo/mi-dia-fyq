const fs = require('fs');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const TINTA = b64('logo_tinta.png'), BLANCO = b64('logo_blanco.png');
// Hoja de calendario con el búho de la academia, centrada.
module.exports = function svg({ tam = 1024, escala = 1, fondo = '#2350D8', mono = false } = {}) {
  const k = escala * (tam / 1024);
  // Centro de la hoja con sus anillas (x 212–812, y 180–852).
  const ox = tam / 2 - 512 * k, oy = tam / 2 - 516 * k;
  const hoja = mono
    ? `<rect x="222" y="242" width="580" height="600" rx="70" fill="none" stroke="#fff" stroke-width="28"/>
       <rect x="222" y="242" width="580" height="130" rx="60" fill="#fff"/>`
    : `<rect x="212" y="232" width="600" height="620" rx="76" fill="#fff"/>
       <path d="M212 308 Q212 232 288 232 L736 232 Q812 232 812 308 L812 372 L212 372 Z" fill="#13233F"/>`;
  const anillas = [370, 654].map((x) =>
    `<rect x="${x - 26}" y="180" width="52" height="120" rx="26" fill="${mono ? '#fff' : '#FFFFFF'}" stroke="${mono ? 'none' : '#13233F'}" stroke-width="${mono ? 0 : 16}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">
  ${fondo ? `<rect width="${tam}" height="${tam}" fill="${fondo}"/>` : ''}
  <g transform="translate(${ox} ${oy}) scale(${k})">
    ${hoja}${anillas}
    <!-- El logo original llega recortado por los bordes: se recorta en círculo y se repasa el borde. -->
    <clipPath id="logo"><circle cx="512" cy="612" r="200"/></clipPath>
    <image href="${mono ? BLANCO : TINTA}" x="302" y="402" width="420" height="420" clip-path="url(#logo)"/>
    <circle cx="512" cy="612" r="198" fill="none" stroke="${mono ? '#fff' : '#13233F'}" stroke-width="10"/>
  </g>
</svg>`;
};
