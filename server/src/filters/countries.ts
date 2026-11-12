export type Region = 'latam' | 'iberia' | 'north-america' | 'europe' | 'asia';

export interface Country {
  readonly code: string;
  readonly label: string;
  readonly names: readonly string[];
  readonly adjectives: readonly string[];
  readonly cities: readonly string[];
  readonly currency: readonly string[];
  readonly region: Region;
}

export const COUNTRIES: readonly Country[] = [
  {
    code: 'VE', label: 'Venezuela', region: 'latam',
    names: ['venezuela'],
    adjectives: ['venezolano', 'venezolana', 'venezolanos', 'venezolanas'],
    cities: ['caracas', 'maracaibo', 'barquisimeto', 'maracay', 'punto fijo', 'puerto la cruz', 'ciudad guayana', 'cumaná', 'cumana', 'porlamar', 'valencia carabobo', 'san cristóbal', 'san cristobal'],
    currency: ['bolívares', 'bolivares', 'bolívar', 'bolivar', 'bsd', 'vef', 'ves'],
  },
  {
    code: 'AR', label: 'Argentina', region: 'latam',
    names: ['argentina'],
    adjectives: ['argentino', 'argentina', 'argentinos', 'argentinas'],
    cities: ['buenos aires', 'rosario', 'córdoba capital', 'cordoba capital', 'mendoza', 'la plata', 'mar del plata', 'san miguel de tucumán'],
    currency: ['pesos argentinos', 'peso argentino'],
  },
  {
    code: 'CO', label: 'Colombia', region: 'latam',
    names: ['colombia'],
    adjectives: ['colombiano', 'colombiana', 'colombianos', 'colombianas'],
    cities: ['bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla', 'cartagena', 'bucaramanga', 'pereira'],
    currency: ['pesos colombianos', 'peso colombiano'],
  },
  {
    code: 'MX', label: 'México', region: 'latam',
    names: ['méxico', 'mexico'],
    adjectives: ['mexicano', 'mexicana', 'mexicanos', 'mexicanas'],
    cities: ['ciudad de méxico', 'ciudad de mexico', 'cdmx', 'guadalajara', 'monterrey', 'querétaro', 'queretaro', 'puebla', 'tijuana', 'mérida yucatán', 'merida yucatan'],
    currency: ['pesos mexicanos', 'peso mexicano'],
  },
  {
    code: 'CL', label: 'Chile', region: 'latam',
    names: ['chile'],
    adjectives: ['chileno', 'chilena', 'chilenos', 'chilenas'],
    cities: ['santiago de chile', 'valparaíso', 'valparaiso', 'concepción chile', 'concepcion chile', 'viña del mar', 'vina del mar'],
    currency: ['pesos chilenos', 'peso chileno'],
  },
  {
    code: 'PE', label: 'Perú', region: 'latam',
    names: ['perú', 'peru'],
    adjectives: ['peruano', 'peruana', 'peruanos', 'peruanas'],
    cities: ['lima', 'arequipa', 'trujillo', 'cusco', 'chiclayo'],
    currency: ['soles', 'nuevos soles'],
  },
  {
    code: 'UY', label: 'Uruguay', region: 'latam',
    names: ['uruguay'],
    adjectives: ['uruguayo', 'uruguaya', 'uruguayos', 'uruguayas'],
    cities: ['montevideo', 'punta del este'],
    currency: ['pesos uruguayos', 'peso uruguayo'],
  },
  {
    code: 'BR', label: 'Brasil', region: 'latam',
    names: ['brasil', 'brazil'],
    adjectives: ['brasileño', 'brasileno', 'brasileira', 'brasileiro', 'brazilian'],
    cities: ['são paulo', 'sao paulo', 'rio de janeiro', 'belo horizonte', 'brasília', 'brasilia', 'porto alegre', 'curitiba', 'recife', 'florianópolis', 'florianopolis'],
    currency: ['reais', 'real brasileño', 'brl'],
  },
  {
    code: 'EC', label: 'Ecuador', region: 'latam',
    names: ['ecuador'],
    adjectives: ['ecuatoriano', 'ecuatoriana', 'ecuatorianos', 'ecuatorianas'],
    cities: ['quito', 'guayaquil', 'cuenca ecuador'],
    currency: [],
  },
  {
    code: 'BO', label: 'Bolivia', region: 'latam',
    names: ['bolivia'],
    adjectives: ['boliviano', 'boliviana', 'bolivianos', 'bolivianas'],
    cities: ['la paz', 'santa cruz de la sierra', 'cochabamba'],
    currency: ['bolivianos'],
  },
  {
    code: 'PY', label: 'Paraguay', region: 'latam',
    names: ['paraguay'],
    adjectives: ['paraguayo', 'paraguaya', 'paraguayos', 'paraguayas'],
    cities: ['asunción', 'asuncion', 'ciudad del este'],
    currency: ['guaraníes', 'guaranies'],
  },
  {
    code: 'CR', label: 'Costa Rica', region: 'latam',
    names: ['costa rica'],
    adjectives: ['costarricense', 'costarricenses'],
    cities: ['san josé de costa rica', 'san jose de costa rica', 'heredia', 'alajuela'],
    currency: ['colones'],
  },
  {
    code: 'PA', label: 'Panamá', region: 'latam',
    names: ['panamá', 'panama'],
    adjectives: ['panameño', 'panameno', 'panameña'],
    cities: ['ciudad de panamá', 'ciudad de panama'],
    currency: ['balboas'],
  },
  {
    code: 'GT', label: 'Guatemala', region: 'latam',
    names: ['guatemala'],
    adjectives: ['guatemalteco', 'guatemalteca'],
    cities: ['ciudad de guatemala'],
    currency: ['quetzales'],
  },
  {
    code: 'HN', label: 'Honduras', region: 'latam',
    names: ['honduras'],
    adjectives: ['hondureño', 'hondureno', 'hondureña'],
    cities: ['tegucigalpa', 'san pedro sula'],
    currency: ['lempiras'],
  },
  {
    code: 'NI', label: 'Nicaragua', region: 'latam',
    names: ['nicaragua'],
    adjectives: ['nicaragüense', 'nicaraguense'],
    cities: ['managua'],
    currency: ['córdobas nicaragüenses', 'cordobas nicaraguenses'],
  },
  {
    code: 'SV', label: 'El Salvador', region: 'latam',
    names: ['el salvador'],
    adjectives: ['salvadoreño', 'salvadoreno', 'salvadoreña'],
    cities: ['san salvador'],
    currency: [],
  },
  {
    code: 'DO', label: 'República Dominicana', region: 'latam',
    names: ['república dominicana', 'republica dominicana'],
    adjectives: ['dominicano', 'dominicana', 'dominicanos'],
    cities: ['santo domingo', 'santiago de los caballeros'],
    currency: ['pesos dominicanos'],
  },
  {
    code: 'CU', label: 'Cuba', region: 'latam',
    names: ['cuba'],
    adjectives: ['cubano', 'cubana', 'cubanos', 'cubanas'],
    cities: ['la habana'],
    currency: [],
  },
  {
    code: 'ES', label: 'España', region: 'iberia',
    names: ['españa', 'espana', 'spain'],
    adjectives: ['español', 'espanol', 'española', 'espanola', 'spanish'],
    cities: ['madrid', 'barcelona', 'sevilla', 'bilbao', 'málaga', 'malaga', 'zaragoza', 'valencia españa', 'valencia espana', 'murcia', 'palma de mallorca', 'las palmas'],
    currency: [],
  },
  {
    code: 'PT', label: 'Portugal', region: 'iberia',
    names: ['portugal'],
    adjectives: ['portugués', 'portugues', 'portuguesa', 'portuguese'],
    cities: ['lisboa', 'lisbon', 'oporto', 'porto portugal', 'braga'],
    currency: [],
  },
  {
    code: 'US', label: 'Estados Unidos', region: 'north-america',
    names: ['estados unidos', 'united states', 'usa', 'u.s.a.', 'ee. uu', 'ee.uu', 'ee uu', 'eeuu'],
    adjectives: ['estadounidense', 'american citizen', 'us citizen'],
    cities: ['new york', 'nueva york', 'san francisco', 'los angeles', 'seattle', 'austin', 'chicago', 'boston', 'miami', 'denver', 'atlanta'],
    currency: [],
  },
  {
    code: 'CA', label: 'Canadá', region: 'north-america',
    names: ['canadá', 'canada'],
    adjectives: ['canadiense', 'canadian'],
    cities: ['toronto', 'vancouver', 'montreal', 'ottawa', 'calgary'],
    currency: [],
  },
  {
    code: 'GB', label: 'Reino Unido', region: 'europe',
    names: ['reino unido', 'united kingdom', 'uk', 'u.k.'],
    adjectives: ['británico', 'britanico', 'british'],
    cities: ['londres', 'london', 'manchester', 'edimburgo', 'edinburgh', 'birmingham'],
    currency: [],
  },
  {
    code: 'DE', label: 'Alemania', region: 'europe',
    names: ['alemania', 'germany', 'deutschland'],
    adjectives: ['alemán', 'aleman', 'alemana', 'german'],
    cities: ['berlín', 'berlin', 'múnich', 'munich', 'hamburgo', 'hamburg', 'frankfurt', 'colonia alemania'],
    currency: [],
  },
  {
    code: 'FR', label: 'Francia', region: 'europe',
    names: ['francia', 'france'],
    adjectives: ['francés', 'frances', 'francesa', 'french'],
    cities: ['parís', 'paris', 'lyon', 'marsella', 'toulouse'],
    currency: [],
  },
  {
    code: 'IT', label: 'Italia', region: 'europe',
    names: ['italia', 'italy'],
    adjectives: ['italiano', 'italiana', 'italian'],
    cities: ['roma', 'milán', 'milan', 'turín', 'turin', 'nápoles', 'napoles'],
    currency: [],
  },
  {
    code: 'PL', label: 'Polonia', region: 'europe',
    names: ['polonia', 'poland'],
    adjectives: ['polaco', 'polaca', 'polish'],
    cities: ['varsovia', 'warsaw', 'cracovia', 'krakow', 'wroclaw'],
    currency: ['zlotys'],
  },
  {
    code: 'NL', label: 'Países Bajos', region: 'europe',
    names: ['países bajos', 'paises bajos', 'netherlands', 'holanda'],
    adjectives: ['neerlandés', 'neerlandes', 'holandés', 'holandes', 'dutch'],
    cities: ['ámsterdam', 'amsterdam', 'rotterdam', 'la haya', 'utrecht'],
    currency: [],
  },
  {
    code: 'IN', label: 'India', region: 'asia',
    names: ['india'],
    adjectives: ['indio', 'india', 'indian'],
    cities: ['bangalore', 'bengaluru', 'mumbai', 'nueva delhi', 'new delhi', 'hyderabad', 'pune', 'chennai'],
    currency: ['rupias', 'rupees'],
  },
];

export const REGION_MARKS: Readonly<Record<Region, readonly string[]>> = {
  latam: ['latam', 'latinoamérica', 'latinoamerica', 'latin america', 'américa latina', 'america latina', 'hispanoamérica', 'hispanoamerica', 'sudamérica', 'sudamerica', 'south america'],
  iberia: ['península ibérica', 'peninsula iberica', 'iberia'],
  'north-america': ['norteamérica', 'norteamerica', 'north america'],
  europe: ['europa', 'europe', 'unión europea', 'union europea', 'european union', 'emea'],
  asia: ['asia', 'apac', 'sudeste asiático', 'sudeste asiatico'],
};

export function findCountry(code: string): Country | null {
  const wanted = code.trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === wanted) ?? null;
}
