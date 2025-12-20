/**
 * Product Name Generator
 * 
 * Intelligently generates short, readable product names from descriptions.
 * Used when users don't provide a name and AI-suggested name isn't available.
 * 
 * Examples:
 * - "ring for finger made of rubber" → "Rubber Finger Ring"
 * - "bluetooth wireless earbuds for sports" → "Wireless Bluetooth Earbuds"
 * - "plastic storage container with lid" → "Plastic Storage Container"
 * - "women's cotton t-shirt short sleeve" → "Cotton T-Shirt"
 */

// Common materials (prioritized in name)
const MATERIALS = [
    'rubber', 'plastic', 'silicone', 'metal', 'steel', 'stainless steel', 
    'aluminum', 'aluminium', 'copper', 'brass', 'iron', 'titanium',
    'wood', 'wooden', 'bamboo', 'paper', 'cardboard',
    'glass', 'ceramic', 'porcelain', 'stone', 'marble', 'granite',
    'leather', 'faux leather', 'synthetic leather', 'suede',
    'cotton', 'polyester', 'nylon', 'silk', 'wool', 'linen', 'canvas', 'denim',
    'gold', 'silver', 'platinum', 'bronze',
    'carbon fiber', 'fiberglass', 'acrylic', 'polycarbonate', 'abs',
    'foam', 'memory foam', 'latex', 'vinyl', 'pvc',
];

// Common product types (the "what is it" part)
const PRODUCT_TYPES = [
    // Electronics
    'earbuds', 'headphones', 'speaker', 'charger', 'cable', 'adapter', 'battery',
    'phone case', 'tablet case', 'laptop', 'keyboard', 'mouse', 'monitor',
    'camera', 'drone', 'watch', 'smartwatch', 'fitness tracker',
    
    // Apparel
    't-shirt', 'tshirt', 'shirt', 'blouse', 'sweater', 'hoodie', 'jacket', 'coat',
    'pants', 'jeans', 'shorts', 'skirt', 'dress', 'suit',
    'socks', 'underwear', 'bra', 'boxers',
    'hat', 'cap', 'beanie', 'scarf', 'gloves', 'belt',
    'shoes', 'sneakers', 'boots', 'sandals', 'slippers', 'heels',
    
    // Home & Kitchen
    'bottle', 'cup', 'mug', 'glass', 'plate', 'bowl', 'utensil', 'cutlery',
    'pot', 'pan', 'kettle', 'blender', 'mixer', 'toaster', 'oven',
    'container', 'box', 'basket', 'bin', 'bag', 'pouch',
    'chair', 'table', 'desk', 'shelf', 'cabinet', 'drawer',
    'lamp', 'light', 'bulb', 'candle', 'mirror',
    'towel', 'blanket', 'pillow', 'sheet', 'curtain', 'rug', 'mat',
    
    // Accessories & Jewelry
    'ring', 'necklace', 'bracelet', 'earring', 'pendant', 'chain', 'brooch',
    'wallet', 'purse', 'handbag', 'backpack', 'briefcase', 'luggage',
    'sunglasses', 'glasses', 'eyewear',
    
    // Sports & Outdoor
    'ball', 'racket', 'bat', 'club', 'helmet', 'pad', 'guard',
    'tent', 'sleeping bag', 'backpack', 'cooler',
    'bicycle', 'bike', 'scooter', 'skateboard',
    
    // Tools & Hardware
    'tool', 'screwdriver', 'hammer', 'wrench', 'pliers', 'drill',
    'screw', 'nail', 'bolt', 'nut', 'washer', 'hinge', 'lock',
    'tape', 'adhesive', 'glue',
    
    // Toys & Games
    'toy', 'doll', 'figure', 'puzzle', 'game', 'card',
    'block', 'lego', 'model', 'robot',
    
    // Generic
    'device', 'machine', 'equipment', 'apparatus', 'instrument',
    'part', 'component', 'accessory', 'attachment',
    'cover', 'case', 'holder', 'stand', 'mount', 'rack',
];

