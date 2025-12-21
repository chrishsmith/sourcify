/**
 * HTS Chapter Knowledge Base
 * Maps product categories, materials, and functions to likely HTS chapters
 * 
 * This is the "brain" that guides our search strategy before hitting USITC
 */

// ═══════════════════════════════════════════════════════════════════════════
// HTS STRUCTURE REFERENCE
// ═══════════════════════════════════════════════════════════════════════════
// 
// 22 Sections containing 97 Chapters:
// Section I (Ch 1-5): Live Animals, Animal Products
// Section II (Ch 6-14): Vegetable Products
// Section III (Ch 15): Animal/Vegetable Fats and Oils
// Section IV (Ch 16-24): Prepared Foodstuffs
// Section V (Ch 25-27): Mineral Products
// Section VI (Ch 28-38): Chemical Products
// Section VII (Ch 39-40): PLASTICS AND RUBBER ← Common for consumer goods
// Section VIII (Ch 41-43): Leather, Travel Goods
// Section IX (Ch 44-46): Wood Products
// Section X (Ch 47-49): Pulp, Paper, Books
// Section XI (Ch 50-63): TEXTILES ← Clothing, fabrics
// Section XII (Ch 64-67): Footwear, Headgear
// Section XIII (Ch 68-70): Stone, Ceramic, Glass
// Section XIV (Ch 71): Precious Metals, Jewelry
// Section XV (Ch 72-83): BASE METALS ← Steel, iron, aluminum products
// Section XVI (Ch 84-85): MACHINERY & ELECTRONICS ← Machines, electrical
// Section XVII (Ch 86-89): Vehicles, Aircraft, Ships
// Section XVIII (Ch 90-92): Instruments, Clocks, Musical
// Section XIX (Ch 93): Arms and Ammunition
// Section XX (Ch 94-96): Furniture, Toys, Misc
// Section XXI (Ch 97): Works of Art
// Section XXII (Ch 98-99): Special Classifications

export interface ChapterInfo {
    chapter: string;
    section: number;
    title: string;
    description: string;
    commonProducts: string[];
    keyMaterials: string[];
    notes: string[];
    exclusions?: string[];
}

