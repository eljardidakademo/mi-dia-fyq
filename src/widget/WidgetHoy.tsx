import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { DatosWidget } from '../avisos/contenido';
import { textos, type Idioma } from '../i18n/textos';
import { colorRitmo, type Colores } from '../ui/tema';

export const NOMBRE_WIDGET = 'MiDiaHoy';

const col = (x: string) => x as ColorProp;

type Props = { d: DatosWidget; c: Colores; idioma: Idioma; actualizando?: boolean };

/** Widget del escritorio: clase de ahora o siguiente, y lo urgente. Tocarlo abre la app; ↻ lo actualiza. */
export function WidgetHoy({ d, c, idioma, actualizando }: Props) {
  const t = textos(idioma);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: col(c.superficie),
        borderRadius: 18,
        borderWidth: 1,
        borderColor: col(c.borde),
        padding: 12,
        flexDirection: 'column',
        flexGap: 6,
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextWidget
          text={d.tipo === 'dia' ? d.fechaTexto : 'Mi día FyQ'}
          style={{ fontSize: 13, fontWeight: 'bold', color: col(c.tinta2) }}
        />
        <TextWidget
          text={actualizando ? '…' : '↻'}
          clickAction="ACTUALIZAR"
          style={{ fontSize: 18, color: col(c.acento), paddingHorizontal: 6 }}
        />
      </FlexWidget>

      {d.tipo === 'sinDatos' ? (
        <TextWidget text={t.widgetSinDatos} style={{ fontSize: 15, color: col(c.tinta) }} />
      ) : d.clase ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
          <FlexWidget
            style={{
              width: 58,
              height: 58,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: col(d.clase.ritmo ? colorRitmo(c, d.clase.ritmo).color : c.borde),
              backgroundColor: col(c.superficie2),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget text={d.clase.codigo} style={{ fontSize: 18, fontWeight: 'bold', color: col(c.tinta) }} />
            <TextWidget text={d.clase.aula} style={{ fontSize: 10, color: col(c.tinta2) }} />
          </FlexWidget>
          <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
            <TextWidget
              text={`${d.etiqueta.toUpperCase()} · ${d.clase.inicio}–${d.clase.fin}`}
              style={{ fontSize: 11, fontWeight: 'bold', color: col(c.acento) }}
            />
            <TextWidget text={d.clase.grupo} style={{ fontSize: 16, fontWeight: 'bold', color: col(c.tinta) }} maxLines={1} truncate="END" />
            {!!d.clase.toca && (
              <TextWidget text={d.clase.toca} style={{ fontSize: 13, color: col(c.tinta2) }} maxLines={2} truncate="END" />
            )}
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', flexGap: 2 }}>
          <TextWidget text={t.sinMasClases} style={{ fontSize: 16, fontWeight: 'bold', color: col(c.tinta) }} />
          {!!d.despues && <TextWidget text={d.despues} style={{ fontSize: 13, color: col(c.tinta2) }} />}
        </FlexWidget>
      )}

      {d.tipo === 'dia' && (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'column',
            backgroundColor: col(d.urgente.length ? c.ambarSuave : c.verdeSuave),
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <TextWidget
            text={d.urgente.length ? d.urgente.join(' · ') : t.nadaUrgente}
            style={{ fontSize: 12, color: col(d.urgente.length ? c.ambar : c.verde) }}
            maxLines={2}
            truncate="END"
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
