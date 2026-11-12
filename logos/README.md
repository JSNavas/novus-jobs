# Logos

La marca de Novus Jobs: el monograma **NJ** calado en una pastilla con dos esquinas
cortadas en chaflán. La pata derecha de la N baja y desemboca en el gancho de la J:
las dos letras son una sola pieza continua, no dos siluetas pegadas.

| Fichero | Qué es | Dónde se usa |
| --- | --- | --- |
| `novus-jobs-mark.svg` | La marca completa: pastilla cian con el monograma hueco. | Favicon y barra lateral. |
| `novus-jobs-mark-solid.svg` | Solo el monograma, sin pastilla. | Donde la pastilla no cabe o estorba: tamaños muy pequeños, fondos ya teñidos. |
| `novus-jobs-mark-dark.svg` | La inversa: pastilla oscura con el monograma y el chaflán en cian. | README. |
| `novus-jobs-mark-*.png` | Rasterizados a 512, 128, 64 y 32 px, con transparencia. | Tiendas y sitios que no aceptan SVG. |
| `novus-jobs-mark-dark-*.png` | Lo mismo para la variante oscura. | README. |

Color: `#7FB8C4`.

## Por qué hay una variante oscura

La marca cian es una mancha de color del tamaño de la pastilla entera, y sobre el
fondo oscuro de GitHub pesa demasiado: lo primero que se ve del proyecto es un
bloque azul. La variante oscura invierte la relación —fondo oscuro, letras y
chaflán en cian— y la marca pasa a leerse como el icono de una aplicación.

No es la misma figura reescalada: el monograma va al 70 % y el chaflán al 86 %,
porque al dejar de ser un hueco y pasar a ser un trazo las letras se comían la
línea del marco. Si tocas una de las dos escalas, mira el resultado a 32 px antes
de darlo por bueno: es donde el trazo se empasta.

## El recorte va por máscara, no por `fill-rule`

Las siluetas de la N y de la J se solapan en el gancho. Con `fill-rule="evenodd"`
ese solape se invierte y reaparece el cian dentro del hueco, como un trozo suelto
flotando bajo la N. Con una máscara las piezas se pueden pisar sin consecuencias.
Si editas el SVG, no lo conviertas a un único `path` con `evenodd` sin haber
fusionado antes las dos letras en un solo contorno.

## Si cambias la marca

Hay cuatro copias del mismo dibujo y se tocan juntas:

1. `logos/novus-jobs-mark.svg` — el original.
2. `web/public/logoIcon.svg` — el favicon. **No es copia literal del original**: ahí
   las letras van pintadas en ink opaco (`#0A0C0E`) en vez de recortadas por máscara,
   y el SVG lleva `width`/`height` explícitos. Un favicon se rasteriza en modo
   restringido y hay navegadores que no lo pintan si depende de una máscara o si no
   declara tamaño intrínseco. Sus respaldos PNG son `logoIcon-32.png` y
   `logoIcon-180.png`, enlazados desde `web/index.html`.
3. `logos/novus-jobs-mark-dark.svg` — la variante oscura del README, con sus
   cuatro PNG. Se rasteriza con el navegador y fondo transparente, para que las
   esquinas redondeadas no salgan con un cuadrado detrás.
4. `BrandMark`, en `web/src/layouts/full/vertical/sidebar/Sidebar.tsx` — va en línea,
   y no copiado, para que tome el cian del tema con `currentColor` en vez de
   llevarlo escrito.

La descripción de la marca vive en [`DESIGN.md`](../DESIGN.md), en la sección *Shapes*.
