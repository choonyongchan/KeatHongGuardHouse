/**
 * @fileoverview Group code generation utilities.
 * Produces short memorable 4–6 letter codes from a curated word list.
 */

const WORD_LIST: readonly string[] = [
  'APPLE','MANGO','GRAPE','LEMON','LIME','PEACH','PLUM','PEAR',
  'MELON','BERRY','KIWI','FIG','DATE','GUAVA','PAPAYA','LYCHEE',
  'OLIVE','CHERRY','ORANGE','BANANA','LOTUS','ROSE','TULIP','IRIS',
  'DAISY','FERN','PALM','CEDAR','MAPLE','OAK','ASH','ELM',
  'PINE','BIRCH','WILLOW','CORAL','AMBER','JADE','RUBY','ONYX',
  'OPAL','TOPAZ','PEARL','IVORY','EBONY','SANDY','AZURE','CRIMSON',
  'TEAL','INDIGO','VIOLET','CYAN','SCARLET','GOLDEN','SILVER','BRONZE',
  'COPPER','MAROON','NAVY','MINT','SAGE','DUNE','REEF','CREEK',
  'CREST','BROOK','CLIFF','GROVE','BLAZE','STORM','CLOUD','MIST',
  'FROST','FLAME','SPARK','EMBER','GALE','TIDE','WAVE','COVE',
  'VALE','RIDGE','PEAK','GLEN','DELL','FORD','KNOLL','MOOR',
  'SHIRE','HEATH','MARSH','BAYOU','DELTA','DUSK','DAWN','NOON',
  'NIGHT','STAR','COMET','ORBIT','SOLAR','LUNAR','NOVA','ZENITH',
  'TIGER','EAGLE','FALCON','HAWK','RAVEN','CRANE','HERON','SWIFT',
  'WREN','FINCH','ROBIN','LARK','DOVE','IBIS','EGRET','MARTIN',
  'OWL','KITE','BUNNY','FOX','WOLF','BEAR','LYNX','PANDA',
  'COBRA','GECKO','SABLE','TAWNY','DUSKY','MOCHA','HAZEL','OCHRE',
  'TAUPE','UMBER','SIENNA','BISQUE','ALMOND','WALNUT','MINK','SLATE',
  'STONE','FLINT','SHALE','ALPHA','BRAVO','ECHO',
];

/**
 * Picks a random word from the word list.
 *
 * @returns An uppercase word suitable for use as a group code.
 */
export function generateCode(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]!;
}

/**
 * Generates a unique group code by retrying until no collision is found.
 *
 * @param isCodeTaken - Async predicate that returns true if the code already exists.
 * @param maxRetries - Maximum number of attempts before giving up (default 10).
 * @returns A unique group code string.
 * @throws {Error} If a unique code cannot be generated within `maxRetries` attempts.
 */
export async function generateUniqueCode(
  isCodeTaken: (code: string) => Promise<boolean>,
  maxRetries = 10,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    if (!(await isCodeTaken(code))) return code;
  }
  throw new Error('Could not generate a unique group code after maximum retries');
}
