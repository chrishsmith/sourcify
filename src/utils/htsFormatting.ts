/**
 * HTS Formatting Utilities
 */

/**
 * Formats an HTS code with dots for display
 * e.g., "6109100012" -> "6109.10.00.12"
 * 
 * @param code The HTS code (stored without dots)
 * @returns The formatted code with dots
 */
export function formatHtsCode(code: string): string {
    if (!code) return '';
    
    // Remove any existing dots and spaces
    const clean = code.replace(/[.\s]/g, '');
    
    // Format based on length
    if (clean.length <= 4) {
        return clean;
    } else if (clean.length <= 6) {
        return `${clean.slice(0, 4)}.${clean.slice(4)}`;
    } else if (clean.length <= 8) {
        return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}`;
    } else {
        // Full 10-digit code
        return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}.${clean.slice(8)}`;
    }
}

/**
 * Generates a human-readable breadcrumb path for an HTS code
 * e.g., "Plastics (Ch 39) > Articles of Plastic (3926) > Other > Other"
 * 
 * @param htsCode The full HTS code (e.g. 3926.90.99)
 * @param description The official description
 * @param chapterDesc Optional chapter description if known
 * @param headingDesc Optional heading description if known
 */
export function formatHumanReadablePath(
    htsCode: string,
    description: string,
    chapterDesc?: string,
    headingDesc?: string
): string {
    const chapter = htsCode.substring(0, 2);
    const heading = htsCode.substring(0, 4);

    const parts = [];

    // Level 1: Chapter
    if (chapterDesc) {
        parts.push(`${chapterDesc} (Ch ${chapter})`);
    } else {
        parts.push(`Chapter ${chapter}`);
    }

    // Level 2: Heading
    if (headingDesc) {
        parts.push(`${headingDesc} (${heading})`);
    } else {
        parts.push(`Heading ${heading}`);
    }

    // Level 3: Specific Description
    // Clean up description (often just "Other")
    let cleanDesc = description;

    // If description is just "Other", try to be more specific if possible, 
    // or just leave it as part of the path
    parts.push(cleanDesc);

    return parts.join(' › ');
}
