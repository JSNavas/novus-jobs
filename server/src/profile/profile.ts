/**
 * Perfil del candidato. Se edita en código, no en la UI: cambia poco y una
 * pantalla de ajustes sería sobreingeniería (decisión 8 del plan).
 *
 * - `stack`: todo lo que sabe. Enriquece el "Coincide con", no abre la puerta.
 * - `core`: al menos una de estas tiene que aparecer para que la oferta encaje.
 *   Sin este corte, una vacante de Java que mencione Docker le llegaría igual.
 * - `cannotDo`: si una oferta EXIGE alguna de estas, no le sirve.
 */
export const PROFILE = {
  stack: [
    'TypeScript', 'JavaScript',
    'Node.js', 'NodeJS', 'Node',
    'NestJS', 'Nest.js',
    'React', 'ReactJS',
    'Next.js', 'NextJS',
    'Vue', 'Vue.js', 'VueJS',
    'Nuxt', 'Nuxt.js',
    'Quasar', 'Vite', 'Pinia', 'Zustand',
    'PHP', 'Laravel', 'Python',
    'TypeORM', 'REST', 'Microservicios', 'Microservices',
    'PostgreSQL', 'Postgres', 'MySQL', 'MongoDB', 'Mongo',
    'Firebase', 'Supabase',
    'AWS', 'SQS', 'GCP', 'Google Cloud', 'Serverless',
    'Docker', 'Kubernetes', 'K8s',
    'CI/CD', 'GitHub Actions',
    'RAG', 'embeddings',
    'Passkeys', 'WebAuthn',
    'Jest', 'PHPUnit',
  ],
  core: [
    'TypeScript', 'JavaScript',
    'Node.js', 'NodeJS', 'Node',
    'NestJS', 'Nest.js',
    'React', 'ReactJS',
    'Next.js', 'NextJS',
    'Vue', 'Vue.js', 'VueJS',
    'Nuxt', 'Nuxt.js',
    'PHP', 'Laravel',
    'Python',
  ],
  cannotDo: [
    'Java', 'Spring Boot', 'Kotlin', 'Scala',
    '.NET', 'C#', 'ASP.NET', 'Blazor',
    'Angular', 'Flutter', 'Swift',
    'Ruby on Rails', 'Go', 'Elixir',
    'Django', 'Flask', 'SQLAlchemy',
    'WordPress', 'Drupal', 'Magento', 'Shopify', 'Umbraco',
    'Salesforce', 'SharePoint', 'ABAP', 'COBOL',
  ],
} as const;
