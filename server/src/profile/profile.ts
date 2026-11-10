/**
 * Perfil del candidato, sacado de su CV (9 años, Full Stack).
 *
 * Se edita en código, no en la UI: cambia poco y una pantalla de ajustes sería
 * sobreingeniería (decisión 8 del plan). Las tres listas hacen cosas distintas:
 *
 * - `stack`: todo lo que sabe. Enriquece el "Coincide con", NO abre la puerta.
 * - `core`: al menos una tiene que aparecer para que la oferta encaje. Sin este
 *   corte, una vacante de Java que mencione Docker le llegaría igual.
 * - `cannotDo`: si una oferta EXIGE alguna de estas, no le sirve. De aquí sale
 *   el veto por tecnología: añadir una es una línea, y ese es el único sitio.
 *
 * ⚠️ `cannotDo` es lo que más se equivoca en los dos sentidos. Meter algo que
 * SÍ sabe tira ofertas buenas sin que nadie se entere — pasó con Symfony, que
 * estaba en la lista cuando el CV dice que sacó los pagos automáticos de un
 * monolito Symfony en ePayco. Antes de añadir nada, se mira el CV.
 */
export const PROFILE = {
  stack: [
    // Lenguajes y runtime
    'TypeScript', 'JavaScript', 'Node.js', 'NodeJS', 'Node', 'Python', 'PHP',
    // Frameworks backend
    'NestJS', 'Nest.js', 'Fastify', 'Express', 'Laravel', 'Symfony', 'Livewire',
    // Frontend
    'React', 'ReactJS', 'Next.js', 'NextJS', 'Vue', 'Vue.js', 'VueJS',
    'Nuxt', 'Nuxt.js', 'Quasar', 'Inertia', 'Vite', 'Pinia', 'Zustand',
    'ECharts', 'Leaflet',
    // Arquitectura
    'Hexagonal', 'DDD', 'CQRS', 'Microservicios', 'Microservices',
    'event-driven', 'REST', 'WebSocket', 'WebSockets', 'STOMP', 'colas', 'SQS',
    // Datos
    'PostgreSQL', 'Postgres', 'MySQL', 'SQL Server', 'MongoDB', 'Mongo', 'Redis',
    'TypeORM', 'Doctrine', 'Supabase', 'Firebase', 'Pentaho', 'ETL', 'SQL',
    // Infraestructura
    'AWS', 'Lambda', 'Cognito', 'S3', 'GCP', 'Google Cloud', 'Serverless',
    'Docker', 'Kubernetes', 'K8s', 'CI/CD', 'GitHub Actions',
    // Pagos
    'Stripe', 'PayPal', 'webhooks', 'payouts',
    // Calidad
    'Jest', 'PHPUnit', 'K6', 'SonarQube', 'Swagger', 'OpenAPI', 'Sentry', 'E2E',
    // IA y seguridad
    'RAG', 'embeddings', 'MCP', 'Passkeys', 'WebAuthn', 'Okta', 'SSO', 'OAuth',
  ],
  core: [
    'TypeScript', 'JavaScript',
    'Node.js', 'NodeJS', 'Node',
    'NestJS', 'Nest.js', 'Fastify', 'Express',
    'React', 'ReactJS',
    'Next.js', 'NextJS',
    'Vue', 'Vue.js', 'VueJS',
    'Nuxt', 'Nuxt.js', 'Quasar',
    'PHP', 'Laravel', 'Symfony',
    'Python',
  ],
  /**
   * Lo que NO sabe. El CV manda: no está Symfony (lo trabajó en ePayco), ni
   * Python (lo tiene), ni Redis ni SQL Server (los tiene).
   */
  cannotDo: [
    // Compilados y de sistemas
    'C++', 'C/C++', 'Rust', 'Objective-C', 'Delphi', 'Pascal', 'Fortran',
    // JVM
    'Java', 'Spring', 'Spring Boot', 'Kotlin', 'Scala', 'Groovy', 'Hibernate', 'JSP', 'Struts',
    // .NET
    '.NET', 'dotnet', 'ASP.NET', 'C#', 'Blazor', 'VB.NET', 'MAUI', 'Xamarin',
    // Otros ecosistemas
    'Go', 'Golang', 'Ruby', 'Ruby on Rails', 'Rails', 'Elixir', 'Phoenix',
    'Perl', 'Haskell', 'Clojure', 'Erlang', 'Julia', 'Solidity',
    // Frontend y móvil ajenos
    'Angular', 'AngularJS', 'Svelte', 'Ember', 'Backbone',
    'Flutter', 'Dart', 'Swift', 'SwiftUI', 'React Native', 'Ionic',
    'Unity', 'Unreal',
    // Python que no es el suyo (web y datos pesados)
    'Django', 'Flask', 'SQLAlchemy', 'PySpark', 'Spark', 'Databricks', 'Airflow',
    // Datos y BI. Nada de una sola letra: un patrón como 'R' casaría con
    // cualquier "r" suelta del anuncio y tiraría ofertas buenas sin dejar rastro.
    'MATLAB', 'Power BI', 'Tableau', 'Talend', 'Informatica',
    'PL/SQL', 'Oracle Forms',
    // CMS y plataformas cerradas
    'WordPress', 'WooCommerce', 'Drupal', 'Joomla', 'Magento', 'Shopify',
    'Umbraco', 'Sitecore', 'Prestashop',
    'Salesforce', 'SharePoint', 'Dynamics', 'SAP', 'ABAP', 'COBOL', 'Camunda',
  ],
} as const;
