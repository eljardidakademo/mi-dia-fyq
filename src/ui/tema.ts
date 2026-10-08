import { useColorScheme } from 'react-native';

// Paleta fría de laboratorio del panel web: fondo gris azulado, tinta azul marino, acento cobalto.
const claro = {
  fondo: '#EEF2F6',
  superficie: '#FFFFFF',
  superficie2: '#F5F7FA',
  borde: '#D5DDE7',
  tinta: '#13233F',
  tinta2: '#4A5A75',
  tenue: '#8693A8',
  acento: '#2350D8',
  acentoSuave: '#E3EAFC',
  rojo: '#C8322B',
  rojoSuave: '#FBE6E4',
  verde: '#1E8A4C',
  verdeSuave: '#E0F3E8',
  azul: '#2350D8',
  azulSuave: '#E3EAFC',
  ambar: '#9A6200',
  ambarSuave: '#FCF0D9',
};

const oscuro: typeof claro = {
  fondo: '#0E1522',
  superficie: '#172033',
  superficie2: '#1D283D',
  borde: '#2B3851',
  tinta: '#E4EAF4',
  tinta2: '#AEB9CC',
  tenue: '#77849B',
  acento: '#7C9BFF',
  acentoSuave: '#22305A',
  rojo: '#FF7B72',
  rojoSuave: '#3A1F24',
  verde: '#5AD08A',
  verdeSuave: '#18342A',
  azul: '#7C9BFF',
  azulSuave: '#22305A',
  ambar: '#F2B64C',
  ambarSuave: '#3A2E17',
};

export type Colores = typeof claro;

export const fuentes = {
  titulo: 'FamiljenGrotesk_700Bold',
  tituloMedio: 'FamiljenGrotesk_600SemiBold',
  texto: 'AtkinsonHyperlegible_400Regular',
  textoNegrita: 'AtkinsonHyperlegible_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoNegrita: 'JetBrainsMono_700Bold',
};

export function useColores(): Colores {
  return useColorScheme() === 'dark' ? oscuro : claro;
}

/** Rojo si va retrasado, azul si va adelantado, verde si va al día. */
export function colorRitmo(c: Colores, ritmo: string | number): { color: string; fondo: string } {
  const n = typeof ritmo === 'number' ? ritmo : /retras/i.test(ritmo) ? -1 : /adelant/i.test(ritmo) ? 1 : 0;
  if (n < 0) return { color: c.rojo, fondo: c.rojoSuave };
  if (n > 0) return { color: c.azul, fondo: c.azulSuave };
  return { color: c.verde, fondo: c.verdeSuave };
}
