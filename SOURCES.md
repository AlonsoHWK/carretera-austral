# Fuentes y verificación

Revisado el 3 de noviembre de 2026, asumiendo temporada alta (diciembre a marzo). Se prefirieron fuentes oficiales; cuando no las hubo, se indica. No se incluyen precios ni teléfonos.

**Estados:** ✅ confirmado en fuente oficial · 🟡 fuente secundaria reciente · ❓ por confirmar.

## Revisar al definir fechas

### Restricciones por día de la semana

- **No hay bus Cochrane–Tortel los lunes, en ningún sentido.** Los días 18 y 19 no pueden caer en lunes, así que no conviene empezar un jueves ni un viernes, salvo que se mueva un día. También se muestra en la pestaña Info, que avisa si la fecha elegida choca.
- **Buses Becker** pasa por Santa Lucía y Puyuhuapi hacia el sur solo miércoles y domingo, lo que afecta a los días 8 y 11.
- **Según los horarios publicados, empezar un domingo calza con todos los tramos** (día 8 domingo, día 11 miércoles, día 18 miércoles, día 19 jueves, día 20 viernes). Es una deducción propia a partir de horarios secundarios: ❓ por confirmar.
- **Horarios de Los Glaciares** (Cochrane–Tortel): informados como vigentes solo hasta el 31 de diciembre de 2026. Enero a marzo sigue sin confirmar.
- **Obras en la Ruta 7:** Interlagos informa cambios hasta el 31 de diciembre de 2026 y Ruta 7 Tour advierte de posibles cambios.

### Datos marcados `seasonal` en el JSON

- **Puerto Montt** (`tips.1`): Horarios de Kemel Bus Puerto Montt–Hornopirén; otra guía publica horarios distintos.
- **Hornopirén** (`transport`): Ruta Bimodal: operación y duración. CONAF publica 10:30 como salida; otra fuente, 10:00 y 18:00.
- **Hornopirén** (`tips.0`): Salidas de Naviera Somarco. En enero se suma un zarpe comercial no subsidiado.
- **Hornopirén** (`tips.1`): Horario de Kemel Bus por Ruta Bimodal (el operador publica 6:20 desde Puerto Montt; otra fuente, 7:00).
- **Hornopirén** (`tips.2`): Horario de ingreso al sendero.
- **Pumalín + Chaitén** (`tips.0`): Apertura de campings: una guía indica 15 de diciembre y 2 de enero para el sector volcán.
- **Pumalín + Chaitén** (`tips.1`): Horario de ingreso a senderos.
- **Pumalín + Chaitén** (`tips.2`): Estado del sendero al volcán Chaitén.
- **Futaleufú** (`transport`): Horarios de Bus Chaitén, sin fecha de vigencia publicada.
- **Futaleufú** (`tips.0`): Conexión en Villa Santa Lucía hacia La Junta.
- **La Junta + Puyuhuapi** (`transport`): Días de Buses Becker y TerraAustral, sin fecha de vigencia publicada.
- **La Junta + Puyuhuapi** (`tips.1`): Conexión Futaleufú–Santa Lucía–La Junta.
- **Parque Queulat** (`tips.0`): Horarios y condiciones de ingreso, publicados en Pases Parques.
- **Parque Queulat** (`tips.1`): Reapertura del camping del Ventisquero.
- **Parque Queulat** (`tips.3`): Laguna Los Pumas cierra de junio a septiembre.
- **Parque Queulat** (`tips.4`): Estado de Bosque Encantado.
- **Coyhaique** (`transport`): Días de Buses Becker Puyuhuapi–Coyhaique, sin fecha de vigencia publicada.
- **Coyhaique** (`tips.1`): Horarios Coyhaique–sur. Don Carlos anuncia frecuencias extra en temporada alta.
- **Villa Cerro Castillo** (`description`): Condición del sendero a la laguna; cierra de mayo a septiembre.
- **Villa Cerro Castillo** (`transport`): Interlagos modifica horarios por obras en la Ruta 7 hasta el 31 de diciembre de 2026.
- **Villa Cerro Castillo** (`tips.2`): Estado del camping Laguna Chiguay.
- **Puerto Río Tranquilo** (`transport`): Ruta 7 Tour es diario solo en enero y febrero; Sao Paulo y Don Carlos pasan algunos días.
- **Cochrane + P. Patagonia** (`transport`): Días de Sao Paulo y Don Carlos hacia Cochrane.
- **Cochrane + P. Patagonia** (`tips.2`): Temporada de campings en Valle Chacabuco.
- **Cochrane + P. Patagonia** (`tips.3`): Días de buses Cochrane–Tortel.
- **Caleta Tortel** (`transport`): Horarios de Los Glaciares vigentes hasta el 31 de diciembre de 2026; Aldea sin fecha de vigencia.
- **Caleta Tortel** (`tips.0`): Restricción de los lunes, según los horarios de Aldea y Los Glaciares.
- **Caleta Tortel** (`returnTrip.steps.0`): Salidas Tortel–Cochrane.
- **Caleta Tortel** (`returnTrip.steps.1`): Salidas Cochrane–Coyhaique; los días de Don Carlos son nuestra lectura de una tabla ambigua.
- **Caleta Tortel** (`returnTrip.steps.2`): Horario del vuelo y traslado a Balmaceda.

