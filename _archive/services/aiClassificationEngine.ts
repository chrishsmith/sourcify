/**
 * AI-First Classification Engine
 * 
 * The AI is the CUSTOMS EXPERT, not just a keyword extractor.
 * 
 * OLD APPROACH (fragmented):
 *   User input → AI extracts attributes → Search DB → Score results → Pick best
 * 
 * NEW APPROACH (AI-first):
 *   User input → AI deeply understands product → AI recommends specific codes → Validate
 * 
 * The AI should understand:
 * 1. What the product ACTUALLY IS (semantically)
 * 2. The HTS chapter structure and what belongs where
 * 3. Common misclassification traps to avoid
 * 
 * @module aiClassificationEngine
 * @created December 24, 2025
 */

import { getXAIClient } from '@/lib/xai';
import { searchHtsCodes, getHtsCode, getHtsCodesByChapter, HtsLevel } from '@/services/hts/database';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIClassificationRecommendation {
  // The AI's understanding of what this product IS
  productUnderstanding: {
    whatThisIs: string;           // "A small decorative container for holding houseplants indoors"
    primaryFunction: string;       // "Hold soil and plants for home decoration"
    userContext: string;           // "Consumer home use"
    typicalMaterials: string[];    // ["plastic", "ceramic", "terracotta", "metal"]
    typicalSize: string;           // "Small to medium (0.5L - 20L)"
  };
  
  // AI's DIRECT recommendations for HTS codes
  recommendations: {
    primary: AICodeRecommendation;
    byMaterial: AICodeRecommendation[];  // Different codes based on material
    alternatives: AICodeRecommendation[];
  };
  
  // What codes to AVOID and why
  avoidCodes: {
    code: string;
    reason: string;
  }[];
  
  // Questions to refine classification
  refinementQuestions: {
    question: string;
    impact: 'high' | 'medium' | 'low';
    options: string[];
    affects: string;  // Which attribute this affects
  }[];
  
  // AI confidence in its understanding
  confidence: number;
  reasoning: string;
}

