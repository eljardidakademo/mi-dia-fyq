import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { textos, type Idioma, type Textos, type TemaId } from '../i18n/textos';

// Paleta fría de laboratorio del panel web: fondo gris azulado, tinta azul marino, acento cobalto.
const laboratorioClaro = {
  oscuro: false,
  fondo: '#EEF2F6',
  superficie: '#FFFFFF',
  superficie2: '#F5F7FA',
  borde: '#D5DDE7',
  tinta: '#13233F',
  tinta2: '#4A5A75',
  tenue: '#8693A8',
  acento: '#2350D8',
  acentoSuave: '#E3EAFC',
  sobreAcento: '#FFFFFF',
  rojo: '#C8322B',
  rojoSuave: '#FBE6E4',
  verde: '#1E8A4C',
  verdeSuave: '#E0F3E8',
  azul: '#2350D8',
  azulSuave: '#E3EAFC',
  ambar: '#9A6200',
  ambarSuave: '#FCF0D9',
  /** Un color por grupo (fondo de la ficha y código). Vacío: todas iguales. */
  grupos: [] as { color: string; fondo: string }[],
};

export type Colores = typeof laboratorioClaro;

const laboratorioOscuro: Colores = {
  oscuro: true,
  fondo: '#0E1522',
  superficie: '#172033',
  superficie2: '#1D283D',
  borde: '#2B3851',
  tinta: '#E4EAF4',
  tinta2: '#AEB9CC',
  tenue: '#77849B',
  acento: '#7C9BFF',
  acentoSuave: '#22305A',
  sobreAcento: '#0E1522',
  rojo: '#FF7B72',
  rojoSuave: '#3A1F24',
  verde: '#5AD08A',
  verdeSuave: '#18342A',
  azul: '#7C9BFF',
  azulSuave: '#22305A',
  ambar: '#F2B64C',
  ambarSuave: '#3A2E17',
  grupos: [],
};

// Blanco y aireado: menos contraste en los bordes, tinta gris pizarra y acento verde azulado.
const claro: Colores = {
  oscuro: false,
  fondo: '#FFFFFF',
  superficie: '#FFFFFF',
  superficie2: '#F7F8FA',
  borde: '#E6E9EE',
  tinta: '#1F2933',
  tinta2: '#52606D',
  tenue: '#9AA5B1',
  acento: '#0F7B8A',
  acentoSuave: '#E3F4F6',
  sobreAcento: '#FFFFFF',
  rojo: '#C43D3D',
  rojoSuave: '#FCECEC',
  verde: '#2F8F5B',
  verdeSuave: '#E7F5EC',
  azul: '#2F6FD0',
  azulSuave: '#E8F0FC',
  ambar: '#A0670A',
  ambarSuave: '#FDF3E1',
  grupos: [],
};

// Cálido, con un color propio para cada grupo.
const colorido: Colores = {
  oscuro: false,
  fondo: '#FFF6EC',
  superficie: '#FFFFFF',
  superficie2: '#FFF0E0',
  borde: '#F2D9BF',
  tinta: '#2B1846',
  tinta2: '#5E4A78',
  tenue: '#A08DB5',
  acento: '#D6336C',
  acentoSuave: '#FDE4EE',
  sobreAcento: '#FFFFFF',
  rojo: '#E03131',
  rojoSuave: '#FFE3E3',
  verde: '#2B9348',
  verdeSuave: '#E2F6E6',
  azul: '#1C7ED6',
  azulSuave: '#E0EFFD',
  ambar: '#E67700',
  ambarSuave: '#FFF0D6',
  grupos: [
    { color: '#7048E8', fondo: '#EEE8FF' },
    { color: '#1C7ED6', fondo: '#E0EFFD' },
    { color: '#0CA678', fondo: '#DDF7EE' },
    { color: '#E67700', fondo: '#FFF0D6' },
    { color: '#D6336C', fondo: '#FDE4EE' },
    { color: '#0B7285', fondo: '#DDF3F7' },
  ],
};

export const TEMAS: TemaId[] = ['laboratorio', 'claro', 'colorido', 'noche'];

export function coloresDe(tema: TemaId, sistemaOscuro: boolean): Colores {
  switch (tema) {
    case 'claro':
      return claro;
    case 'colorido':
      return colorido;
    case 'noche':
      return laboratorioOscuro;
    default:
      return sistemaOscuro ? laboratorioOscuro : laboratorioClaro;
  }
}

export const fuentes = {
  titulo: 'FamiljenGrotesk_700Bold',
  tituloMedio: 'FamiljenGrotesk_600SemiBold',
  texto: 'AtkinsonHyperlegible_400Regular',
  textoNegrita: 'AtkinsonHyperlegible_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoNegrita: 'JetBrainsMono_700Bold',
};

/** Colores del tema elegido (Laboratorio sigue el modo claro/oscuro del móvil). */
export function useColoresDe(tema: TemaId): Colores {
  return coloresDe(tema, useColorScheme() === 'dark');
}

// Idioma elegido, disponible en cualquier componente sin pasarlo de mano en mano.
const ContextoIdioma = createContext<Idioma>('es');
export const ProveedorIdioma = ContextoIdioma.Provider;
export const useIdioma = () => useContext(ContextoIdioma);
export const useTextos = (): Textos => textos(useContext(ContextoIdioma));

/** Rojo si va retrasado, azul si va adelantado, verde si va al día. */
export function colorRitmo(c: Colores, ritmo: string | number): { color: string; fondo: string } {
  const n = typeof ritmo === 'number' ? ritmo : /retras/i.test(ritmo) ? -1 : /adelant/i.test(ritmo) ? 1 : 0;
  if (n < 0) return { color: c.rojo, fondo: c.rojoSuave };
  if (n > 0) return { color: c.azul, fondo: c.azulSuave };
  return { color: c.verde, fondo: c.verdeSuave };
}

/** Color fijo de un grupo según su posición en la configuración del docente, si el tema los usa. */
export function colorGrupo(c: Colores, indice: number): { color: string; fondo: string } | null {
  if (!c.grupos.length || indice < 0) return null;
  return c.grupos[indice % c.grupos.length];
}
