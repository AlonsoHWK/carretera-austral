# Carretera Austral: guía de viaje sin conexión

Guía personal para recorrer la Carretera Austral de Puerto Montt a Caleta Tortel: 11 paradas, 20 días y vuelo de regreso la mañana del día 21. Se instala en el teléfono y funciona sin señal.

**App:** https://alonsohwk.github.io/carretera-austral/

## Instalar en el teléfono

Abre la app una vez **con señal**, en el navegador que se indica. Con esa primera visita queda todo guardado para usar sin conexión.

### Android (Chrome)

1. Abre el enlace y espera a que cargue.
2. Toca el menú **⋮** y luego **Instalar app** o **Agregar a la pantalla principal**.
3. Ábrela desde el ícono nuevo.

### iPhone (Safari)

1. Abre el enlace en **Safari**.
2. Toca **Compartir** y luego **Agregar a pantalla de inicio**.
3. Ábrela desde el ícono nuevo, no desde Safari: iOS puede borrar los datos de los sitios que no se instalan.

### Antes de salir

Prueba la app en modo avión. También descarga los mapas sin conexión en Google Maps: «Abrir en Maps» los necesita cuando no hay señal.

## Editar el itinerario desde el teléfono

Todo el contenido está en [`data/itinerary.json`](data/itinerary.json).

1. Abre ese archivo en github.com, con tu sesión iniciada. En la app de GitHub también se puede.
2. Toca el **lápiz** para editar.
3. Cambia el texto. Respeta las comillas y las comas.
4. Toca **Commit changes**.
5. Espera unos minutos a que se publique.

Si algo queda mal escrito, la app **no se rompe**: sigue usando la última copia válida y avisa del error. Si es la primera vez que se abre, muestra qué parada y qué campo corregir.

### Campos de una parada

| Campo | Qué es |
|---|---|
| `id` | Identificador. **No lo cambies:** las notas y visitas se guardan con él |
| `days` | Días, como `"2–3"` u `"8"`. Deben cubrir del 1 al 20, sin repetirse |
| `segment` | Tramo: `bosque`, `fiordo`, `aysen`, `lago`, `estepa` o `fin` |
| `name`, `subtitle`, `description` | Textos principales |
| `sleep`, `transport`, `highlight` | Dormir, Moverse e Imperdible |
| `tips` | Lista de consejos |
| `lat`, `lng` | Coordenadas para el mapa y Maps |
| `links` | Enlaces oficiales, con `label` y `url` (https) |
| `lastVerified` | Fecha de la última revisión, `AAAA-MM-DD` |
| `unverified` | Campos que muestran «Por confirmar», como `"tips.0"` (el primer consejo) |
| `seasonal` | Datos que muestran «Según temporada», con `path` y `note` |
| `via` | Opcional. Puntos `[lat, lng]` del camino antes de llegar a esta parada |
| `mapLabel`, `labelSide` | Opcional. Nombre corto en el mapa y lado de la etiqueta |
| `returnTrip` | Opcional. Sección de regreso |

Cuando definan fechas, revisen la sección [«Revisar al definir fechas»](SOURCES.md#revisar-al-definir-fechas) y quiten las etiquetas de lo que ya confirmaron.

## Cómo llegan las actualizaciones

La app revisa si hay novedades cada vez que se abre con señal. Si las hay, muestra **«Nueva versión disponible · Actualizar»**. Nada cambia hasta que tocas Actualizar.

- **Cambios en `itinerary.json`:** se detectan solos.
- **Cambios en el código, HTML o CSS:** además hay que subir `VERSION` en `sw.js`. Si se agrega un archivo, también hay que sumarlo a la lista `SHELL`.

GitHub Pages puede tardar hasta unos 10 minutos en mostrar un cambio. Sin señal no pasa nada: sigues con la última versión guardada.

## Notas y respaldo

Las notas, visitas, fecha de inicio y lista de equipaje se guardan **solo en cada teléfono**. Para pasarlas al otro:

1. En **Info → Respaldo**, toca **Copiar código** y envíalo.
2. En el otro teléfono, pégalo en **Restaurar**, toca **Revisar código** y confirma.

Los datos se combinan: no se borra nada, y si una nota es distinta en cada teléfono, se conservan las dos.

## Publicar en GitHub Pages

1. En el repositorio, entra a **Settings → Pages**.
2. En **Source**, elige **Deploy from a branch**.
3. Elige la rama **main** y la carpeta **/ (root)**, y toca **Save**.

## Desarrollo

HTML, CSS y JavaScript sin framework ni paso de compilación.

```bash
npx serve .
```

Las pruebas de Playwright están en `tests/e2e.cjs`. Instala Playwright **fuera de OneDrive** y apunta `NODE_PATH` a esa carpeta, para no sincronizar `node_modules`:

```bash
NODE_PATH=/ruta/a/tooling/node_modules node tests/e2e.cjs
```

Las fuentes Fraunces y DM Sans usan licencia OFL ([`fonts/OFL.txt`](fonts/OFL.txt)). Lo verificado y lo pendiente está en [`SOURCES.md`](SOURCES.md).
