export const BUILT_IN_CATALOG_SCHEMA_VERSION = 1 as const

export interface BuiltInConcept {
  readonly id: string
  readonly text: string
}

export interface BuiltInCategory {
  readonly id: string
  readonly schemaVersion: typeof BUILT_IN_CATALOG_SCHEMA_VERSION
  readonly source: 'built-in'
  readonly name: string
  readonly adult: boolean
  readonly concepts: readonly BuiltInConcept[]
  readonly createdAt: null
  readonly updatedAt: null
}

function category(
  id: string,
  name: string,
  conceptTexts: readonly string[],
  adult = false,
): BuiltInCategory {
  const concepts = conceptTexts.map((text, index) =>
    Object.freeze({ id: `${id}-c${String(index + 1).padStart(2, '0')}`, text }),
  )
  return Object.freeze({
    id,
    schemaVersion: BUILT_IN_CATALOG_SCHEMA_VERSION,
    source: 'built-in',
    name,
    adult,
    concepts: Object.freeze(concepts),
    createdAt: null,
    updatedAt: null,
  })
}

export const ES_GENERAL_CATALOG: readonly BuiltInCategory[] = Object.freeze([
  category('es-b01', 'Animales', [
    'Elefante',
    'Pingüino',
    'Jirafa',
    'Pulpo',
    'Canguro',
    'Delfín',
    'Camaleón',
    'Nutria',
    'Flamenco',
    'Erizo',
  ]),
  category('es-b02', 'Comida y bebida', [
    'Tortilla de patatas',
    'Paella',
    'Chocolate caliente',
    'Gazpacho',
    'Croqueta',
    'Limonada',
    'Churros',
    'Sushi',
    'Helado',
    'Empanada',
  ]),
  category('es-b03', 'Lugares y viajes', [
    'Aeropuerto',
    'Faro',
    'Camping',
    'Isla desierta',
    'Estación de tren',
    'Museo',
    'Cascada',
    'Mercado callejero',
    'Parque nacional',
    'Pueblo costero',
  ]),
  category('es-b04', 'Cine y series', [
    'Película de espías',
    'Comedia romántica',
    'Documental',
    'Serie policiaca',
    'Cine mudo',
    'Película de animación',
    'Final inesperado',
    'Superhéroe',
    'Viaje en el tiempo',
    'Festival de cine',
  ]),
  category('es-b05', 'Música', [
    'Guitarra eléctrica',
    'Concierto',
    'Karaoke',
    'Batería',
    'Canción de cuna',
    'Festival de música',
    'Piano',
    'Auriculares',
    'Director de orquesta',
    'Vinilo',
  ]),
  category('es-b06', 'Deportes', [
    'Baloncesto',
    'Natación',
    'Escalada',
    'Tenis',
    'Ciclismo',
    'Surf',
    'Atletismo',
    'Patinaje',
    'Voleibol',
    'Tiro con arco',
  ]),
  category('es-b07', 'Profesiones', [
    'Arquitecta',
    'Bombero',
    'Veterinaria',
    'Periodista',
    'Panadero',
    'Astronauta',
    'Fotógrafa',
    'Jardinero',
    'Detective',
    'Piloto',
  ]),
  category('es-b08', 'Objetos cotidianos', [
    'Paraguas',
    'Llaves',
    'Despertador',
    'Mochila',
    'Espejo',
    'Linterna',
    'Tijeras',
    'Termo',
    'Almohada',
    'Cargador',
  ]),
  category('es-b09', 'Tecnología', [
    'Robot doméstico',
    'Impresora 3D',
    'Código QR',
    'Contraseña',
    'Videollamada',
    'Dron',
    'Reloj inteligente',
    'Realidad virtual',
    'Asistente de voz',
    'Panel solar',
  ]),
  category('es-b10', 'Personajes famosos', [
    'Frida Kahlo',
    'Miguel de Cervantes',
    'Marie Curie',
    'Pablo Picasso',
    'Amelia Earhart',
    'Albert Einstein',
    'Cleopatra',
    'Leonardo da Vinci',
    'Rafael Nadal',
    'Shakira',
  ]),
  category('es-b11', 'Videojuegos', [
    'Pantalla de carga',
    'Jefe final',
    'Mando de consola',
    'Nivel secreto',
    'Vida extra',
    'Partida cooperativa',
    'Mapa abierto',
    'Personaje desbloqueable',
    'Récord de puntos',
    'Misión secundaria',
  ]),
  category('es-b12', 'Naturaleza', [
    'Volcán',
    'Aurora boreal',
    'Arrecife de coral',
    'Bosque',
    'Tormenta',
    'Glaciar',
    'Desierto',
    'Eclipse',
    'Río',
    'Cueva',
  ]),
  category('es-b13', 'Cultura general', [
    'Biblioteca',
    'Brújula',
    'Pirámide',
    'Alfabeto',
    'Mapa del mundo',
    'Calendario',
    'Telescopio',
    'Moneda',
    'Bandera',
    'Enciclopedia',
  ]),
  category('es-b14', 'Palabras absurdas', [
    'Calcetín volador',
    'Sopa cuadrada',
    'Pingüino detective',
    'Ascensor submarino',
    'Bigote invisible',
    'Patata astronauta',
    'Semáforo dormido',
    'Tostadora cantante',
    'Nube de bolsillo',
    'Sombrero magnético',
  ]),
])
