/**
 * HTS Formatting Utilities
 */

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