## Por confirmar

Marcados `unverified` en `data/itinerary.json`; la guía los muestra con la etiqueta «Por confirmar».

- **Puerto Montt** (`tips.0`): Saca efectivo antes de salir: las guías no coinciden sobre qué pueblos del primer tramo tienen cajero.
- **Hornopirén** (`tips.1`): Si vas a pie, Kemel Bus vende Puerto Montt–Chaitén por Ruta Bimodal. Confirma que puedes subir en Hornopirén y que el bus cubre el tramo entre ferries.
- **Pumalín + Chaitén** (`tips.2`): Volcán Chaitén: unas 2,5 h ida y vuelta, dificultad media-alta. Pregunta por su estado en CONAF antes de ir.
- **Futaleufú** (`tips.1`): Las guías no coinciden sobre si hay cajero: lleva efectivo.
- **La Junta + Puyuhuapi** (`tips.1`): Buses Becker conecta con Futaleufú en Santa Lucía a eso de las 11:30. Confirma la conexión al reservar.
- **Parque Queulat** (`transport`): Dedo / transfer (no encontramos bus hasta la entrada)
- **Parque Queulat** (`tips.2`): Las distancias al mirador no coinciden: entre 3,4 y 6,4 km ida y vuelta, 2 a 3 h. CONAF lista el sendero Morrena con 3,2 km y 2 h.
- **Parque Queulat** (`tips.4`): Bosque Encantado (sector Portezuelo, a unos 50 km de Puyuhuapi) no aparece en la lista de CONAF y un blog lo reporta cerrado. Pregunta antes de ir.
- **Puerto Río Tranquilo** (`tips.1`): Las excursiones al Glaciar Exploradores incluyen guía. No confirmamos si entrar sin guía está permitido.
- **Puerto Río Tranquilo** (`tips.2`): Las salidas al lago dependen del viento. Suelen recomendarse temprano.
- **Puerto Río Tranquilo** (`tips.3`): No encontramos cajero confirmado: lleva efectivo desde Coyhaique.
- **Cochrane + P. Patagonia** (`tips.0`): Si tienes un solo día, Tamango es lo más accesible a pie. No encontramos transporte público a Valle Chacabuco.
- **Caleta Tortel** (`tips.1`): No encontramos cajero en Tortel: lleva efectivo desde Cochrane.
- **Info, emergencias:** 136, Socorro Andino: emergencias de montaña. Solo en listados secundarios; no se encontró confirmación oficial.

## Qué se revisó

### Transporte

