/**
 * Justification Generator - Zonos-style Explanations
 * 
 * Generates human-readable explanations of why a product was classified
 * under a specific HTS code, with transparency about assumptions.
 * 
 * @module justificationGenerator
 * @created December 23, 2025
 */

import type { ClassificationV5Result, ClassificationCandidate } from './classificationEngineV5';
import type { InferenceResult, ExtractedAttribute } from './inferenceEngineV5';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface JustificationSection {
  title: string;
  content: string;
}

export interface ClassificationJustification {
  // Summary for quick read
  summary: string;
  
  // Confidence explanation
  confidenceExplanation: string;
  
  // Detailed sections
  sections: JustificationSection[];
  
  // What might change the classification
  caveats: string[];
  
  // How to get a more accurate result
  refinementSuggestions: string[];
  
  // Full formatted justification (Zonos-style)
  fullText: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a detailed justification for a classification result
 */
export function generateJustification(
  result: ClassificationV5Result
): ClassificationJustification {
  if (!result.bestMatch) {
    return {
      summary: 'Unable to classify this product.',
      confidenceExplanation: 'No matching HTS codes were found.',
      sections: [],
      caveats: ['Please provide more details about the product.'],
      refinementSuggestions: ['Add material, intended use, or more specific product description.'],
      fullText: 'Classification could not be completed. Please provide more product details.',
    };
  }
  
  const sections: JustificationSection[] = [];
  const caveats: string[] = [];
  const refinementSuggestions: string[] = [];
  
  // 1. Product Understanding Section
  sections.push(generateProductSection(result));
  
  // 2. Chapter Selection Section
  sections.push(generateChapterSection(result));
  
  // 3. Heading Selection Section
  sections.push(generateHeadingSection(result));
  
  // 4. Subheading/Statistical Selection
  sections.push(generateSubheadingSection(result));
  
  // 5. Assumptions Made
  const assumptionsSection = generateAssumptionsSection(result);
  if (assumptionsSection) {
    sections.push(assumptionsSection);
    
    // Add caveats for each assumption
    for (const assumed of result.transparency.assumed) {
      caveats.push(`We assumed ${assumed}. If incorrect, the classification may change.`);
    }
  }
  
  // 6. Generate refinement suggestions from optional questions
  for (const q of result.optionalQuestions) {
    if (q.impact === 'high') {
      refinementSuggestions.push(
        `Answering "${q.question}" could significantly affect the duty rate.`
      );
    }
  }
  
  // Generate summary
  const summary = generateSummary(result);
  
  // Generate confidence explanation
  const confidenceExplanation = generateConfidenceExplanation(result);
  
  // Generate full text
  const fullText = generateFullText(result, sections);
  
  return {
    summary,
    confidenceExplanation,
    sections,
    caveats,
    refinementSuggestions,
    fullText,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

function generateProductSection(result: ClassificationV5Result): JustificationSection {
  const inference = result.inferenceResult;
  const statedAttrs = result.transparency.stated.join(', ') || 'minimal details';
  
  return {
    title: 'Understanding the Product',
    content: `The item is identified as a "${inference.product.productType}" based on your description. ` +
      `You provided the following details: ${statedAttrs}. ` +
      (result.transparency.inferred.length > 0
        ? `Based on standard industry knowledge, we also determined: ${result.transparency.inferred.join('; ')}.`
        : ''),
  };
}

function generateChapterSection(result: ClassificationV5Result): JustificationSection {
  const hierarchy = result.hierarchy;
  const chapter = hierarchy.chapter;
  
  if (!chapter) {
    // Try to extract chapter from the code
    const chapterNum = result.bestMatch?.htsCode?.substring(0, 2);
    return {
      title: 'Chapter Selection',
      content: `This product falls under Chapter ${chapterNum || 'unknown'} of the Harmonized Tariff Schedule.`,
    };
  }
  
  return {
    title: 'Chapter Selection',
    content: `This product falls under **Chapter ${chapter.code}**: "${chapter.description}". ` +
      `This chapter covers products of this general category.`,
  };
}

function generateHeadingSection(result: ClassificationV5Result): JustificationSection {
  const hierarchy = result.hierarchy;
  const heading = hierarchy.heading;
  
  if (!heading) {
    const headingNum = result.bestMatch?.htsCode?.substring(0, 4);
    return {
      title: 'Heading Selection',
      content: `Within the chapter, heading ${headingNum || 'unknown'} specifically covers this type of product.`,
    };
  }
  
  return {
    title: 'Heading Selection',
    content: `Within the chapter, **Heading ${heading.code}** specifically covers: "${heading.description}". ` +
      `This heading was selected because it most accurately describes the essential character of your product.`,
  };
}

function generateSubheadingSection(result: ClassificationV5Result): JustificationSection {
  const hierarchy = result.hierarchy;
  const bestMatch = result.bestMatch!;
  
  let content = `The final classification is **${bestMatch.htsCodeFormatted}**: "${bestMatch.description}".`;
  
  // Explain the path down
  if (hierarchy.subheading) {
    content += ` At the subheading level (${hierarchy.subheading.code}), the product is categorized as "${hierarchy.subheading.description}".`;
  }
  
  // Rate info
  if (bestMatch.generalRate) {
    content += ` The general duty rate for this code is ${bestMatch.generalRate}.`;
  }
  
  return {
    title: 'Final Classification',
    content,
  };
}

function generateAssumptionsSection(result: ClassificationV5Result): JustificationSection | null {
  const assumed = result.transparency.assumed;
  const inferred = result.transparency.inferred;
  
  if (assumed.length === 0 && inferred.length === 0) {
    return null;
  }
  
  let content = '';
  
  if (inferred.length > 0) {
    content += `**Inferred with high confidence:**\n`;
    for (const inf of inferred) {
      content += `• ${inf}\n`;
    }
    content += '\n';
  }
  
  if (assumed.length > 0) {
    content += `**Assumptions made (may affect classification):**\n`;
    for (const ass of assumed) {
      content += `• ${ass}\n`;
    }
  }
  
  return {
    title: 'Inferences and Assumptions',
    content: content.trim(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY & CONFIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

function generateSummary(result: ClassificationV5Result): string {
  const match = result.bestMatch!;
  const inference = result.inferenceResult;
  
  return `The product "${inference.originalInput}" is classified under HTS code ` +
    `${match.htsCodeFormatted} (${match.description.split(',')[0]}) ` +
    `with ${Math.round(match.confidence * 100)}% confidence.`;
}

function generateConfidenceExplanation(result: ClassificationV5Result): string {
  const match = result.bestMatch!;
  const label = match.confidenceLabel;
  const stated = result.transparency.stated.length;
  const inferred = result.transparency.inferred.length;
  const assumed = result.transparency.assumed.length;
  
  let explanation = '';
  
  if (label === 'high') {
    explanation = `We have **high confidence** in this classification. `;
    if (stated > 0) {
      explanation += `You provided ${stated} specific attribute(s), `;
    }
    if (inferred > 0) {
      explanation += `and we could reliably infer ${inferred} more from standard industry knowledge.`;
    }
  } else if (label === 'medium') {
    explanation = `We have **medium confidence** in this classification. `;
    if (assumed > 0) {
      explanation += `We made ${assumed} assumption(s) that you may want to verify.`;
    }
    explanation += ` Consider answering the optional questions to improve accuracy.`;
  } else {
    explanation = `We have **low confidence** in this classification. `;
    explanation += `Limited product information was provided. `;
    explanation += `We recommend providing more details about materials, construction, or intended use.`;
  }
  
  return explanation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL TEXT GENERATOR (Zonos-style)
// ═══════════════════════════════════════════════════════════════════════════════

function generateFullText(
  result: ClassificationV5Result,
  sections: JustificationSection[]
): string {
  const match = result.bestMatch!;
  const inference = result.inferenceResult;
  
  let text = `# Classification Justification for HTS Code ${match.htsCodeFormatted}\n\n`;
  
  text += `This document justifies the classification of an item identified as "${inference.originalInput}" `;
  text += `under the Harmonized Tariff Schedule code ${match.htsCodeFormatted}.\n\n`;
  
  // Add each section
  for (const section of sections) {
    text += `## ${section.title}\n\n`;
    text += `${section.content}\n\n`;
  }
  
  // Alternatives considered
  if (result.alternatives.length > 0) {
    text += `## Alternative Classifications Considered\n\n`;
    text += `The following codes were also considered but ranked lower:\n\n`;
    for (const alt of result.alternatives.slice(0, 3)) {
      text += `• **${alt.htsCodeFormatted}**: ${alt.description.substring(0, 60)}...\n`;
      if (alt.matchReasons.length > 0) {
        text += `  Reasons considered: ${alt.matchReasons.join(', ')}\n`;
      }
    }
    text += '\n';
  }
  
  // Duty rate range
  if (result.dutyRange) {
    text += `## Duty Rate Range\n\n`;
    text += `Based on the possible classifications, the duty rate could range from `;
    text += `${result.dutyRange.formatted}. The exact rate depends on the specific classification.\n\n`;
  }
  
  // Conclusion
  text += `## Conclusion\n\n`;
  text += `Based on the information provided and standard classification principles, `;
  text += `the item is classified under **${match.htsCodeFormatted}** `;
  text += `("${match.description.substring(0, 80)}...").\n\n`;
  
  if (result.transparency.inferred.length > 0 || result.transparency.assumed.length > 0) {
    text += `**Note:** This classification includes inferences and assumptions based on `;
    text += `typical industry practices. If any assumptions are incorrect, `;
    text += `please provide additional details for a more accurate classification.\n`;
  }
  
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK JUSTIFICATION (for UI)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to make attribute values more human-readable
 * "men's" → "men", "women's" → "women", "Cotton" → "cotton"
 */
function humanize(value: string): string {
  return value
    .replace(/['']s$/i, '')  // Remove possessive ('s or 's)
    .replace(/^(.)/,  (m) => m.toLowerCase());  // Lowercase first letter
}

/**
 * Generate a brief, one-paragraph justification suitable for UI display
 */
export function generateQuickJustification(result: ClassificationV5Result): string {
  if (!result.bestMatch) {
    return 'Unable to classify. Please provide more product details.';
  }
  
  const match = result.bestMatch;
  const inference = result.inferenceResult;
  const chapter = match.htsCode.substring(0, 2);
  
  let text = `Classified as ${match.htsCodeFormatted} because `;
  
  // Build reason based on what we know
  const reasons: string[] = [];
  
  // Material
  if (inference.htsAttributes.material) {
    const mat = inference.htsAttributes.material;
    const materialName = humanize(mat.value);
    if (mat.source === 'stated') {
      reasons.push(`you specified ${materialName} as the material`);
    } else if (mat.source === 'inferred') {
      reasons.push(`${materialName} is the typical material for this product type`);
    }
  }
  
  // Construction (knit vs woven)
  if (inference.htsAttributes.construction) {
    const constr = inference.htsAttributes.construction;
    const constrName = humanize(constr.value);
    if (constr.source === 'stated') {
      reasons.push(`${constrName} construction was specified`);
    } else if (constr.source === 'inferred') {
      reasons.push(`${constrName} construction is standard for this product`);
    }
  }
  
  // Gender
  if (inference.htsAttributes.gender) {
    const gender = inference.htsAttributes.gender;
    const genderName = humanize(gender.value);
    if (gender.source === 'stated') {
      reasons.push(`designed for ${genderName}`);
    }
  }
  
  if (reasons.length > 0) {
    text += reasons.join(', ');
  } else {
    text += `it matches the characteristics of a ${humanize(inference.product.productType)}`;
  }
  
  text += `. Chapter ${chapter} covers this product category.`;
  
  if (match.generalRate) {
    text += ` Duty rate: ${match.generalRate}.`;
  }
  
  return text;
}

