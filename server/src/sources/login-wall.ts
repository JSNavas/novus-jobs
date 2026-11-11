/**
 * ¿La plataforma nos echó a la puerta?
 *
 * EL PORQUÉ. Una pasada que vuelve sin publicaciones tiene dos causas muy
 * distintas y hasta ahora se contaban como una sola: o la sesión se perdió, o
 * cambió el maquetado. El mensaje decía siempre lo segundo, así que una sesión
 * caída mandaba a revisar selectores — y la sensación era "LinkedIn me echa
 * cada dos días" cuando lo que fallaba era el diagnóstico.
 *
 * LA URL FINAL ES LA SEÑAL FIABLE, y no el texto de la página: si pedimos el
 * feed y acabamos en `/login`, no hay ambigüedad posible por mucho HTML que
 * venga. El texto sí engaña — casi toda web tiene un botón de "iniciar sesión"
 * en la cabecera sin que haga ninguna falta entrar, y un falso positivo aquí
 * manda al usuario a reautenticarse sin motivo, que es peor que no avisar.
 *
 * Los patrones son genéricos a propósito: `/login`, `/signin`, `/authwall` y
 * `/checkpoint` los usan LinkedIn, InfoJobs, Glassdoor e Indeed por igual. Una
 * plataforma nueva no necesita su propia versión de esto.
 */
export enum LoginWall {
  /** Nos pide entrar: la sesión caducó o nunca se inició. */
  Login = 'login',
  /** Verificación de seguridad: código, captcha o "¿eres tú?". Hay que ir a mano. */
  Checkpoint = 'checkpoint',
  /** Muro de invitados: contenido solo para registrados. */
  AuthWall = 'authwall',
}

const PATTERNS: ReadonlyArray<[RegExp, LoginWall]> = [
  // El checkpoint va PRIMERO: su URL suele llevar también "login" dentro, y
  // confundirlo con una sesión caducada manda a reautenticar cuando lo que hace
  // falta es teclear un código. Son dos acciones distintas del usuario.
  [/\/checkpoint\b|\/challenge\b|\/captcha\b|two[-_]?step/i, LoginWall.Checkpoint],
  [/\/authwall\b|\/guest\b|signup-wall/i, LoginWall.AuthWall],
  [/\/(login|signin|sign-in|iniciar-sesion|acceso|auth)(\/|\?|#|$)|\/uas\/login/i, LoginWall.Login],
];

/** Clasifica la URL en la que ACABÓ la navegación. `null` si llegamos bien. */
export function loginWallOf(finalUrl: string): LoginWall | null {
  let path: string;
  try {
    const url = new URL(finalUrl);
    path = `${url.pathname}${url.search}`;
  } catch {
    path = finalUrl;
  }
  for (const [pattern, wall] of PATTERNS) {
    if (pattern.test(path)) return wall;
  }
  return null;
}

/** Qué tiene que hacer el usuario, dicho en una frase y sin rodeos. */
export function loginWallAdvice(wall: LoginWall, source: string): string {
  switch (wall) {
    case LoginWall.Checkpoint:
      return `${source} pide una verificación de seguridad (código o captcha): abre la ventana con \`npm run login -- ${source}\`, resuélvela y cierra la ventana.`;
    case LoginWall.AuthWall:
      return `${source} sirvió el muro de invitados: la sesión no está llegando. Vuelve a iniciar sesión con \`npm run login -- ${source}\`.`;
    case LoginWall.Login:
      return `la sesión de ${source} caducó: inicia sesión otra vez con \`npm run login -- ${source}\` y cierra la ventana al terminar.`;
  }
}
