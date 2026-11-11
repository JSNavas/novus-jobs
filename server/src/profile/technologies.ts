/**
 * EL CATÁLOGO DE TECNOLOGÍAS, agrupadas por ecosistema.
 *
 * Existe para una sola cosa: leer un CV y proponer las tres listas del perfil
 * sin que el usuario las escriba a mano. De aquí sale todo lo que el alta
 * rellena sola.
 *
 * - Lo que el CV menciona → `stack`.
 * - Lo que el CV menciona Y está marcado `core` → `core`, las que definen el
 *   oficio. Docker o Git aparecen en cualquier oferta y no pueden abrir la
 *   puerta solas, así que nunca son núcleo.
 * - Los ecosistemas que el CV NO menciona → propuesta de `cannotDo`. Se
 *   propone el ecosistema entero y no tecnología a tecnología: quien no ha
 *   tocado la JVM no quiere ofertas de Spring, Kotlin ni Hibernate, y marcarlo
 *   de una es la diferencia entre un paso de diez segundos y uno de diez
 *   minutos.
 *
 * ⚠️ `cannotDo` es lo que más se equivoca en los dos sentidos, y un error aquí
 * no se ve: meter algo que SÍ sabe tira ofertas buenas en silencio. Por eso el
 * alta lo PROPONE y lo deja editar, y nunca lo da por cerrado.
 *
 * ⚠️ Nada de nombres de una o dos letras. Un patrón como `R` o `C` casaría con
 * cualquier letra suelta del anuncio. Las que son así de cortas —C, R, Go— van
 * con alias largos y el emparejado respeta bordes de palabra (ver `text-match`).
 */

export type Ecosystem =
  | 'node' | 'php' | 'python' | 'jvm' | 'dotnet' | 'go' | 'ruby' | 'rust-c'
  | 'elixir' | 'frontend' | 'mobile' | 'data' | 'cms' | 'cloud' | 'devops'
  | 'db' | 'testing' | 'ai';

export interface Technology {
  /** Cómo se escribe en la pantalla y en el perfil. */
  readonly name: string;
  /** Las otras formas en que un anuncio o un CV la nombran. */
  readonly aliases?: readonly string[];
  readonly ecosystem: Ecosystem;
  /**
   * Si define el oficio. Solo estas pueden entrar en `core`: son las que, si
   * aparecen en una oferta, dicen de qué va el puesto.
   */
  readonly core?: boolean;
}

/** Los ecosistemas que se pueden vetar en bloque, con su nombre para la pantalla. */
export const ECOSYSTEM_LABELS: Readonly<Record<Ecosystem, string>> = {
  node: 'JavaScript / Node',
  php: 'PHP',
  python: 'Python',
  jvm: 'Java y JVM',
  dotnet: '.NET y C#',
  go: 'Go',
  ruby: 'Ruby',
  'rust-c': 'Rust, C y C++',
  elixir: 'Elixir y Erlang',
  frontend: 'Frontend',
  mobile: 'Móvil',
  data: 'Datos y BI',
  cms: 'CMS y plataformas cerradas',
  cloud: 'Nube',
  devops: 'DevOps',
  db: 'Bases de datos',
  testing: 'Calidad y pruebas',
  ai: 'IA',
};

/**
 * Los ecosistemas que tiene sentido vetar enteros: un lenguaje de servidor que
 * no se sabe cierra la oferta completa. `frontend`, `cloud`, `devops`, `db`,
 * `testing` y `ai` NO están: son transversales, aparecen de refilón en casi
 * cualquier anuncio y vetarlos en bloque tiraría ofertas buenas.
 */
export const VETOABLE_ECOSYSTEMS: readonly Ecosystem[] = [
  'node', 'php', 'python', 'jvm', 'dotnet', 'go', 'ruby', 'rust-c', 'elixir', 'mobile', 'data', 'cms',
];

