export enum LoginWall {
  Login = 'login',
  Checkpoint = 'checkpoint',
  AuthWall = 'authwall',
}

const PATTERNS: ReadonlyArray<[RegExp, LoginWall]> = [
  [/\/checkpoint\b|\/challenge\b|\/captcha\b|two[-_]?step/i, LoginWall.Checkpoint],
  [/\/authwall\b|\/guest\b|signup-wall/i, LoginWall.AuthWall],
  [/\/(login|signin|sign-in|iniciar-sesion|acceso|auth)(\/|\?|#|$)|\/uas\/login/i, LoginWall.Login],
];

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

export function loginWallAdvice(wall: LoginWall, source: string): string {
  switch (wall) {
    case LoginWall.Checkpoint:
      return `${source} pide una verificación de seguridad (código o captcha): entra en Integraciones → ${source} → «Iniciar sesión», resuélvela y cierra la ventana.`;
    case LoginWall.AuthWall:
      return `${source} sirvió el muro de invitados: la sesión no está llegando. Vuelve a entrar desde Integraciones → ${source} → «Iniciar sesión».`;
    case LoginWall.Login:
      return `la sesión de ${source} caducó: entra otra vez desde Integraciones → ${source} → «Iniciar sesión» y cierra la ventana al terminar.`;
  }
}
