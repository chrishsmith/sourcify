/**
 * Classification V5 Adapter
 * 
 * Converts V5 classification results to the standard ClassificationResult format
 * used by SearchHistory and other parts of the application.
 * 
 * @module classificationV5Adapter
 * @created December 24, 2025
 */

import type { ClassificationResult, ClassificationInput, HTSCode, DutyRate } from '@/types/classification.types';
import type { ClassificationV5Result, ClassificationV5Input } from '@/services/classification/engine-v5';

/**
 * Convert V5 input to the standard ClassificationInput format
 */
export function convertV5InputToClassificationInput(
  v5Input: ClassificationV5Input
): ClassificationInput {
  return {
    productDescription: v5Input.description,
    materialComposition: v5Input.material,
    intendedUse: v5Input.use,
    countryOfOrigin: v5Input.origin,
    classificationType: 'import',
  };
}

/**
 * Convert V5 result to the standard ClassificationResult format
 * This allows V5 results to be saved to SearchHistory and displayed
 * in existing UI components.
 */
export function convertV5ResultToClassificationResult(
  v5Result: ClassificationV5Result,
  v5Input: ClassificationV5Input
): ClassificationResult {
  // Build the HTS code
  const htsCode: HTSCode = {
    code: v5Result.bestMatch?.htsCode || '',
    description: v5Result.bestMatch?.description || '',
    chapter: v5Result.hierarchy.chapter?.code || '',
    heading: v5Result.hierarchy.heading?.code || '',
    subheading: v5Result.hierarchy.subheading?.code || '',
  };

  // Build duty rate
  const generalRate = v5Result.bestMatch?.generalRate || 'Unknown';
  const dutyRate: DutyRate = {
    generalRate,
    specialPrograms: [],
    column2Rate: undefined,
  };

  // Build rationale from transparency info
  const rationaleParts: string[] = [];
  
  if (v5Result.transparency.stated.length > 0) {
    rationaleParts.push(`Based on what you told us: ${v5Result.transparency.stated.join(', ')}.`);
  }
  if (v5Result.transparency.inferred.length > 0) {
    rationaleParts.push(`We inferred: ${v5Result.transparency.inferred.join(', ')}.`);
  }
  if (v5Result.transparency.assumed.length > 0) {
    rationaleParts.push(`We assumed: ${v5Result.transparency.assumed.join(', ')}.`);
  }

  const rationale = rationaleParts.join(' ') || 'Classification based on product description.';

  // Calculate confidence (V5 uses 0-1, ClassificationResult uses 0-100)
  const confidence = v5Result.bestMatch 
    ? Math.round(v5Result.bestMatch.confidence * 100) 
    : 0;

  // Build alternatives
  const alternativeCodes: HTSCode[] = v5Result.alternatives.slice(0, 5).map(alt => ({
    code: alt.htsCode,
    description: alt.description,
    chapter: alt.htsCode.substring(0, 2),
    heading: alt.htsCode.substring(0, 4),
    subheading: alt.htsCode.substring(0, 6),
  }));

  // Generate suggested product name from inference
  const suggestedProductName = generateProductNameFromV5(v5Result);

  // Build the ClassificationResult
  const result: ClassificationResult = {
    id: `v5-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    input: convertV5InputToClassificationInput(v5Input),
    htsCode,
    confidence,
    dutyRate,
    rulings: [], // V5 doesn't include rulings
    alternativeCodes,
    rationale,
    warnings: [], // Could add from v5Result.transparency.assumed
    createdAt: new Date(),
    suggestedProductName,
    // Include human readable path
    humanReadablePath: buildHumanReadablePath(v5Result),
    // Include hierarchy
    hierarchy: {
      fullCode: v5Result.bestMatch?.htsCodeFormatted || '',
      levels: buildHierarchyLevels(v5Result),
      humanReadablePath: buildHumanReadablePath(v5Result),
      shortPath: v5Result.hierarchy.heading?.description || '',
    },
  };

  return result;
}

/**
 * Generate a suggested product name from V5 inference
 */
function generateProductNameFromV5(v5Result: ClassificationV5Result): string {
  // Use the first stated attribute or the heading description
  const stated = v5Result.transparency.stated;
  
  if (stated.length > 0) {
    // Try to extract key product type from stated attributes
    const productType = stated.find(s => 
      s.toLowerCase().includes('product type') || 
      s.toLowerCase().includes('type:')
    );
    
    if (productType) {
      // Extract the value part (e.g., "Product type: t-shirt" -> "T-shirt")
      const parts = productType.split(':');
      if (parts.length > 1) {
        return capitalizeFirst(parts[1].trim());
      }
    }
  }
  
  // Fall back to heading description
  if (v5Result.hierarchy.heading?.description) {
    // Get first few words of heading description
    const words = v5Result.hierarchy.heading.description.split(' ').slice(0, 3);
    return capitalizeFirst(words.join(' ').replace(/[,;:]$/, ''));
  }
  
  return 'Product';
}

/**
 * Build human readable path from V5 result hierarchy
 */
function buildHumanReadablePath(v5Result: ClassificationV5Result): string {
  const parts: string[] = [];
  
  if (v5Result.hierarchy.chapter?.description) {
    // Truncate long chapter descriptions
    const desc = v5Result.hierarchy.chapter.description;
    parts.push(desc.length > 50 ? desc.substring(0, 50) + '...' : desc);
  }
  
  if (v5Result.hierarchy.heading?.description) {
    const desc = v5Result.hierarchy.heading.description;
    parts.push(desc.length > 50 ? desc.substring(0, 50) + '...' : desc);
  }
  
  return parts.join(' › ') || 'Unknown';
}

/**
 * Build hierarchy levels array from V5 result
 */
function buildHierarchyLevels(v5Result: ClassificationV5Result) {
  const levels: Array<{
    level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
    code: string;
    description: string;
    indent: number;
    dutyRate?: string;
  }> = [];

  if (v5Result.hierarchy.chapter) {
    levels.push({
      level: 'chapter',
      code: v5Result.hierarchy.chapter.code,
      description: v5Result.hierarchy.chapter.description,
      indent: 0,
    });
  }

  if (v5Result.hierarchy.heading) {
    levels.push({
      level: 'heading',
      code: v5Result.hierarchy.heading.code,
      description: v5Result.hierarchy.heading.description,
      indent: 1,
    });
  }

  if (v5Result.hierarchy.subheading) {
    levels.push({
      level: 'subheading',
      code: v5Result.hierarchy.subheading.code,
      description: v5Result.hierarchy.subheading.description,
      indent: 2,
    });
  }

  if (v5Result.hierarchy.tariffLine) {
    levels.push({
      level: 'tariff_line',
      code: v5Result.hierarchy.tariffLine.code,
      description: v5Result.hierarchy.tariffLine.description,
      indent: 3,
      dutyRate: v5Result.bestMatch?.generalRate || undefined,
    });
  }

  if (v5Result.hierarchy.statistical) {
    levels.push({
      level: 'statistical',
      code: v5Result.hierarchy.statistical.code,
      description: v5Result.hierarchy.statistical.description,
      indent: 4,
      dutyRate: v5Result.bestMatch?.generalRate || undefined,
    });
  }

  return levels;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Extract effective rate from V5 result
 * Returns null if rate cannot be determined
 */
export function extractEffectiveRateFromV5(v5Result: ClassificationV5Result): number | null {
  // Try to get the ad valorem rate
  if (v5Result.bestMatch?.adValoremRate !== null && v5Result.bestMatch?.adValoremRate !== undefined) {
    return v5Result.bestMatch.adValoremRate;
  }
  
  // Try to parse from general rate string
  const generalRate = v5Result.bestMatch?.generalRate;
  if (generalRate) {
    // Handle "Free"
    if (generalRate.toLowerCase() === 'free') {
      return 0;
    }
    
    // Handle "16.5%" format
    const percentMatch = generalRate.match(/(\d+\.?\d*)%/);
    if (percentMatch) {
      return parseFloat(percentMatch[1]);
    }
  }
  
  return null;
}