export interface AICodeRecommendation {
  htsCode: string;
  description: string;
  chapter: string;
  reasoning: string;
  conditions?: string;  // "If made of plastic", "If ceramic"
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CLASSIFICATION PROMPT
// This is where the AI's knowledge lives - it understands HTS structure
// ═══════════════════════════════════════════════════════════════════════════════

const AI_CLASSIFICATION_PROMPT = `You are a U.S. Customs HTS classification EXPERT with deep knowledge of:
1. What products actually ARE (semantically, not just keywords)
2. The HTS chapter structure and what belongs where
3. Common misclassification traps

PRODUCT TO CLASSIFY:
"{description}"

═══════════════════════════════════════════════════════════════════════════════
STEP 1: DEEPLY UNDERSTAND THE PRODUCT
═══════════════════════════════════════════════════════════════════════════════

Before classifying, THINK about what this product ACTUALLY IS:
- What is its PRIMARY FUNCTION? (not secondary uses)
- WHO uses it? (consumers at home, businesses, industry)
- What is it MADE OF typically?
- What SIZE is it typically?

Example thought process for "indoor planter":
- What is it? → A container for holding soil and plants inside a home
- Primary function → Decorative pot for houseplants
- Who uses it? → Consumers in their homes (NOT farmers, NOT construction)
- Typical materials → Plastic, ceramic, terracotta, metal
- Typical size → Small to medium (0.5L to 20L)

═══════════════════════════════════════════════════════════════════════════════
STEP 2: KNOW THE HTS STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

Key chapters and what they contain:

HOUSEHOLD ARTICLES (for consumer home use):
- Chapter 39 (3924): Plastic household articles - tableware, kitchenware, other household
- Chapter 69 (6912): Ceramic household articles - tableware, kitchenware, other household
- Chapter 70 (7013): Glass household articles - tableware, drinkware
- Chapter 73 (7323): Iron/steel household articles - table, kitchen, household

AVOID THESE FOR HOME ITEMS:
- 3925: Builder's ware - for CONSTRUCTION materials, not home decor
- 6911: Hotel/restaurant ware - for COMMERCIAL food service, not homes
- 6913: Ornamental ceramics/statues - for DECORATIVE STATUES, not functional containers
- 84xx: Machinery - for EQUIPMENT, not containers

COMMON TRAPS:
- "planter" is NOT agricultural machinery (84) - it's a household container (39/69/73)
- "indoor" items are NOT industrial (exceeding 300L) - they're small household
- "pot" for plants is NOT "hotel ware" - it's household articles

═══════════════════════════════════════════════════════════════════════════════
STEP 3: RECOMMEND SPECIFIC 10-DIGIT HTS CODES
═══════════════════════════════════════════════════════════════════════════════

IMPORTANT: Always provide FULL 10-digit HTS codes (e.g., 3924.90.56.00), not just headings (3924).

HTS Code Structure:
- Chapter: 2 digits (39)
- Heading: 4 digits (3924)
- Subheading: 6 digits (3924.90)
- Tariff line: 8 digits (3924.90.56)
- Statistical suffix: 10 digits (3924.90.56.00)

You MUST provide at least 6-digit codes, preferably 8-10 digits for accuracy.

For items where material matters (containers, household items):
- Provide the PRIMARY recommendation (most likely material) with FULL code
- Provide BY-MATERIAL alternatives with FULL codes

Return JSON:
{
  "productUnderstanding": {
    "whatThisIs": "A small decorative container for holding houseplants indoors",
    "primaryFunction": "Hold soil and plants for home decoration",
    "userContext": "Consumer home use",
    "typicalMaterials": ["plastic", "ceramic", "terracotta", "metal"],
    "typicalSize": "Small to medium (0.5L - 20L)"
  },
  "recommendations": {
    "primary": {
      "htsCode": "3924.90.56.00",
      "description": "Other household articles of plastics, other",
      "chapter": "39",
      "reasoning": "Most common material for indoor planters is plastic; 3924.90.56 is for other household articles of plastics",
      "conditions": "If made of plastic (most common)",
      "confidence": 0.85
    },
    "byMaterial": [
      {
        "htsCode": "6912.00.48.00",
        "description": "Ceramic tableware, kitchenware, other household articles, other",
        "chapter": "69",
        "reasoning": "For ceramic/terracotta planters - 6912.00.48 is household articles not hotel ware",
        "conditions": "If ceramic or terracotta",
        "confidence": 0.90
      },
      {
        "htsCode": "7323.99.90.80",
        "description": "Other household articles of iron or steel, other",
        "chapter": "73",
        "reasoning": "For metal planters - 7323.99.90 is household articles of iron/steel",
        "conditions": "If metal",
        "confidence": 0.85
      }
    ],
    "alternatives": []
  },
  "avoidCodes": [
    {"code": "3925", "reason": "Builder's ware is for construction materials - planters are household articles"},
    {"code": "6911", "reason": "Hotel/restaurant ware - this is for HOME use, not commercial"},
    {"code": "6913", "reason": "Ornamental statues - a planter is a functional container, not a decorative statue"},
    {"code": "8432", "reason": "Agricultural machinery - a planter pot is NOT farming equipment"}
  ],
  "refinementQuestions": [
    {
      "question": "What material is your planter made of?",
      "impact": "high",
      "options": ["Plastic", "Ceramic/Terracotta", "Metal", "Glass", "Wood"],
      "affects": "material"
    }
  ],
  "confidence": 0.85,
  "reasoning": "Indoor planter is clearly a household container for plants. The correct HTS heading depends on material, but it should always be under household articles (3924 for plastic, 6912 for ceramic, 7323 for metal), NOT builder's ware (3925) or agricultural machinery (84)."
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function classifyWithAI(
  description: string,
  options: {
    material?: string;
    use?: string;
    additionalContext?: string;
  } = {}
): Promise<AIClassificationRecommendation> {
  const xai = getXAIClient();
  
  // Build enhanced description with any additional context
  let enhancedDescription = description;
  if (options.material) enhancedDescription += `. Material: ${options.material}`;
  if (options.use) enhancedDescription += `. Use: ${options.use}`;
  if (options.additionalContext) enhancedDescription += `. ${options.additionalContext}`;
  
  const prompt = AI_CLASSIFICATION_PROMPT.replace('{description}', enhancedDescription);
  
  try {
    console.log('[AIClassification] Classifying:', description);
    
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini', // Using smaller model for speed, could use grok-3 for complex cases
      messages: [
        { 
          role: 'system', 
          content: `You are a U.S. Customs classification expert. You understand:
1. What products actually ARE (semantically)
2. The HTS chapter structure
3. Common misclassification traps

Return ONLY valid JSON. Be specific about HTS codes.` 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AIClassification] No JSON in response:', content);
      return getDefaultRecommendation(description);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and structure the response
    const result: AIClassificationRecommendation = {
      productUnderstanding: {
        whatThisIs: parsed.productUnderstanding?.whatThisIs || description,
        primaryFunction: parsed.productUnderstanding?.primaryFunction || 'Unknown',
        userContext: parsed.productUnderstanding?.userContext || 'household',
        typicalMaterials: parsed.productUnderstanding?.typicalMaterials || [],
        typicalSize: parsed.productUnderstanding?.typicalSize || 'varies',
      },
      recommendations: {
        primary: parsed.recommendations?.primary || { htsCode: '', description: '', chapter: '', reasoning: '', confidence: 0 },
        byMaterial: parsed.recommendations?.byMaterial || [],
        alternatives: parsed.recommendations?.alternatives || [],
      },
      avoidCodes: parsed.avoidCodes || [],
      refinementQuestions: parsed.refinementQuestions || [],
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || '',
    };
    
    console.log('[AIClassification] AI recommends:', result.recommendations.primary.htsCode);
    console.log('[AIClassification] Avoid codes:', result.avoidCodes.map(a => a.code).join(', '));
    
    return result;
    
  } catch (error) {
    console.error('[AIClassification] Error:', error);
    return getDefaultRecommendation(description);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATE AI RECOMMENDATIONS AGAINST DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateAndEnrichRecommendations(
  aiRecommendation: AIClassificationRecommendation
): Promise<AIClassificationRecommendation> {
  // Validate that the AI's recommended codes actually exist in our database
  const allCodes = [
    aiRecommendation.recommendations.primary,
    ...aiRecommendation.recommendations.byMaterial,
    ...aiRecommendation.recommendations.alternatives,
  ];
  
  for (const rec of allCodes) {
    if (rec.htsCode) {
      // Remove dots for consistent searching
      const cleanCode = rec.htsCode.replace(/\./g, '');
      const heading = cleanCode.substring(0, 4); // e.g., "3924" from "3924905600"
      const chapter = cleanCode.substring(0, 2); // e.g., "39" from "3924905600"
      
      // Try to find the exact code first
      const exactMatch = await getHtsCode(cleanCode);
      
      if (exactMatch) {
        // Found exact match - use it
        rec.htsCode = exactMatch.codeFormatted || exactMatch.code;
        rec.description = exactMatch.description || rec.description;
        console.log(`[AIClassification] Found exact code: ${rec.htsCode}`);
      } else {
        console.log(`[AIClassification] Code ${rec.htsCode} not found, searching in heading ${heading}...`);
        
        // SMART FALLBACK: Search for codes under this heading by CODE PREFIX, not by description
        // Use getHtsCodesByChapter and filter to the heading
        const chapterCodes = await getHtsCodesByChapter(chapter, { 
          level: [HtsLevel.statistical, HtsLevel.tariff_line, HtsLevel.subheading],
          limit: 500  // Increased limit to ensure we get enough codes
        });
        
        console.log(`[AIClassification] Chapter ${chapter} has ${chapterCodes.length} codes, sample: ${chapterCodes.slice(0, 3).map(c => c.code).join(', ')}`);
        
        // Filter to codes that start with the heading (4 digits)
        // Note: codes in DB are stored without dots, so "3924" should match "392490xxxx"
        let headingCodes = chapterCodes.filter(r => 
          r.code.startsWith(heading)
        );
        
        console.log(`[AIClassification] Heading ${heading} filter found ${headingCodes.length} codes`);
        
        if (headingCodes.length > 0) {
          // First try to find codes in the SAME SUBHEADING as AI recommended
          // AI recommends 3924.90.56.00 → look for codes starting with 392490
          const subheading = cleanCode.substring(0, 6);
          let subheadingCodes = headingCodes.filter(r => r.code.startsWith(subheading));
          
          // If no codes in same subheading, use all heading codes
          const candidateCodes = subheadingCodes.length > 0 ? subheadingCodes : headingCodes;
          
          // Sort by specificity (prefer 10-digit codes) AND prefer "other" categories for generic products
          candidateCodes.sort((a, b) => {
            // Prefer statistical (10-digit) over tariff_line (8-digit) over subheading (6-digit)
            const levelOrder: Record<string, number> = { statistical: 3, tariff_line: 2, subheading: 1, heading: 0, chapter: -1 };
            const levelDiff = (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0);
            if (levelDiff !== 0) return levelDiff;
            
            // For same level, prefer "other" categories (usually .90 subheadings) for generic items
            // These are catch-all codes that fit products not specifically listed elsewhere
            const aIsOther = a.description.toLowerCase().includes('other') || a.code.includes('90') ? 1 : 0;
            const bIsOther = b.description.toLowerCase().includes('other') || b.code.includes('90') ? 1 : 0;
            return bIsOther - aIsOther;
          });
          
          const bestMatch = candidateCodes[0];
          console.log(`[AIClassification] Found ${candidateCodes.length} codes in ${subheadingCodes.length > 0 ? 'subheading ' + subheading : 'heading ' + heading}, using: ${bestMatch.code} (${bestMatch.level})`);
          rec.htsCode = bestMatch.codeFormatted || bestMatch.code;
          rec.description = bestMatch.description || rec.description;
        } else {
          console.log(`[AIClassification] No codes found in heading ${heading} - AI recommendation may be invalid`);
        }
      }
    }
  }
  
  return aiRecommendation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultRecommendation(description: string): AIClassificationRecommendation {
  return {
    productUnderstanding: {
      whatThisIs: description,
      primaryFunction: 'Unknown',
      userContext: 'household',
      typicalMaterials: [],
      typicalSize: 'varies',
    },
    recommendations: {
      primary: {
        htsCode: '',
        description: 'Unable to determine',
        chapter: '',
        reasoning: 'AI classification failed',
        confidence: 0,
      },
      byMaterial: [],
      alternatives: [],
    },
    avoidCodes: [],
    refinementQuestions: [],
    confidence: 0,
    reasoning: 'AI classification was unable to process this product.',
  };
}