// Modifiers that add value to the name
const MODIFIERS = [
    'wireless', 'bluetooth', 'electric', 'electronic', 'digital', 'smart',
    'portable', 'foldable', 'adjustable', 'rechargeable',
    'waterproof', 'water-resistant', 'dustproof',
    'mini', 'large', 'small', 'medium', 'xl', 'xxl',
    'professional', 'industrial', 'commercial', 'home',
    'outdoor', 'indoor', 'sports', 'fitness', 'travel',
    'automatic', 'manual', 'cordless',
    'led', 'lcd', 'hd', 'usb', 'hdmi',
];

// Words to exclude from the name
const EXCLUDE_WORDS = [
    'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'without',
    'of', 'in', 'on', 'at', 'to', 'from', 'by', 'as', 'is', 'are',
    'made', 'used', 'designed', 'suitable', 'perfect', 'ideal',
    'new', 'brand', 'quality', 'premium', 'high', 'low',
    'etc', 'other', 'similar', 'various', 'different',
    'men', 'women', 'mens', 'womens', "men's", "women's", 'unisex',
    'adult', 'child', 'children', 'kids', 'baby',
];

/**
 * Generate a short, readable product name from a description
 */
export function generateSmartProductName(description: string): string {
    if (!description || description.trim().length === 0) {
        return 'Product';
    }

    const lowerDesc = description.toLowerCase();
    const words = lowerDesc.split(/[\s,.\-_\/]+/).filter(w => w.length > 1);
    
    // Find material
    let material: string | null = null;
    for (const mat of MATERIALS) {
        if (lowerDesc.includes(mat)) {
            material = mat;
            break;
        }
    }
    
    // Find product type
    let productType: string | null = null;
    for (const type of PRODUCT_TYPES) {
        if (lowerDesc.includes(type)) {
            productType = type;
            break;
        }
    }
    
    // Find modifier (just one, most relevant)
    let modifier: string | null = null;
    for (const mod of MODIFIERS) {
        if (words.includes(mod)) {
            modifier = mod;
            break;
        }
    }
    
    // Build the name
    const nameParts: string[] = [];
    
    if (material) {
        nameParts.push(capitalize(material));
    }
    
    if (modifier && !material?.includes(modifier)) {
        nameParts.push(capitalize(modifier));
    }
    
    if (productType) {
        nameParts.push(capitalize(productType));
    }
    
    // If we found enough info, use it
    if (nameParts.length >= 2) {
        return nameParts.join(' ');
    }
    
    // Fallback: extract key nouns from description
    if (productType) {
        // We have a product type, add any adjective before it
        const typeIndex = words.indexOf(productType.split(' ')[0]);
        if (typeIndex > 0) {
            const prevWord = words[typeIndex - 1];
            if (!EXCLUDE_WORDS.includes(prevWord) && prevWord.length > 2) {
                return `${capitalize(prevWord)} ${capitalize(productType)}`;
            }
        }
        return capitalize(productType);
    }
    
    // Last resort: take first meaningful words
    const meaningfulWords = words
        .filter(w => !EXCLUDE_WORDS.includes(w) && w.length > 2)
        .slice(0, 3);
    
    if (meaningfulWords.length > 0) {
        return meaningfulWords.map(capitalize).join(' ');
    }
    
    // Absolute fallback
    return 'Product';
}

/**
 * Capitalize first letter of each word
 */
function capitalize(str: string): string {
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Generate product name with HTS code context
 * Can use HTS description for additional hints
 */
export function generateProductNameWithContext(
    description: string,
    htsDescription?: string
): string {
    // Try with description first
    let name = generateSmartProductName(description);
    
    // If we got a generic name, try HTS description
    if (name === 'Product' && htsDescription) {
        name = generateSmartProductName(htsDescription);
    }
    
    return name;
}

export default generateSmartProductName;

