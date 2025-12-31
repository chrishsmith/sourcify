/**
 * Conditional Classification Detection
 * 
 * Detects when HTS codes have siblings with different conditions
 * (value thresholds, size limits, weight limits, etc.)
 * 
 * Redesigned to provide DECISION QUESTIONS rather than complex condition parsing.
 * 
 * @module conditionalClassification
 * @created December 30, 2025
 */

import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DecisionQuestion {
  id: string;
  question: string;
  type: 'value' | 'size' | 'weight' | 'yes_no';
  options: DecisionOption[];
}

export interface DecisionOption {
  label: string;
  value: string;
  htsCode?: string;
  htsCodeFormatted?: string;
  dutyRate?: string;
  leadsTo?: string; // ID of next question, or null if terminal
}

export interface ConditionalAlternative {
  code: string;
  codeFormatted: string;
  description: string;
  dutyRate: string | null;
  dutyDifference?: string; // e.g., "5% lower duty"
  keyCondition: string; // Single, clear condition for this code
}

export interface ParsedCondition {
  type: 'value' | 'size' | 'weight' | 'quantity' | 'time' | 'other';
  operator: 'less_than' | 'more_than' | 'equals' | 'between';
  value: string;
  unit?: string;
  humanReadable: string;
}

export interface ConditionalClassificationResult {
  hasConditions: boolean;
  primaryCode: string;
  
  // Decision tree approach - simple questions to narrow down
  decisionQuestions: DecisionQuestion[];
  
  // Simple list of alternatives for reference
  alternatives: ConditionalAlternative[];
  
  // Guidance message
  guidance?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THRESHOLD EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

interface ExtractedThreshold {
  type: 'value' | 'size' | 'weight';
  threshold: number;
  unit: string;
  rawText: string;
}

/**
 * Extract KEY thresholds from HTS descriptions
 * Focus on the primary decision points, not all mentioned values
 */
function extractThresholds(descriptions: string[]): ExtractedThreshold[] {
  const thresholds: ExtractedThreshold[] = [];
  const seen = new Set<string>();
  
  // Look for aggregate value thresholds (most important for pattern sets)
  const aggregateValuePattern = /aggregate\s+value[^$]*(?:not\s+over|over|is\s+(?:not\s+)?over)\s+\$?([\d,.]+)/gi;
  
  // Look for primary size thresholds (from "not over X cm in maximum dimension")
  const primarySizePattern = /not\s+over\s+([\d,.]+)\s*(cm)\s+in\s+maximum\s+dimension/gi;
  
  for (const desc of descriptions) {
    // Extract aggregate value (key threshold for pattern sets)
    const valueMatches = desc.matchAll(aggregateValuePattern);
    for (const match of valueMatches) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const key = `value-${value}`;
      
      if (!seen.has(key) && !isNaN(value)) {
        seen.add(key);
        thresholds.push({
          type: 'value',
          threshold: value,
          unit: 'USD',
          rawText: match[0],
        });
      }
    }
    
    // Extract primary size threshold
    const sizeMatches = desc.matchAll(primarySizePattern);
    for (const match of sizeMatches) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const key = `size-${value}`;
      
      if (!seen.has(key) && !isNaN(value)) {
        seen.add(key);
        thresholds.push({
          type: 'size',
          threshold: value,
          unit: match[2] || 'cm',
          rawText: match[0],
        });
      }
    }
  }
  
  // Sort by type, then by threshold value
  return thresholds.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.threshold - b.threshold;
  });
}

/**
 * Generate decision questions from thresholds
 * CONSERVATIVE: Only include questions where options lead to DIFFERENT codes
 */
function generateDecisionQuestions(
  thresholds: ExtractedThreshold[],
  siblings: { code: string; codeFormatted: string; description: string; dutyRate: string | null }[]
): DecisionQuestion[] {
  const questions: DecisionQuestion[] = [];
  
  // Group thresholds by type
  const byType = thresholds.reduce((acc, t) => {
    if (!acc[t.type]) acc[t.type] = [];
    acc[t.type].push(t);
    return acc;
  }, {} as Record<string, ExtractedThreshold[]>);
  
  // Generate value question if we have value thresholds
  if (byType.value && byType.value.length > 0) {
    const valueThresholds = [...new Set(byType.value.map(t => t.threshold))].sort((a, b) => a - b);
    const options = generateValueOptions(valueThresholds, siblings);
    
    // Only add if options lead to different codes
    if (hasDistinctCodes(options)) {
      questions.push({
        id: 'value',
        question: 'What is the value of your item?',
        type: 'value',
        options,
      });
    }
  }
  
  // Generate size question if we have size thresholds
  if (byType.size && byType.size.length > 0) {
    const sizeThresholds = [...new Set(byType.size.map(t => t.threshold))].sort((a, b) => a - b);
    const unit = byType.size[0].unit;
    const options = generateSizeOptions(sizeThresholds, unit, siblings);
    
    // Only add if options lead to different codes
    if (hasDistinctCodes(options)) {
      questions.push({
        id: 'size',
        question: `What is the maximum dimension of your item?`,
        type: 'size',
        options,
      });
    }
  }
  
  return questions;
}

