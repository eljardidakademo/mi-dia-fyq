# Icono de la app

Hoja de calendario (planificación del día) con el búho de ElJardi d'Akademo, centrada. Borja pidió quitar la marca verde de «hecho» (23/10).

- `logo_tinta.png` / `logo_blanco.png`: el logo de la academia con fondo transparente (azul marino y blanco).
- `akademo.js`: dibuja el icono en SVG; `render2.js` lo pasa a los PNG de `assets/` con Playwright (Chromium).
- Tamaños: `icon.png` 1024, Android adaptable 512 (dibujo al 72 % y centrado en la hoja, para que quepa en la zona visible de 72 dp en círculo, squircle o cuadrado), monocromo 432 (también es el icono de las notificaciones).

Para otras apps de la academia: mismo búho y estilo, cambiando el dibujo de fuera. El logo original llega recortado por los bordes: se recorta en círculo y se le repasa el borde.
