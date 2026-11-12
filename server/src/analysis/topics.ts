export interface Topic {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly area: TopicArea;
}

export type TopicArea =
  | 'lenguaje' | 'backend' | 'frontend' | 'datos' | 'nube'
  | 'arquitectura' | 'practicas' | 'sistema' | 'equipo';

function topic(area: TopicArea, name: string, ...aliases: string[]): Topic {
  return { name, area, aliases: [name, ...aliases] };
}

export const TOPICS: readonly Topic[] = [
  topic('lenguaje', 'TypeScript', 'tipado estricto', 'strict typing'),
  topic('lenguaje', 'JavaScript', 'ES6', 'ECMAScript'),
  topic('lenguaje', 'Node.js', 'Node', 'NodeJS'),
  topic('lenguaje', 'Python'),
  topic('lenguaje', 'PHP'),
  topic('lenguaje', 'Go', 'Golang'),
  topic('lenguaje', 'Java'),
  topic('lenguaje', 'C#', '.NET', 'dotnet'),

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

  topic('frontend', 'React'),
  topic('frontend', 'Next.js', 'NextJS'),
  topic('frontend', 'Vue', 'Vue.js', 'Nuxt'),
  topic('frontend', 'Angular'),
  topic('frontend', 'Gestión de estado', 'Redux', 'Zustand', 'Pinia', 'state management'),
  topic('frontend', 'CSS moderno', 'Tailwind', 'SASS', 'styled-components'),
  topic('frontend', 'Accesibilidad', 'a11y', 'WCAG'),

  topic('datos', 'PostgreSQL', 'Postgres'),
  topic('datos', 'MySQL', 'MariaDB'),
  topic('datos', 'MongoDB', 'Mongo'),
  topic('datos', 'Redis', 'caché distribuida'),
  topic('datos', 'DynamoDB', 'NoSQL'),
  topic('datos', 'Elasticsearch', 'OpenSearch', 'indexación', 'búsqueda distribuida'),
  topic('datos', 'SQL y modelado', 'modelo de datos', 'modelos de datos', 'modelado de datos', 'optimización de consultas'),
  topic('datos', 'ETL y pipelines de datos', 'ETL', 'data pipeline'),

  topic('nube', 'AWS', 'Amazon Web Services'),
  topic('nube', 'Google Cloud', 'GCP'),
  topic('nube', 'Azure'),
  topic('nube', 'Docker', 'contenedores', 'containers'),
  topic('nube', 'Kubernetes', 'K8s'),
  topic('nube', 'Terraform', 'infraestructura como código', 'IaC'),
  topic('nube', 'Serverless', 'Lambda', 'funciones serverless'),
  topic('nube', 'CI/CD', 'integración continua', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'pipelines de despliegue'),
  topic('nube', 'Observabilidad', 'monitoreo', 'monitorización', 'logging', 'Datadog', 'Grafana', 'Prometheus'),

  topic('arquitectura', 'Microservicios', 'microservicios', 'microservices'),
  topic('arquitectura', 'Arquitectura orientada a eventos', 'event-driven', 'orientada a eventos', 'SNS', 'SQS', 'EventBridge', 'Kafka', 'RabbitMQ', 'colas de mensajes'),
  topic('arquitectura', 'Arquitectura limpia (hexagonal, DDD, SOLID)',
    'arquitectura limpia', 'Clean Architecture', 'SOLID', 'inversión de dependencias',
    'hexagonal', 'puertos y adaptadores', 'ports and adapters',
    'DDD', 'Domain Driven Design', 'diseño guiado por el dominio'),
  topic('arquitectura', 'Escalabilidad y alta disponibilidad', 'alta disponibilidad', 'escalabilidad', 'performance'),
  topic('arquitectura', 'Seguridad', 'OWASP', 'buenas prácticas de seguridad'),

  topic('practicas', 'Testing automatizado (unitarias, integración, E2E)',
    'pruebas unitarias', 'unit testing', 'Jest', 'Vitest', 'TDD', 'pruebas de integración',
    'pruebas automatizadas', 'E2E', 'Cypress', 'Playwright', 'Selenium', 'pytest'),
  topic('practicas', 'Code review', 'revisión de código', 'pull request'),
  topic('practicas', 'Git', 'control de versiones', 'GitFlow'),
  topic('practicas', 'Documentación técnica', 'Swagger', 'OpenAPI', 'documentar'),
  topic('practicas', 'Refactorización y deuda técnica', 'refactor', 'deuda técnica', 'código limpio', 'clean code'),

  topic('practicas', 'IA aplicada (LLM, RAG, agentes)',
    'LLM', 'modelos de lenguaje', 'OpenAI', 'GPT', 'Anthropic', 'Gemini', 'Vercel AI SDK',
    'RAG', 'embeddings', 'base vectorial', 'bases vectoriales', 'búsqueda semántica',
    'pgvector', 'Pinecone', 'Qdrant', 'Weaviate', 'Chroma',
    'agentes', 'multiagente', 'agentic', 'tool calling', 'function calling', 'LangChain', 'LlamaIndex', 'CrewAI',
    'MCP', 'Model Context Protocol',
    'prompt', 'prompts', 'prompting',
    'inteligencia artificial', 'IA generativa', 'GenAI',
    'machine learning', 'aprendizaje automático', 'TensorFlow', 'PyTorch', 'scikit-learn', 'MLOps'),

  topic('practicas', 'Asistentes de código (Copilot, Cursor, Claude)', 'Copilot', 'Cursor', 'Claude Code',
    'Windsurf', 'Codex', 'asistentes de IA', 'asistentes de programación', 'herramientas de IA para desarrollo',
    'vibe coding', 'pair programming con IA'),
  topic('practicas', 'Machine learning', 'aprendizaje automático', 'TensorFlow', 'PyTorch', 'scikit-learn',
    'modelos predictivos', 'MLOps'),
  topic('practicas', 'IA en el producto', 'inteligencia artificial', 'IA generativa', 'GenAI'),

  topic('sistema', 'Sistema operativo (Linux, macOS, Windows)',
    'Linux', 'Ubuntu', 'Debian', 'Unix', 'servidor Linux', 'entorno Linux',
    'macOS', 'Mac OS', 'MacBook',
    'Windows', 'WSL', 'PowerShell'),
  topic('sistema', 'Terminal y scripting', 'bash', 'shell scripting', 'CLI', 'línea de comandos', 'zsh', 'scripting'),

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
  sistema: 'Sistema operativo y terminal',
  equipo: 'Equipo e idioma',
};
