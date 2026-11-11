/**
 * ═══ EL «¿POR QUÉ TE INTERESA TRABAJAR AQUÍ?» ═══
 *
 * Get on Board lo pide en cada postulación (entre 50 y 1000 caracteres). Este
 * es el texto por defecto; el señor lo cambia desde Configuración y lo suyo
 * manda — esto solo es lo que hay el primer día, o si lo deja en blanco.
 *
 * Son SUS palabras. Si algún día hay que tocarlo, se le pregunta: un párrafo
 * de presentación escrito con palabras que no son las tuyas se nota, y quien
 * lo recibe también lo nota.
 *
 * ═══ LOS HUECOS ═══
 *
 * `{puesto}`, `{empresa}` y `{tecnologias}` se rellenan con los datos de cada
 * oferta. Son la diferencia entre un párrafo genérico —que se reconoce a la
 * legua— y uno que demuestra que leyó el anuncio.
 *
 * La frase de `{tecnologias}` DESAPARECE ENTERA cuando no hay coincidencias
 * que nombrar, en vez de quedarse coja. Por eso conviene que viva en su propia
 * frase y no incrustada en otra.
 */
export const DEFAULT_MOTIVATION_TEMPLATE =
  'Me interesa el puesto de {puesto} en {empresa} ya que es un rol donde puedo aportar toda la ' +
  'experiencia que he adquirido a lo largo de 9 años como desarrollador de software. ' +
  'Vi que para la vacante requieren conocimientos en las tecnologías {tecnologias}, que son justo ' +
  'las tecnologías que vengo usando desde hace varios años en los roles que he desempeñado ' +
  'anteriormente. ' +
  'Soy responsable y dedicado, me gusta trabajar en equipo y me adapto rápidamente a los nuevos ' +
  'entornos de trabajo. Me fascina aprender nuevas tecnologías, cómo integrarlas y cómo mejorar mi ' +
  'flujo de trabajo para que sea más rápido y productivo. Soy amante de las buenas prácticas y del ' +
  'código escalable por lo que me mantengo en constante estudio para crecer cada día como ' +
  'desarrollador.';

/**
 * El tope de Get on Board. Se valida al guardar: una plantilla más larga que
 * el formulario no se detecta hasta que él pega el texto y el sitio se lo
 * rechaza, que es el peor momento posible.
 */
export const MAX_MOTIVATION_CHARS = 1000;

/**
 * El tope de antigüedad de una vacante para ENTRAR, en meses.
 *
 * Tres de fábrica, que es lo que él pidió al verlo: de 27 ofertas aceptadas,
 * 14 llevaban más de dos meses publicadas y la primera era de hace un año con
 * 969 postulaciones. Se cambia en Configuración.
 *
 * Los topes del tope: menos de uno dejaría entrar casi nada, y más de dos
 * años es no tener tope. Se validan al guardar porque un número absurdo aquí
 * no se nota hasta la siguiente búsqueda, cuando ya no entró nada.
 */
export const DEFAULT_MAX_AGE_MONTHS = 3;
export const MIN_MAX_AGE_MONTHS = 1;
export const MAX_MAX_AGE_MONTHS = 24;
