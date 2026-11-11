/**
 * ═══ EL VOCABULARIO DEL «ENFOQUE» ═══
 *
 * Qué piden las vacantes que le sirven, para saber qué estudiar.
 *
 * ¿POR QUÉ UN CATÁLOGO ESCRITO A MANO Y NO CONTAR PALABRAS SUELTAS?
 *
 * Porque la frase que él señaló —«Experiencia aplicando tipado estricto,
 * concurrencia y patrones asincrónicos»— NO se repite literal en ninguna otra
 * vacante. Cada empresa la escribe a su manera. Lo que sí se repite es el
 * CONCEPTO, y un concepto no se detecta contando palabras: «experiencia»,
 * «conocimiento» y «sólidos» saldrían los primeros y no dirían nada.
 *
 * Así que se cuenta contra una lista de temas con sus sinónimos. Es trabajo
 * manual y se queda corto en lo que no esté aquí, pero lo que devuelve es
 * cierto — y una lista de estudio con ruido no se usa dos veces.
 *
 * ESTA LISTA VA MÁS ALLÁ DE SU STACK A PROPÓSITO. Lo valioso no es confirmar
 * que piden Node.js: es ver que seis vacantes piden Terraform, que él no sabe.
 * Lo que no está en su perfil es justo lo que hay que estudiar.
 */
export interface Topic {
  /** Cómo se enseña en la lista. */
  readonly name: string;
  /** Con qué se reconoce en el anuncio. El nombre cuenta como alias. */
  readonly aliases: readonly string[];
  /** Para agrupar la lista por áreas. */
  readonly area: TopicArea;
}

export type TopicArea =
  | 'lenguaje' | 'backend' | 'frontend' | 'datos' | 'nube'
  | 'arquitectura' | 'practicas' | 'equipo';

/** `name` se añade solo a los alias: no hace falta repetirlo. */
function topic(area: TopicArea, name: string, ...aliases: string[]): Topic {
  return { name, area, aliases: [name, ...aliases] };
}