export const TECHNOLOGIES: readonly Technology[] = [
  // ── JavaScript y Node ────────────────────────────────────────────────────
  { name: 'TypeScript', aliases: ['ts'], ecosystem: 'node', core: true },
  { name: 'JavaScript', aliases: ['js', 'ecmascript'], ecosystem: 'node', core: true },
  { name: 'Node.js', aliases: ['nodejs', 'node'], ecosystem: 'node', core: true },
  { name: 'NestJS', aliases: ['nest.js', 'nest'], ecosystem: 'node', core: true },
  { name: 'Express', aliases: ['expressjs', 'express.js'], ecosystem: 'node', core: true },
  { name: 'Fastify', ecosystem: 'node', core: true },
  { name: 'Deno', ecosystem: 'node' },
  { name: 'Bun', ecosystem: 'node' },
  { name: 'tRPC', ecosystem: 'node' },
  { name: 'GraphQL', ecosystem: 'node' },

  // ── Frontend ─────────────────────────────────────────────────────────────
  { name: 'React', aliases: ['reactjs', 'react.js'], ecosystem: 'frontend', core: true },
  { name: 'Next.js', aliases: ['nextjs'], ecosystem: 'frontend', core: true },
  { name: 'Vue', aliases: ['vue.js', 'vuejs'], ecosystem: 'frontend', core: true },
  { name: 'Nuxt', aliases: ['nuxt.js'], ecosystem: 'frontend', core: true },
  { name: 'Angular', aliases: ['angularjs'], ecosystem: 'frontend', core: true },
  { name: 'Svelte', aliases: ['sveltekit'], ecosystem: 'frontend', core: true },
  { name: 'Astro', ecosystem: 'frontend' },
  { name: 'Quasar', ecosystem: 'frontend', core: true },
  { name: 'Remix', ecosystem: 'frontend' },
  { name: 'Tailwind', aliases: ['tailwindcss'], ecosystem: 'frontend' },
  { name: 'Redux', ecosystem: 'frontend' },
  { name: 'Zustand', ecosystem: 'frontend' },
  { name: 'Pinia', ecosystem: 'frontend' },
  { name: 'Vite', ecosystem: 'frontend' },
  { name: 'Webpack', ecosystem: 'frontend' },
  { name: 'Sass', aliases: ['scss'], ecosystem: 'frontend' },
  { name: 'HTML', ecosystem: 'frontend' },
  { name: 'CSS', ecosystem: 'frontend' },
  { name: 'Inertia', aliases: ['inertia.js'], ecosystem: 'frontend' },
  { name: 'Livewire', ecosystem: 'frontend' },
  { name: 'ECharts', ecosystem: 'frontend' },
  { name: 'Leaflet', ecosystem: 'frontend' },

  // ── PHP ──────────────────────────────────────────────────────────────────
  { name: 'PHP', ecosystem: 'php', core: true },
  { name: 'Laravel', ecosystem: 'php', core: true },
  { name: 'Symfony', ecosystem: 'php', core: true },
  { name: 'CodeIgniter', ecosystem: 'php' },
  { name: 'Doctrine', ecosystem: 'php' },

  // ── Python ───────────────────────────────────────────────────────────────
  { name: 'Python', ecosystem: 'python', core: true },
  { name: 'Django', ecosystem: 'python', core: true },
  { name: 'Flask', ecosystem: 'python', core: true },
  { name: 'FastAPI', ecosystem: 'python', core: true },
  { name: 'SQLAlchemy', ecosystem: 'python' },
  { name: 'Pandas', ecosystem: 'python' },
  { name: 'NumPy', ecosystem: 'python' },

  // ── JVM ──────────────────────────────────────────────────────────────────
  { name: 'Java', ecosystem: 'jvm', core: true },
  { name: 'Spring', aliases: ['spring boot', 'springboot'], ecosystem: 'jvm', core: true },
  { name: 'Kotlin', ecosystem: 'jvm', core: true },
  { name: 'Scala', ecosystem: 'jvm', core: true },
  { name: 'Groovy', ecosystem: 'jvm' },
  { name: 'Hibernate', ecosystem: 'jvm' },
  { name: 'Quarkus', ecosystem: 'jvm' },
  { name: 'JSP', ecosystem: 'jvm' },

  // ── .NET ─────────────────────────────────────────────────────────────────
  { name: '.NET', aliases: ['dotnet', 'asp.net', '.net core'], ecosystem: 'dotnet', core: true },
  { name: 'C#', aliases: ['csharp'], ecosystem: 'dotnet', core: true },
  { name: 'Blazor', ecosystem: 'dotnet' },
  { name: 'VB.NET', ecosystem: 'dotnet' },
  { name: 'Entity Framework', ecosystem: 'dotnet' },

  // ── Otros lenguajes de servidor ──────────────────────────────────────────
  { name: 'Go', aliases: ['golang'], ecosystem: 'go', core: true },
  { name: 'Ruby', ecosystem: 'ruby', core: true },
  { name: 'Ruby on Rails', aliases: ['rails'], ecosystem: 'ruby', core: true },
  { name: 'Rust', ecosystem: 'rust-c', core: true },
  { name: 'C++', aliases: ['cpp', 'c/c++'], ecosystem: 'rust-c', core: true },
  { name: 'C', aliases: ['lenguaje c', 'ansi c'], ecosystem: 'rust-c' },
  { name: 'Elixir', ecosystem: 'elixir', core: true },
  { name: 'Phoenix', ecosystem: 'elixir' },
  { name: 'Erlang', ecosystem: 'elixir' },
  { name: 'Haskell', ecosystem: 'rust-c' },
  { name: 'Clojure', ecosystem: 'jvm' },
  { name: 'Perl', ecosystem: 'rust-c' },
  { name: 'Solidity', ecosystem: 'rust-c', core: true },

  // ── Móvil ────────────────────────────────────────────────────────────────
  { name: 'React Native', ecosystem: 'mobile', core: true },
  { name: 'Flutter', ecosystem: 'mobile', core: true },
  { name: 'Dart', ecosystem: 'mobile' },
  { name: 'Swift', aliases: ['swiftui'], ecosystem: 'mobile', core: true },
  { name: 'Objective-C', ecosystem: 'mobile' },
  { name: 'Ionic', ecosystem: 'mobile' },
  { name: 'Xamarin', aliases: ['maui'], ecosystem: 'mobile' },
  { name: 'Android', ecosystem: 'mobile' },

  // ── Bases de datos ───────────────────────────────────────────────────────
  { name: 'PostgreSQL', aliases: ['postgres'], ecosystem: 'db' },
  { name: 'MySQL', ecosystem: 'db' },
  { name: 'MariaDB', ecosystem: 'db' },
  { name: 'SQL Server', aliases: ['sqlserver', 'mssql'], ecosystem: 'db' },
  { name: 'Oracle', aliases: ['pl/sql'], ecosystem: 'db' },
  { name: 'MongoDB', aliases: ['mongo'], ecosystem: 'db' },
  { name: 'Redis', ecosystem: 'db' },
  { name: 'SQLite', ecosystem: 'db' },
  { name: 'Elasticsearch', ecosystem: 'db' },
  { name: 'DynamoDB', ecosystem: 'db' },
  { name: 'Supabase', ecosystem: 'db' },
  { name: 'Firebase', ecosystem: 'db' },
  { name: 'TypeORM', ecosystem: 'db' },
  { name: 'Prisma', ecosystem: 'db' },
  { name: 'SQL', ecosystem: 'db' },

  // ── Nube e infraestructura ───────────────────────────────────────────────
  { name: 'AWS', aliases: ['amazon web services'], ecosystem: 'cloud' },
  { name: 'Lambda', ecosystem: 'cloud' },
  { name: 'S3', ecosystem: 'cloud' },
  { name: 'Cognito', ecosystem: 'cloud' },
  { name: 'SQS', ecosystem: 'cloud' },
  { name: 'GCP', aliases: ['google cloud'], ecosystem: 'cloud' },
  { name: 'Azure', ecosystem: 'cloud' },
  { name: 'Vercel', ecosystem: 'cloud' },
  { name: 'Serverless', ecosystem: 'cloud' },
  { name: 'Docker', ecosystem: 'devops' },
  { name: 'Kubernetes', aliases: ['k8s'], ecosystem: 'devops' },
  { name: 'Terraform', ecosystem: 'devops' },
  { name: 'Ansible', ecosystem: 'devops' },
  { name: 'CI/CD', aliases: ['github actions', 'gitlab ci', 'jenkins'], ecosystem: 'devops' },
  { name: 'Linux', ecosystem: 'devops' },
  { name: 'Nginx', ecosystem: 'devops' },
  { name: 'RabbitMQ', ecosystem: 'devops' },
  { name: 'Kafka', ecosystem: 'devops' },

  // ── Datos y BI ───────────────────────────────────────────────────────────
  { name: 'Power BI', aliases: ['powerbi'], ecosystem: 'data', core: true },
  { name: 'Tableau', ecosystem: 'data', core: true },
  { name: 'Spark', aliases: ['pyspark'], ecosystem: 'data', core: true },
  { name: 'Databricks', ecosystem: 'data', core: true },
  { name: 'Airflow', ecosystem: 'data' },
  { name: 'Pentaho', ecosystem: 'data' },
  { name: 'Talend', ecosystem: 'data' },
  { name: 'ETL', ecosystem: 'data' },
  { name: 'MATLAB', ecosystem: 'data' },

  // ── CMS y plataformas cerradas ───────────────────────────────────────────
  { name: 'WordPress', ecosystem: 'cms', core: true },
  { name: 'WooCommerce', ecosystem: 'cms' },
  { name: 'Drupal', ecosystem: 'cms', core: true },
  { name: 'Joomla', ecosystem: 'cms' },
  { name: 'Magento', ecosystem: 'cms', core: true },
  { name: 'Shopify', ecosystem: 'cms', core: true },
  { name: 'Prestashop', ecosystem: 'cms' },
  { name: 'Salesforce', ecosystem: 'cms', core: true },
  { name: 'SharePoint', ecosystem: 'cms' },
  { name: 'Dynamics', ecosystem: 'cms' },
  { name: 'SAP', aliases: ['abap'], ecosystem: 'cms', core: true },
  { name: 'COBOL', ecosystem: 'cms', core: true },
  { name: 'Sitecore', ecosystem: 'cms' },
  { name: 'Umbraco', ecosystem: 'cms' },

  // ── Calidad ──────────────────────────────────────────────────────────────
  { name: 'Jest', ecosystem: 'testing' },
  { name: 'Vitest', ecosystem: 'testing' },
  { name: 'Cypress', ecosystem: 'testing' },
  { name: 'Playwright', ecosystem: 'testing' },
  { name: 'Selenium', ecosystem: 'testing' },
  { name: 'PHPUnit', ecosystem: 'testing' },
  { name: 'PyTest', ecosystem: 'testing' },
  { name: 'K6', ecosystem: 'testing' },
  { name: 'SonarQube', ecosystem: 'testing' },
  { name: 'Swagger', aliases: ['openapi'], ecosystem: 'testing' },
  { name: 'Sentry', ecosystem: 'testing' },

  // ── IA ───────────────────────────────────────────────────────────────────
  { name: 'LangChain', ecosystem: 'ai' },
  { name: 'RAG', ecosystem: 'ai' },
  { name: 'embeddings', ecosystem: 'ai' },
  { name: 'MCP', ecosystem: 'ai' },
  { name: 'TensorFlow', ecosystem: 'ai', core: true },
  { name: 'PyTorch', ecosystem: 'ai', core: true },
];

/** Todas las formas de nombrar una tecnología: su nombre y sus alias. */
export function spellingsOf(tech: Technology): string[] {
  return [tech.name, ...(tech.aliases ?? [])];
}

export function technologiesOf(ecosystem: Ecosystem): readonly Technology[] {
  return TECHNOLOGIES.filter((t) => t.ecosystem === ecosystem);
}