/**
 * Check if options lead to different HTS codes
 * If all options point to the same code, the question isn't useful
 */
function hasDistinctCodes(options: DecisionOption[]): boolean {
  const codes = options.map(o => o.htsCode).filter(Boolean);
  if (codes.length < 2) return false;
  
  const uniqueCodes = new Set(codes);
  return uniqueCodes.size > 1;
}

function generateValueOptions(
  thresholds: number[],
  siblings: { code: string; codeFormatted: string; description: string; dutyRate: string | null }[]
): DecisionOption[] {
  const options: DecisionOption[] = [];
  
  // For each threshold, create a simple binary choice
  for (const threshold of thresholds) {
    // Find siblings that match "not over" (less than or equal)
    const lteMatch = siblings.find(s => {
      const desc = [...(s.description || '')].join('').toLowerCase();
      return desc.includes(`not over $${threshold}`) || desc.includes(`not over ${threshold}`);
    });
    
    // Find siblings that match "over" (greater than)
    const gtMatch = siblings.find(s => {
      const desc = s.description.toLowerCase();
      return (desc.includes(`over $${threshold}`) || desc.includes(`is over ${threshold}`)) 
        && !desc.includes('not over');
    });
    
    options.push({
      label: `$${threshold} or less`,
      value: `lte_${threshold}`,
      htsCode: lteMatch?.code,
      htsCodeFormatted: lteMatch?.codeFormatted,
      dutyRate: lteMatch?.dutyRate || undefined,
    });
    
    options.push({
      label: `More than $${threshold}`,
      value: `gt_${threshold}`,
      htsCode: gtMatch?.code,
      htsCodeFormatted: gtMatch?.codeFormatted,
      dutyRate: gtMatch?.dutyRate || undefined,
    });
  }
  
  // Remove duplicates and filter out options with no matching code
  const seen = new Set<string>();
  return options.filter(o => {
    if (!o.htsCode || seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });
}

function generateSizeOptions(
  thresholds: number[],
  unit: string,
  siblings: { code: string; codeFormatted: string; description: string; dutyRate: string | null }[]
): DecisionOption[] {
  const options: DecisionOption[] = [];
  
  // For each threshold, create a simple binary choice
  for (const threshold of thresholds) {
    // Find siblings that match "not over X cm"
    const lteMatch = siblings.find(s => {
      const desc = s.description.toLowerCase();
      return desc.includes(`not over ${threshold}`) && desc.includes(unit.toLowerCase());
    });
    
    // Find siblings that match "over X cm"
    const gtMatch = siblings.find(s => {
      const desc = s.description.toLowerCase();
      return desc.includes(`over ${threshold}`) && !desc.includes('not over') && desc.includes(unit.toLowerCase());
    });
    
    options.push({
      label: `${threshold} ${unit} or smaller`,
      value: `lte_${threshold}`,
      htsCode: lteMatch?.code,
      htsCodeFormatted: lteMatch?.codeFormatted,
      dutyRate: lteMatch?.dutyRate || undefined,
    });
    
    options.push({
      label: `Larger than ${threshold} ${unit}`,
      value: `gt_${threshold}`,
      htsCode: gtMatch?.code,
      htsCodeFormatted: gtMatch?.codeFormatted,
      dutyRate: gtMatch?.dutyRate || undefined,
    });
  }
  
  // Remove duplicates and filter out options with no matching code
  const seen = new Set<string>();
  return options.filter(o => {
    if (!o.htsCode || seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });
}

/**
 * Extract the key distinguishing condition for a code
 */
function extractKeyCondition(description: string, parentGroupings: string[]): string {
  const fullText = [...parentGroupings, description].join(' ');
  
  // Look for the most specific condition
  const valueMatch = fullText.match(/(?:aggregate\s+)?value[^$]*(?:not\s+over|over|is\s+(?:not\s+)?over)\s+\$?([\d,.]+)/i);
  const sizeMatch = fullText.match(/(?:not\s+over|over)\s+([\d,.]+)\s*(cm|mm)/i);
  
  if (valueMatch) {
    const isNotOver = /not\s+over/i.test(valueMatch[0]);
    return isNotOver ? `Value $${valueMatch[1]} or less` : `Value more than $${valueMatch[1]}`;
  }
  
  if (sizeMatch) {
    const isNotOver = /not\s+over/i.test(sizeMatch[0]);
    return isNotOver ? `${sizeMatch[1]} ${sizeMatch[2]} or smaller` : `Larger than ${sizeMatch[1]} ${sizeMatch[2]}`;
  }
  
  // Fallback: return first 60 chars of description
  return description.slice(0, 60) + (description.length > 60 ? '...' : '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIBLING DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect conditional siblings for a given HTS code
 * Returns decision questions for simple yes/no determination
 */
export async function detectConditionalSiblings(
  primaryCode: string,
  primaryDutyRate: string | null
): Promise<ConditionalClassificationResult> {
  // Get the 6-digit subheading prefix
  const normalizedCode = primaryCode.replace(/\./g, '');
  const subheadingPrefix = normalizedCode.slice(0, 6);
  
  // Fetch all siblings under the same subheading
  const siblings = await prisma.htsCode.findMany({
    where: {
      code: { startsWith: subheadingPrefix },
      level: { in: ['tariff_line', 'statistical'] },
      NOT: { code: normalizedCode },
    },
    select: {
      code: true,
      codeFormatted: true,
      description: true,
      generalRate: true,
      parentGroupings: true,
    },
    orderBy: { code: 'asc' },
  });
  
  if (siblings.length === 0) {
    return {
      hasConditions: false,
      primaryCode,
      decisionQuestions: [],
      alternatives: [],
    };
  }
  
  // Collect all descriptions for threshold extraction
  const allDescriptions = siblings.flatMap(s => [
    ...(s.parentGroupings || []),
    s.description,
  ]);
  
  // Extract thresholds
  const thresholds = extractThresholds(allDescriptions);
  
  // Generate decision questions
  const decisionQuestions = generateDecisionQuestions(
    thresholds,
    siblings.map(s => ({
      code: s.code,
      codeFormatted: s.codeFormatted,
      description: s.description,
      dutyRate: s.generalRate,
    }))
  );
  
  // Build simple alternatives list
  const alternatives: ConditionalAlternative[] = siblings
    .filter(s => {
      // Only include siblings that seem to have conditions
      const fullText = [...(s.parentGroupings || []), s.description].join(' ');
      return /not\s+over|over\s+\$|valued/i.test(fullText);
    })
    .slice(0, 5) // Limit to 5 most relevant
    .map(s => {
      let dutyDifference: string | undefined;
      if (primaryDutyRate && s.generalRate) {
        const primaryRate = parseFloat(primaryDutyRate.replace(/[^0-9.]/g, '')) || 0;
        const siblingRate = parseFloat(s.generalRate.replace(/[^0-9.]/g, '')) || 0;
        
        if (primaryRate !== siblingRate) {
          const diff = siblingRate - primaryRate;
          dutyDifference = diff < 0 
            ? `${Math.abs(diff).toFixed(1)}% lower duty`
            : `${diff.toFixed(1)}% higher duty`;
        }
      }
      
      return {
        code: s.code,
        codeFormatted: s.codeFormatted,
        description: s.description,
        dutyRate: s.generalRate,
        dutyDifference,
        keyCondition: extractKeyCondition(s.description, s.parentGroupings || []),
      };
    });
  
  // Generate guidance
  let guidance: string | undefined;
  if (decisionQuestions.length > 0) {
    const questionTypes = decisionQuestions.map(q => {
      if (q.type === 'value') return 'value';
      if (q.type === 'size') return 'size';
      return q.type;
    });
    guidance = `Answer ${questionTypes.length === 1 ? 'this question' : 'these questions'} to find the most accurate HTS code:`;
  }
  
  return {
    hasConditions: decisionQuestions.length > 0 || alternatives.length > 0,
    primaryCode,
    decisionQuestions,
    alternatives,
    guidance,
  };
}