export const TOPICS: readonly Topic[] = [
  // ─── Lenguajes y runtimes
  topic('lenguaje', 'TypeScript', 'tipado estricto', 'strict typing'),
  topic('lenguaje', 'JavaScript', 'ES6', 'ECMAScript'),
  topic('lenguaje', 'Node.js', 'Node', 'NodeJS'),
  topic('lenguaje', 'Python'),
  topic('lenguaje', 'PHP'),
  topic('lenguaje', 'Go', 'Golang'),
  topic('lenguaje', 'Java'),
  topic('lenguaje', 'C#', '.NET', 'dotnet'),

  // ─── Backend
  topic('backend', 'NestJS', 'Nest'),
  topic('backend', 'Express', 'ExpressJS'),
  topic('backend', 'Fastify'),
  topic('backend', 'Laravel'),
  topic('backend', 'Django'),
  topic('backend', 'FastAPI'),
  topic('backend', 'APIs REST', 'REST', 'RESTful', 'API REST'),
  topic('backend', 'GraphQL'),
  topic('backend', 'gRPC'),
  topic('backend', 'WebSockets', 'socket.io', 'tiempo real'),
  topic('backend', 'Autenticación y permisos', 'OAuth', 'JWT', 'SSO', 'autenticación', 'autorización'),
  topic('backend', 'Programación asíncrona', 'asincrónico', 'asíncrono', 'concurrencia', 'async/await'),

  // ─── Frontend
  topic('frontend', 'React'),
  topic('frontend', 'Next.js', 'NextJS'),
  topic('frontend', 'Vue', 'Vue.js', 'Nuxt'),
  topic('frontend', 'Angular'),
  topic('frontend', 'Gestión de estado', 'Redux', 'Zustand', 'Pinia', 'state management'),
  topic('frontend', 'CSS moderno', 'Tailwind', 'SASS', 'styled-components'),
  topic('frontend', 'Accesibilidad', 'a11y', 'WCAG'),

  // ─── Datos
  topic('datos', 'PostgreSQL', 'Postgres'),
  topic('datos', 'MySQL', 'MariaDB'),
  topic('datos', 'MongoDB', 'Mongo'),
  topic('datos', 'Redis', 'caché distribuida'),
  topic('datos', 'DynamoDB', 'NoSQL'),
  topic('datos', 'Elasticsearch', 'OpenSearch', 'indexación', 'búsqueda distribuida'),
  topic('datos', 'SQL y modelado', 'modelo de datos', 'modelos de datos', 'modelado de datos', 'optimización de consultas'),
  topic('datos', 'ETL y pipelines de datos', 'ETL', 'data pipeline'),

  // ─── Nube e infraestructura
  topic('nube', 'AWS', 'Amazon Web Services'),
  topic('nube', 'Google Cloud', 'GCP'),
  topic('nube', 'Azure'),
  topic('nube', 'Docker', 'contenedores', 'containers'),
  topic('nube', 'Kubernetes', 'K8s'),
  topic('nube', 'Terraform', 'infraestructura como código', 'IaC'),
  topic('nube', 'Serverless', 'Lambda', 'funciones serverless'),
  topic('nube', 'CI/CD', 'integración continua', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'pipelines de despliegue'),
  topic('nube', 'Observabilidad', 'monitoreo', 'monitorización', 'logging', 'Datadog', 'Grafana', 'Prometheus'),

  // ─── Arquitectura
  topic('arquitectura', 'Arquitectura hexagonal', 'hexagonal', 'puertos y adaptadores', 'ports and adapters'),
  topic('arquitectura', 'Domain Driven Design', 'DDD', 'diseño guiado por el dominio'),
  topic('arquitectura', 'Microservicios', 'microservicios', 'microservices'),
  topic('arquitectura', 'Arquitectura orientada a eventos', 'event-driven', 'orientada a eventos', 'SNS', 'SQS', 'EventBridge', 'Kafka', 'RabbitMQ', 'colas de mensajes'),
  topic('arquitectura', 'Clean Architecture', 'arquitectura limpia', 'SOLID', 'inversión de dependencias'),
  topic('arquitectura', 'Escalabilidad y alta disponibilidad', 'alta disponibilidad', 'escalabilidad', 'performance'),
  topic('arquitectura', 'Seguridad', 'OWASP', 'buenas prácticas de seguridad'),

  // ─── Prácticas
  topic('practicas', 'Testing automatizado', 'pruebas unitarias', 'unit testing', 'Jest', 'Vitest', 'TDD', 'pruebas de integración'),
  topic('practicas', 'Pruebas end to end', 'E2E', 'Cypress', 'Playwright', 'Selenium'),
  topic('practicas', 'Code review', 'revisión de código', 'pull request'),
  topic('practicas', 'Git', 'control de versiones', 'GitFlow'),
  topic('practicas', 'Documentación técnica', 'Swagger', 'OpenAPI', 'documentar'),
  topic('practicas', 'Refactorización y deuda técnica', 'refactor', 'deuda técnica', 'código limpio', 'clean code'),

  // ─── IA, que es lo que está entrando en todas partes
  topic('practicas', 'IA aplicada al desarrollo', 'Copilot', 'Cursor', 'asistentes de IA', 'LLM', 'RAG', 'embeddings'),

  // ─── Equipo e idioma
  topic('equipo', 'Inglés', 'English', 'inglés avanzado', 'inglés conversacional'),
  topic('equipo', 'Metodologías ágiles', 'Scrum', 'Kanban', 'agile', 'ágil'),
  topic('equipo', 'Trabajo con producto', 'product owner', 'stakeholders', 'equipo de producto'),
  topic('equipo', 'Mentoría y liderazgo técnico', 'liderazgo técnico', 'mentoría', 'tech lead'),
];

export const AREA_LABELS: Record<TopicArea, string> = {
  lenguaje: 'Lenguajes',
  backend: 'Backend',
  frontend: 'Frontend',
  datos: 'Datos',
  nube: 'Nube e infraestructura',
  arquitectura: 'Arquitectura',
  practicas: 'Prácticas',
  equipo: 'Equipo e idioma',
};