export interface ProductCategoryMapping {
    category: string;
    keywords: string[];
    primaryChapters: string[];
    materialOverrides?: Record<string, string[]>;
    notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER DEFINITIONS (Key chapters for classification)
// ═══════════════════════════════════════════════════════════════════════════

export const HTS_CHAPTERS: Record<string, ChapterInfo> = {
    '71': {
        chapter: '71',
        section: 14,
        title: 'Natural or Cultured Pearls, Precious Stones, Precious Metals; Imitation Jewelry',
        description: 'Precious metals, jewelry, imitation jewelry, and bijouterie',
        commonProducts: [
            'gold jewelry', 'silver jewelry', 'diamonds', 'pearls',
            'costume jewelry', 'imitation jewelry', 'bijouterie',
            'fashion rings', 'necklaces', 'bracelets', 'earrings',
            'finger rings', 'toe rings', 'body jewelry', 'fashion accessories'
        ],
        keyMaterials: [
            'gold', 'silver', 'platinum', 'base metal (plated)',
            'plastic (imitation jewelry)', 'rubber (fashion jewelry)',
            'glass (imitation gems)', 'any material (fashion/costume jewelry)'
        ],
        notes: [
            '7113: Jewelry of precious metal',
            '7117: IMITATION JEWELRY - includes fashion jewelry of ANY material',
            '7117.19: Of base metal (plated or not)',
            '7117.90: OTHER imitation jewelry - includes plastic, rubber, textile jewelry',
            'IMPORTANT: Fashion rings, bracelets, etc. worn as accessories = 7117, not 39/40'
        ]
    },
    '39': {
        chapter: '39',
        section: 7,
        title: 'Plastics and Articles Thereof',
        description: 'Covers plastics in primary forms and articles made of plastics',
        commonProducts: [
            'plastic containers', 'plastic bags', 'plastic sheets', 'plastic tubes',
            'plastic housings', 'plastic parts', 'foam products', 'plastic furniture parts',
            'ear plugs (foam/plastic)', 'protective covers', 'plastic cases (non-luggage)'
        ],
        keyMaterials: [
            'plastic', 'polyethylene', 'polypropylene', 'PVC', 'polyurethane', 'nylon',
            'ABS', 'polycarbonate', 'acrylic', 'silicone', 'foam', 'PU foam', 'EVA'
        ],
        notes: [
            'Note 2(ij): Chapter 39 does NOT cover goods of Section XI (textiles)',
            'Note 2(p): Does NOT cover articles of Chapter 42 (travel goods, handbags)',
            'If goods have essential character of textiles, use Ch 61-63 instead',
            'Heading 3926 is the catch-all for "other articles of plastics"'
        ],
        exclusions: ['luggage', 'handbags', 'textile products', 'footwear']
    },
    '40': {
        chapter: '40',
        section: 7,
        title: 'Rubber and Articles Thereof',
        description: 'Covers rubber in all forms and rubber articles',
        commonProducts: [
            'rubber gaskets', 'O-rings', 'rubber seals', 'rubber hoses',
            'rubber gloves', 'rubber mats', 'tires', 'inner tubes'
        ],
        keyMaterials: [
            'rubber', 'natural rubber', 'synthetic rubber', 'latex',
            'neoprene', 'EPDM', 'nitrile', 'silicone rubber'
        ],
        notes: [
            'Note 1: Excludes goods classifiable elsewhere due to their form or use',
            'Heading 4016 is the catch-all for "other articles of rubber"'
        ]
    },
    '42': {
        chapter: '42',
        section: 8,
        title: 'Articles of Leather; Travel Goods; Handbags',
        description: 'Travel goods, handbags, cases REGARDLESS of material',
        commonProducts: [
            'suitcases', 'briefcases', 'handbags', 'wallets', 'backpacks',
            'laptop bags', 'camera cases', 'jewelry boxes', 'toiletry kits'
        ],
        keyMaterials: [
            'leather', 'any material' // Material doesn't matter for 4202!
        ],
        notes: [
            'IMPORTANT: Chapter 42 is about FUNCTION not material',
            'Heading 4202 covers cases/bags for carrying things regardless of material',
            '4202 includes: plastic handbags, fabric backpacks, leather wallets',
            'Does NOT include: tool rolls (8206), spectacle cases (9004)'
        ]
    },
    '61': {
        chapter: '61',
        section: 11,
        title: 'Articles of Apparel - Knitted or Crocheted',
        description: 'Knit clothing and accessories',
        commonProducts: [
            't-shirts', 'sweaters', 'hoodies', 'socks', 'underwear (knit)',
            'jerseys', 'pullovers', 'cardigans'
        ],
        keyMaterials: [
            'cotton', 'polyester', 'wool', 'acrylic', 'nylon', 'spandex'
        ],
        notes: [
            'Key: Must be KNITTED or CROCHETED construction',
            'Look for: jersey, rib knit, interlock, fleece construction'
        ]
    },
    '62': {
        chapter: '62',
        section: 11,
        title: 'Articles of Apparel - Not Knitted',
        description: 'Woven clothing and accessories',
        commonProducts: [
            'dress shirts', 'pants', 'jackets', 'suits', 'dresses',
            'skirts', 'shorts (woven)', 'coats'
        ],
        keyMaterials: [
            'cotton', 'polyester', 'wool', 'linen', 'silk', 'nylon'
        ],
        notes: [
            'Key: Woven or non-knit construction',
            'Material composition determines subheading'
        ]
    },
    '64': {
        chapter: '64',
        section: 12,
        title: 'Footwear',
        description: 'All types of footwear',
        commonProducts: [
            'shoes', 'boots', 'sandals', 'sneakers', 'slippers',
            'athletic footwear', 'safety footwear'
        ],
        keyMaterials: [
            'leather', 'rubber', 'plastic', 'textile'
        ],
        notes: [
            'Upper material determines classification',
            '6402: Rubber/plastic footwear',
            '6403: Leather upper footwear',
            '6404: Textile upper footwear'
        ]
    },
    '73': {
        chapter: '73',
        section: 15,
        title: 'Articles of Iron or Steel',
        description: 'Steel and iron products',
        commonProducts: [
            'steel screws', 'bolts', 'nuts', 'steel pipe', 'steel fittings',
            'steel containers', 'steel wire', 'steel chain'
        ],
        keyMaterials: [
            'steel', 'iron', 'stainless steel', 'carbon steel', 'alloy steel'
        ],
        notes: [
            'Heading 7318: Screws, bolts, nuts, washers',
            'Heading 7326: Other articles of iron or steel (catch-all)'
        ]
    },
    '76': {
        chapter: '76',
        section: 15,
        title: 'Aluminum and Articles Thereof',
        description: 'Aluminum products',
        commonProducts: [
            'aluminum extrusions', 'aluminum foil', 'aluminum cans',
            'aluminum sheets', 'aluminum wire', 'aluminum fittings'
        ],
        keyMaterials: [
            'aluminum', 'aluminium', 'aluminum alloy'
        ],
        notes: [
            'Heading 7616: Other articles of aluminum (catch-all)'
        ]
    },
    '84': {
        chapter: '84',
        section: 16,
        title: 'Nuclear Reactors, Boilers, Machinery',
        description: 'Mechanical machinery and parts',
        commonProducts: [
            'pumps', 'compressors', 'engines', 'motors (non-electric)',
            'air conditioners', 'refrigerators', 'washing machines',
            'computers', 'printers', 'machinery parts'
        ],
        keyMaterials: ['various'],
        notes: [
            '8471: Computers and data processing machines',
            '8473: Parts for computers',
            '8481: Valves and taps',
            '8473: Machinery parts (many types)'
        ]
    },
    '85': {
        chapter: '85',
        section: 16,
        title: 'Electrical Machinery and Equipment',
        description: 'Electrical and electronic goods',
        commonProducts: [
            'motors (electric)', 'transformers', 'batteries', 'switches',
            'cables', 'connectors', 'LEDs', 'phones', 'headphones',
            'speakers', 'monitors', 'chargers', 'power supplies'
        ],
        keyMaterials: ['various'],
        notes: [
            '8517: Telephones, smartphones, network equipment',
            '8518: Audio equipment (speakers, microphones, headphones)',
            '8523: Storage media (USB drives, memory cards)',
            '8536: Electrical switches, connectors',
            '8544: Cables, wires'
        ]
    },
    '90': {
        chapter: '90',
        section: 18,
        title: 'Optical, Medical, Measuring Instruments',
        description: 'Precision instruments and medical devices',
        commonProducts: [
            'cameras', 'lenses', 'microscopes', 'thermometers',
            'medical instruments', 'measuring devices', 'lab equipment'
        ],
        keyMaterials: ['various'],
        notes: [
            'Heading 9004: Spectacles, goggles',
            'Heading 9018: Medical instruments',
            'Chapter 90 usually takes precedence for instruments'
        ]
    },
    '94': {
        chapter: '94',
        section: 20,
        title: 'Furniture; Bedding; Lamps',
        description: 'Furniture and furnishings',
        commonProducts: [
            'chairs', 'tables', 'desks', 'beds', 'mattresses',
            'lamps', 'lighting fixtures', 'shelving'
        ],
        keyMaterials: ['wood', 'metal', 'plastic', 'upholstery'],
        notes: [
            '9401: Seats',
            '9403: Other furniture',
            '9405: Lamps and lighting fittings'
        ]
    },
    '95': {
        chapter: '95',
        section: 20,
        title: 'Toys, Games, Sports Equipment',
        description: 'Recreational goods',
        commonProducts: [
            'toys', 'games', 'sporting goods', 'exercise equipment',
            'swimming pools', 'Christmas decorations'
        ],
        keyMaterials: ['various'],
        notes: [
            '9503: Toys',
            '9504: Video games, gaming consoles',
            '9506: Sports equipment',
            'Note: Safety equipment may go here or Ch 39/40'
        ]
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT CATEGORY MAPPINGS
// Maps common product types to their likely chapters
// ═══════════════════════════════════════════════════════════════════════════

export const PRODUCT_CATEGORY_MAPPINGS: ProductCategoryMapping[] = [
    // ───────────────────────────────────────────────────────────────────
    // JEWELRY / ACCESSORIES (worn on the body as adornment)
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Jewelry / Fashion Accessories',
        keywords: [
            'ring', 'finger ring', 'toe ring', 'necklace', 'bracelet', 
            'earring', 'anklet', 'pendant', 'charm', 'bangle', 'cuff',
            'fashion jewelry', 'costume jewelry', 'imitation jewelry',
            'body jewelry', 'bijouterie', 'fashion accessory'
        ],
        primaryChapters: ['71'], // Chapter 71 for jewelry
        materialOverrides: {
            'gold': ['71'],       // Precious metal jewelry
            'silver': ['71'],     // Precious metal jewelry
            'platinum': ['71'],   // Precious metal jewelry
            'rubber': ['71'],     // Fashion/imitation jewelry of rubber
            'plastic': ['71'],    // Fashion/imitation jewelry of plastic
            'silicone': ['71'],   // Fashion/imitation jewelry of silicone
            'base metal': ['71'], // Imitation jewelry of base metal
            'textile': ['71'],    // Textile jewelry/accessories
            'leather': ['71'],    // Leather bracelets, etc.
        },
        notes: [
            'IMPORTANT: Items worn on the body as adornment → Chapter 71',
            '7113: Jewelry of precious metal (gold, silver, platinum)',
            '7117: IMITATION JEWELRY - covers fashion jewelry of ANY material',
            '7117.90: Other imitation jewelry (rubber, plastic, textile, etc.)',
            'Rubber finger rings worn as accessories → 7117.90, NOT 4016',
            'Key: Ask "Is this worn as jewelry/adornment?" If yes → 71'
        ]
    },

    // ───────────────────────────────────────────────────────────────────
    // HEARING PROTECTION / EAR PLUGS
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Hearing Protection / Ear Plugs',
        keywords: ['ear plug', 'earplug', 'earplugs', 'hearing protection', 'noise reduction', 'ear defender'],
        primaryChapters: ['39'], // Default: Plastic articles
        materialOverrides: {
            'foam': ['39'],
            'polyurethane': ['39'],
            'silicone': ['39'],
            'rubber': ['40'],
            'electronic': ['85'], // Electronic ear plugs with active noise cancellation
        },
        notes: [
            'Foam/plastic ear plugs → 3926.90 (Other articles of plastics)',
            'Rubber ear plugs → 4016.99 (Other articles of rubber)',
            'Electronic hearing protection → 8518 (Audio equipment)',
            'NOT Chapter 42 (these are not "cases" or "containers")'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // PHONE CASES / PROTECTIVE CASES
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Phone Cases / Device Cases',
        keywords: ['phone case', 'smartphone case', 'tablet case', 'device case', 'protective case', 'phone cover'],
        primaryChapters: ['42'], // Cases for carrying = 4202
        materialOverrides: {}, // Material doesn't matter for 4202
        notes: [
            'Phone cases designed to carry/protect the device → 4202.99',
            'This is "containers" classification by function, not material',
            'CBP Ruling: Phone cases are "containers" under 4202'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // BAGS / LUGGAGE / CASES
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Bags and Luggage',
        keywords: ['bag', 'backpack', 'suitcase', 'luggage', 'handbag', 'briefcase', 'wallet', 'purse', 'tote'],
        primaryChapters: ['42'],
        notes: [
            '4202 covers ALL bags regardless of material',
            'Subheading determined by article type and outer surface material'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // CLOTHING / APPAREL
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Clothing - Knit',
        keywords: ['t-shirt', 'tee', 'sweater', 'hoodie', 'jersey', 'pullover', 'sock', 'underwear knit'],
        primaryChapters: ['61'],
        notes: [
            'Knit/crochet construction → Chapter 61',
            'Material composition determines subheading within 61'
        ]
    },
    {
        category: 'Clothing - Woven',
        keywords: ['shirt', 'blouse', 'pants', 'trousers', 'jacket', 'suit', 'dress', 'skirt', 'coat'],
        primaryChapters: ['62'],
        notes: [
            'Woven construction → Chapter 62',
            'Material composition determines subheading within 62'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // FOOTWEAR
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Footwear',
        keywords: ['shoe', 'boot', 'sandal', 'sneaker', 'slipper', 'footwear'],
        primaryChapters: ['64'],
        materialOverrides: {
            'rubber': ['64'], // 6402
            'plastic': ['64'], // 6402
            'leather': ['64'], // 6403
            'textile': ['64'], // 6404
        },
        notes: [
            'Upper material determines subheading',
            '6402: Rubber/plastic uppers',
            '6403: Leather uppers',
            '6404: Textile uppers'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // ELECTRONICS
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Electronics - Audio',
        keywords: ['headphone', 'earphone', 'speaker', 'microphone', 'amplifier', 'audio'],
        primaryChapters: ['85'],
        notes: [
            '8518: Microphones, speakers, headphones, amplifiers',
            'Key: Must have electronic/audio function'
        ]
    },
    {
        category: 'Electronics - Computing',
        keywords: ['computer', 'laptop', 'tablet', 'keyboard', 'mouse', 'monitor', 'printer', 'server'],
        primaryChapters: ['84'],
        notes: [
            '8471: Data processing machines (computers)',
            '8473: Parts and accessories for computers'
        ]
    },
    {
        category: 'Electronics - Communication',
        keywords: ['phone', 'smartphone', 'router', 'modem', 'network', 'telecommunication'],
        primaryChapters: ['85'],
        notes: [
            '8517: Telephones, network equipment, smartphones'
        ]
    },
    {
        category: 'Electronics - Cables/Connectors',
        keywords: ['cable', 'wire', 'connector', 'plug', 'adapter', 'charger'],
        primaryChapters: ['85'],
        notes: [
            '8536: Electrical switches, connectors under 1000V',
            '8544: Insulated wire, cables, connectors'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // PLASTIC ARTICLES (GENERAL)
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Plastic Articles - General',
        keywords: ['plastic container', 'plastic box', 'plastic sheet', 'plastic tube', 'plastic part', 'plastic housing'],
        primaryChapters: ['39'],
        notes: [
            '3923: Plastic containers (boxes, crates, bottles)',
            '3926: Other articles of plastics (catch-all)',
            'If function defines it (bag, case), may be Ch 42 instead'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // METAL ARTICLES
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Steel/Iron Articles',
        keywords: ['steel', 'iron', 'stainless', 'screw', 'bolt', 'nut', 'washer', 'fastener'],
        primaryChapters: ['73'],
        notes: [
            '7318: Screws, bolts, nuts, washers',
            '7326: Other articles of iron or steel'
        ]
    },
    {
        category: 'Aluminum Articles',
        keywords: ['aluminum', 'aluminium', 'aluminum extrusion', 'aluminum part'],
        primaryChapters: ['76'],
        notes: [
            '7616: Other articles of aluminum'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // FURNITURE
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Furniture',
        keywords: ['chair', 'table', 'desk', 'shelf', 'cabinet', 'bed', 'sofa', 'couch'],
        primaryChapters: ['94'],
        notes: [
            '9401: Seats (chairs, sofas)',
            '9403: Other furniture (tables, desks, cabinets)'
        ]
    },
    
    // ───────────────────────────────────────────────────────────────────
    // TOYS
    // ───────────────────────────────────────────────────────────────────
    {
        category: 'Toys and Games',
        keywords: ['toy', 'game', 'puzzle', 'doll', 'action figure', 'board game', 'stuffed'],
        primaryChapters: ['95'],
        notes: [
            '9503: Toys (all types)',
            '9504: Video games, gaming consoles'
        ]
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// HEADING-LEVEL MAPPINGS (More specific)
// ═══════════════════════════════════════════════════════════════════════════

export interface HeadingMapping {
    heading: string;
    description: string;
    matchPatterns: string[];
    materialConditions?: string[];
    notes: string[];
}

export const HEADING_MAPPINGS: HeadingMapping[] = [
    // Chapter 71 headings - JEWELRY
    {
        heading: '7113',
        description: 'Articles of jewelry and parts thereof, of precious metal',
        matchPatterns: [
            'gold ring', 'silver ring', 'platinum ring', 'gold necklace',
            'gold bracelet', 'silver bracelet', 'precious metal jewelry'
        ],
        materialConditions: ['gold', 'silver', 'platinum', 'precious metal'],
        notes: [
            '7113.11: Silver jewelry',
            '7113.19: Other precious metal jewelry',
            '7113.20: Of base metal clad with precious metal'
        ]
    },
    {
        heading: '7117',
        description: 'Imitation jewelry',
        matchPatterns: [
            'finger ring', 'toe ring', 'fashion ring', 'costume ring',
            'rubber ring worn', 'silicone ring', 'plastic ring',
            'bracelet', 'necklace', 'earring', 'fashion jewelry',
            'costume jewelry', 'imitation jewelry', 'bijouterie',
            'bangle', 'anklet', 'body jewelry', 'fashion accessory'
        ],
        materialConditions: ['rubber', 'plastic', 'silicone', 'base metal', 'textile', 'leather', 'glass'],
        notes: [
            '7117.11: Cuff links and studs',
            '7117.19: Other imitation jewelry of base metal',
            '7117.90: OTHER imitation jewelry - CATCH-ALL for rubber, plastic, textile jewelry',
            'IMPORTANT: Finger rings made of rubber/plastic/silicone for wearing → 7117.90',
            'NOT 4016 (mechanical rubber articles) or 3926 (plastic articles)'
        ]
    },

    // Chapter 39 headings
    {
        heading: '3926',
        description: 'Other articles of plastics',
        matchPatterns: [
            'plastic article', 'foam plug', 'ear plug plastic', 'earplug foam',
            'plastic cover', 'plastic handle', 'plastic knob', 'plastic cap',
            'plastic sign', 'plastic label', 'identification card'
        ],
        materialConditions: ['plastic', 'polyurethane', 'silicone', 'foam', 'PVC', 'nylon', 'ABS'],
        notes: [
            '3926.90.99 is the catch-all for "other" plastic articles',
            'Very common destination for miscellaneous plastic goods'
        ]
    },
    
    // Chapter 40 headings
    {
        heading: '4016',
        description: 'Other articles of rubber',
        matchPatterns: [
            'rubber gasket', 'rubber seal', 'o-ring', 'rubber mat',
            'rubber part', 'rubber bumper', 'rubber grommet'
        ],
        materialConditions: ['rubber', 'latex', 'neoprene', 'EPDM'],
        notes: [
            '4016.93: Gaskets, washers, seals',
            '4016.99: Other articles of rubber'
        ]
    },
    
    // Chapter 42 headings
    {
        heading: '4202',
        description: 'Trunks, suitcases, vanity cases, briefcases, school satchels, spectacle cases, binocular cases, camera cases, musical instrument cases, gun cases, holsters and similar containers',
        matchPatterns: [
            'case', 'bag', 'backpack', 'suitcase', 'handbag', 'wallet',
            'laptop bag', 'camera case', 'phone case', 'tablet case',
            'briefcase', 'tote bag', 'duffel bag', 'messenger bag'
        ],
        notes: [
            'FUNCTION-BASED: If it carries/protects something, likely 4202',
            '4202.12: Plastic/textile travel bags',
            '4202.32: Plastic/textile wallets, card cases',
            '4202.92: Other containers of plastic/textile'
        ]
    },
    
    // Chapter 85 headings
    {
        heading: '8518',
        description: 'Microphones, loudspeakers, headphones, earphones, audio-frequency amplifiers',
        matchPatterns: [
            'headphone', 'earphone', 'earbud', 'speaker', 'microphone',
            'amplifier', 'audio equipment', 'sound system'
        ],
        notes: [
            '8518.30: Headphones and earphones',
            'Requires electronic audio function'
        ]
    },
    {
        heading: '8517',
        description: 'Telephone sets and other apparatus for transmission/reception',
        matchPatterns: [
            'phone', 'smartphone', 'telephone', 'router', 'modem',
            'network equipment', 'wifi', 'wireless'
        ],
        notes: [
            '8517.12: Cellular phones (smartphones)',
            '8517.62: Routers, modems, network equipment'
        ]
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find matching product categories based on description and material
 */
export function findMatchingCategories(
    description: string,
    material?: string
): ProductCategoryMapping[] {
    const descLower = description.toLowerCase();
    const matLower = material?.toLowerCase() || '';
    
    const matches: ProductCategoryMapping[] = [];
    
    for (const mapping of PRODUCT_CATEGORY_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (descLower.includes(keyword.toLowerCase())) {
                matches.push(mapping);
                break;
            }
        }
    }
    
    return matches;
}

/**
 * Determine most likely chapters for a product
 */
export function getLikelyChapters(
    description: string,
    material?: string
): { chapter: string; confidence: number; reason: string }[] {
    const results: { chapter: string; confidence: number; reason: string }[] = [];
    const descLower = description.toLowerCase();
    const matLower = material?.toLowerCase() || '';
    
    // Find category matches
    const categoryMatches = findMatchingCategories(description, material);
    
    for (const cat of categoryMatches) {
        // Check for material overrides
        if (cat.materialOverrides && matLower) {
            for (const [matKey, chapters] of Object.entries(cat.materialOverrides)) {
                if (matLower.includes(matKey)) {
                    for (const ch of chapters) {
                        results.push({
                            chapter: ch,
                            confidence: 90,
                            reason: `${cat.category} + ${matKey} material → Chapter ${ch}`
                        });
                    }
                }
            }
        }
        
        // Add primary chapters
        for (const ch of cat.primaryChapters) {
            if (!results.find(r => r.chapter === ch)) {
                results.push({
                    chapter: ch,
                    confidence: 80,
                    reason: `${cat.category} → Chapter ${ch}`
                });
            }
        }
    }
    
    // Material-based fallback if no category match
    if (results.length === 0) {
        if (matLower.includes('plastic') || matLower.includes('polyurethane') || 
            matLower.includes('silicone') || matLower.includes('foam') ||
            matLower.includes('nylon') || matLower.includes('abs') ||
            matLower.includes('pvc')) {
            results.push({ chapter: '39', confidence: 70, reason: 'Plastic material → Chapter 39' });
        }
        if (matLower.includes('rubber') || matLower.includes('latex') || 
            matLower.includes('neoprene') || matLower.includes('epdm')) {
            results.push({ chapter: '40', confidence: 70, reason: 'Rubber material → Chapter 40' });
        }
        if (matLower.includes('steel') || matLower.includes('iron') || 
            matLower.includes('stainless')) {
            results.push({ chapter: '73', confidence: 70, reason: 'Steel/Iron material → Chapter 73' });
        }
        if (matLower.includes('aluminum') || matLower.includes('aluminium')) {
            results.push({ chapter: '76', confidence: 70, reason: 'Aluminum material → Chapter 76' });
        }
        if (matLower.includes('cotton') || matLower.includes('polyester') ||
            matLower.includes('textile') || matLower.includes('fabric')) {
            // Could be 61 or 62 depending on construction
            results.push({ chapter: '61', confidence: 60, reason: 'Textile material → Chapter 61 (if knit)' });
            results.push({ chapter: '62', confidence: 60, reason: 'Textile material → Chapter 62 (if woven)' });
        }
    }
    
    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get chapter info with full details
 */
export function getChapterInfo(chapter: string): ChapterInfo | undefined {
    return HTS_CHAPTERS[chapter];
}

/**
 * Find relevant headings for a product within a chapter
 */
export function getRelevantHeadings(
    chapter: string,
    description: string
): HeadingMapping[] {
    const descLower = description.toLowerCase();
    
    return HEADING_MAPPINGS.filter(h => {
        if (!h.heading.startsWith(chapter)) return false;
        
        for (const pattern of h.matchPatterns) {
            if (descLower.includes(pattern.toLowerCase())) {
                return true;
            }
        }
        return false;
    });
}