| Dato | Estado | Fuente |
|---|---|---|
| Buses: Kemel, Bus Chaitén, Becker, TerraAustral, Sao Paulo, Don Carlos, Interlagos, Los Glaciares, Aldea | 🟡 | [carretera-austral.cl, buses](https://carretera-austral.cl/buses-y-transporte-publico/), actualizado el 5 de octubre de 2026. Los días de Don Carlos por sentido son una lectura propia de una tabla ambigua. |
| Horarios Kemel Puerto Montt–Hornopirén y Ruta Bimodal | ✅ / 🟡 | [Kemel Bus](https://www.kemelbus.cl/carretera-austral-horarios.html). Difieren de carretera-austral.cl; la guía usa los del operador. |
| Ferry La Arena–Puelche: 30 min, sin reserva, 60 km a Hornopirén | 🟡 | [carretera-austral.cl, Ruta Bimodal](https://carretera-austral.cl/detalles-de-la-ruta-bimodal-en-carretera-austral/) |
| Ruta Bimodal: dos ferries y camino, duración, reserva | ✅ / 🟡 | [CONAF Pumalín](https://www.conaf.cl/parque_nacionales/parque-nacional-pumalin-douglas-tompkins/), [carretera-austral.cl](https://carretera-austral.cl/detalles-de-la-ruta-bimodal-en-carretera-austral/) |
| Operador y salidas: Naviera Somarco, 10:00 y 18:00 | 🟡 | [carretera-austral.cl, barcazas](https://carretera-austral.cl/transbordadores-y-barcazas/). CONAF publica 10:30. |
| Duración Tortel–Cochrane, unas 3 h | 🟡 | [Rome2Rio](https://www.rome2rio.com/s/Tortel/Cochrane), agregador |
| Duración Cochrane–Coyhaique, unas 7 h | 🟡 | [redBus](https://www.redbus.com/bus-ticket/cochrane-to-coyhaique), agregador |
| Balmaceda a unos 55 km de Coyhaique | 🟡 | [Aeropuertos del Mundo](https://www.aeropuertosdelmundo.net/aeropuerto-BBA-transporte/). Sin confirmar: horario del último vuelo de la tarde. |

### Parques

| Dato | Estado | Fuente |
|---|---|---|
| Hornopirén: ingreso gratuito, registro, sendero 6,8 km, horarios | ✅ | [CONAF](https://www.conaf.cl/parque_nacionales/parque-nacional-hornopiren/) |
| Pumalín: CONAF, sin señal, campings por orden de llegada, ingreso hasta 14:00 | ✅ | [CONAF](https://www.conaf.cl/parque_nacionales/parque-nacional-pumalin-douglas-tompkins/) |
| Pumalín: Los Alerces y volcán Chaitén (dificultad, tiempos) | 🟡 | [Ruta de los Parques](https://www.rutadelosparques.org/en/?p=67) |
| Queulat: descripción, senderos, cierre del camping desde el 17 de abril de 2026, Pases Parques | ✅ | [CONAF](https://www.conaf.cl/parque_nacionales/parque-nacional-queulat/) |
| Queulat: estacionamiento a unos 20 km de Puyuhuapi | 🟡 | [Ruta de los Parques](https://www.rutadelosparques.org/en/?p=150) |
| Cerro Castillo: **sendero a la laguna cerrado por resolución, solo con guía certificado**; registro; camping no operativo | ✅ | [CONAF](https://www.conaf.cl/parque_nacionales/parque-nacional-cerro-castillo/) |
| Cerro Castillo: 14 km y 8 h | 🟡 | [Chile Travel](https://chile.travel/atractivos/cerro-castillo/), 2021. CONAF no publica el dato. |
| Patagonia: sectores, distancias desde Cochrane, campings, sin señal en Chacabuco | 🟡 | [Ruta de los Parques](https://www.rutadelosparques.org/en/parque-nacional-patagonia/) |
| Tamango como buen lugar para ver huemules | 🟡 | [Sally Sees](https://sallysees.com/tamango-sector-parque-nacional-patagonia-chile/), blog de viajes |
| Capillas de Mármol y Exploradores | 🟡 | [Chile Travel](https://www.chile.travel/itinerarios/glaciares-y-trekking-en-lo-mas-austral-del-mundo/), operadores |

### Pueblos, historia y seguridad

| Dato | Estado | Fuente |
|---|---|---|
| Chaitén: erupción de mayo de 2008 | ✅ | [USGS](https://www.usgs.gov/publications/overview-chaiten-volcano-chile-and-its-2008-2009-eruption) |
| Puyuhuapi: fundado en 1935 por colonos de los Sudetes | 🟡 | [InterPatagonia](https://www.interpatagonia.com/puyuhuapi/historia.html), [Haus des Deutschen Ostens](https://www.hdo.bayern.de/imperia/md/content/stmas/hdo_2024/presse_sudz_buchpraesentation__puyuhuapi.pdf) |
| Futaleufú: clases de rápidos por tramo | 🟡 | [GoChile](https://www.gochile.cl/es/articulos/futaleufu-paraiso-del-deporte-aventura-en-la-carretera-austral.htm), [Chile Travel](https://chile.travel/blog/aguas-turquesas-asi-es-el-mejor-rio-de-sudamerica-para-hacer-rafting/) |
| Cajeros: Cochrane, Coyhaique | 🟡 | [Ruta de los Parques: Cochrane](https://www.rutadelosparques.org/en/cochrane/), [Frommer's](https://www.frommers.com/destinations/carretera-austral/driving-tours) |
| Cajeros: Hornopirén, Chaitén, Futaleufú, La Junta, Río Tranquilo, Tortel | ❓ | [GoChile](https://www.gochile.cl/es/articulos/guia-para-recorrer-la-carretera-austral.htm) y Ruta de los Parques se contradicen; nada confirmado para Río Tranquilo ni Tortel |
| Tortel: pasarelas de ciprés de las Guaitecas (6 a 8 km según la fuente) | 🟡 | [Chile Travel](https://chile.travel/blog/no-tiene-una-sola-calle-asi-es-uno-de-los-pueblos-mas-magicos-de-chile/) |
| Emergencias 130, 131, 132, 133 | 🟡 | [Ruta de los Parques: FAQ](https://www.rutadelosparques.org/faqs/) |
| Emergencias 134 | 🟡 | [Expat.cl](https://www.expat.cl/living/dial-phone-emergency-numbers-chile/) |
| Emergencias 137 | ✅ | [Directemar](https://prontus.directemar.cl/directemar/site/docs/20221107/20221107111108/12600_438_241022_directemar.pdf) |
| Emergencias 136 | ❓ | [Wikipedia](https://en.wikipedia.org/wiki/Telephone_numbers_in_Chile) y listados secundarios |
| Clima, señal, hantavirus, influenza aviar | ✅ | Páginas de CONAF citadas arriba, [Ruta de los Parques: FAQ](https://www.rutadelosparques.org/faqs/) |
| Consejos de dedo y lista de equipaje | Sin fuente | Sugerencias prácticas generales, no datos verificados |
| Coordenadas | 🟡 | [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) |

## Cambios respecto del prototipo

- **Hornopirén–Caleta Gonzalo** no es un solo ferry: son dos, con un tramo de camino.
- **Laguna Cerro Castillo** ya no se puede subir sin guía certificado.
- **«Catedrales de Mármol»** pasó a «Capillas de Mármol», el nombre del Santuario de la Naturaleza.
- **«Alerces milenarios»** pasó a «Bosque de alerces»: las fuentes revisadas no confirman esa edad en este sendero.
- **Huemules:** la guía apunta a Tamango, no a Valle Chacabuco.
- **Camping en Queulat y en Cerro Castillo:** los dos sectores citados figuran cerrados o no operativos.
- **Coyhaique** pasó a un día y **Tortel** a los días 18 a 20, con vuelo la mañana del día 21.
