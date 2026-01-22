'use client';

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    pdf,
} from '@react-pdf/renderer';
import React, { createElement } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - matching ClassificationV10 interfaces
// ═══════════════════════════════════════════════════════════════════════════

interface V10Primary {
    htsCode: string;
    htsCodeFormatted: string;
    confidence: number;
    path: {
        codes: string[];
        descriptions: string[];
    };
    fullDescription: string;
    shortDescription: string;
    duty: {
        baseMfn: string;
        additional: string;
        effective: string;
        special?: string;
    } | null;
    isOther: boolean;
    otherExclusions?: string[];
}

interface AIReasoning {
    summary: string;
    chapterReasoning: {
        chapter: string;
        description: string;
        explanation: string;
    };
    headingReasoning: {
        heading: string;
        description: string;
        explanation: string;
    };
    codeReasoning: {
        code: string;
        description: string;
        explanation: string;
    };
    keyFactors: Array<{
        factor: string;
        value: string;
        impact: 'positive' | 'neutral' | 'uncertain';
        explanation: string;
    }>;
    exclusions?: Array<{
        code: string;
        description: string;
        reason: string;
    }>;
    confidence: {
        level: 'high' | 'medium' | 'low';
        explanation: string;
    };
}

export interface ClassificationPDFData {
    productDescription: string;
    countryOfOrigin: string;
    material?: string;
    primary: V10Primary;
    aiReasoning?: AIReasoning;
    classifiedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 40,
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#0d9488', // teal-600
        paddingBottom: 15,
    },
    logo: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: '#0d9488',
        marginBottom: 4,
    },
    tagline: {
        fontSize: 10,
        color: '#64748b',
    },
    reportTitle: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        marginTop: 15,
        marginBottom: 5,
    },
    reportDate: {
        fontSize: 10,
        color: '#64748b',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        marginBottom: 10,
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    label: {
        fontSize: 10,
        color: '#64748b',
        width: 120,
    },
    value: {
        fontSize: 10,
        color: '#1e293b',
        flex: 1,
    },
    valueBold: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        flex: 1,
    },
    htsCode: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        color: '#0d9488',
        marginBottom: 10,
    },
    confidenceTag: {
        fontSize: 10,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 10,
    },
    confidenceHigh: {
        backgroundColor: '#dcfce7',
        color: '#166534',
    },
    confidenceMedium: {
        backgroundColor: '#fef9c3',
        color: '#854d0e',
    },
    confidenceLow: {
        backgroundColor: '#fed7aa',
        color: '#9a3412',
    },
    description: {
        fontSize: 10,
        color: '#334155',
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 4,
        marginBottom: 10,
        lineHeight: 1.5,
    },
    pathItem: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 10,
    },
    pathLevel: {
        fontSize: 9,
        color: '#64748b',
        width: 80,
    },
    pathCode: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#475569',
        width: 60,
    },
    pathDesc: {
        fontSize: 9,
        color: '#334155',
        flex: 1,
    },
    dutyGrid: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    dutyItem: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 10,
        marginRight: 8,
        borderRadius: 4,
    },
    dutyItemHighlight: {
        flex: 1,
        backgroundColor: '#fef3c7',
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    dutyLabel: {
        fontSize: 8,
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    dutyValue: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
    },
    dutyValueHighlight: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#b45309',
    },
    reasoningBox: {
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: 4,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
    },
    reasoningTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#1e40af',
        marginBottom: 6,
    },
    reasoningText: {
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.5,
    },
    keyFactorItem: {
        backgroundColor: '#f0fdf4',
        padding: 8,
        borderRadius: 4,
        marginBottom: 6,
    },
    keyFactorItemUncertain: {
        backgroundColor: '#fefce8',
        padding: 8,
        borderRadius: 4,
        marginBottom: 6,
    },
    keyFactorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    keyFactorTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#166534',
    },
    keyFactorTitleUncertain: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#854d0e',
    },
    keyFactorValue: {
        fontSize: 9,
        color: '#64748b',
        backgroundColor: '#ffffff',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
    },
    keyFactorExplanation: {
        fontSize: 9,
        color: '#475569',
    },
    disclaimer: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    disclaimerTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#64748b',
        marginBottom: 6,
    },
    disclaimerText: {
        fontSize: 8,
        color: '#94a3b8',
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#94a3b8',
    },
    pageNumber: {
        fontSize: 8,
        color: '#94a3b8',
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const COUNTRY_NAMES: Record<string, string> = {
    'CN': 'China',
    'MX': 'Mexico',
    'VN': 'Vietnam',
    'IN': 'India',
    'DE': 'Germany',
    'JP': 'Japan',
    'KR': 'South Korea',
    'TW': 'Taiwan',
    'TH': 'Thailand',
    'ID': 'Indonesia',
    'CA': 'Canada',
    'GB': 'United Kingdom',
};

const getCountryName = (code: string): string => {
    return COUNTRY_NAMES[code] || code;
};

const formatDate = (date?: Date): string => {
    const d = date || new Date();
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Medium Confidence';
    return 'Low Confidence';
};

// ═══════════════════════════════════════════════════════════════════════════
// PDF DOCUMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ClassificationReportDocument = ({ data }: { data: ClassificationPDFData }) => {
    const { productDescription, countryOfOrigin, material, primary, aiReasoning, classifiedAt } = data;
    const levels = ['Chapter', 'Heading', 'Subheading', 'Tariff Line', 'Statistical'];
    
    const confidenceStyle = primary.confidence >= 80 
        ? styles.confidenceHigh 
        : primary.confidence >= 60 
            ? styles.confidenceMedium 
            : styles.confidenceLow;

    return createElement(Document, {},
        createElement(Page, { size: 'A4', style: styles.page },
            // Header
            createElement(View, { style: styles.header },
                createElement(Text, { style: styles.logo }, 'Sourcify'),
                createElement(Text, { style: styles.tagline }, 'Trade Intelligence Platform'),
                createElement(Text, { style: styles.reportTitle }, 'HTS Classification Report'),
                createElement(Text, { style: styles.reportDate }, `Generated: ${formatDate(classifiedAt)}`)
            ),

            // Product Information Section
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Product Information'),
                createElement(View, { style: styles.row },
                    createElement(Text, { style: styles.label }, 'Description:'),
                    createElement(Text, { style: styles.value }, productDescription)
                ),
                createElement(View, { style: styles.row },
                    createElement(Text, { style: styles.label }, 'Country of Origin:'),
                    createElement(Text, { style: styles.value }, getCountryName(countryOfOrigin))
                ),
                material && createElement(View, { style: styles.row },
                    createElement(Text, { style: styles.label }, 'Material:'),
                    createElement(Text, { style: styles.value }, material.charAt(0).toUpperCase() + material.slice(1))
                )
            ),

            // Classification Result Section
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Classification Result'),
                createElement(Text, { style: styles.htsCode }, primary.htsCodeFormatted),
                createElement(View, { style: { flexDirection: 'row', marginBottom: 10 } },
                    createElement(Text, { style: [styles.confidenceTag, confidenceStyle] }, 
                        `${Math.round(primary.confidence)}% - ${getConfidenceLabel(primary.confidence)}`
                    )
                ),
                createElement(Text, { style: styles.description }, primary.fullDescription)
            ),

            // HTS Path Section
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'HTS Classification Path'),
                ...primary.path.codes.map((code, idx) =>
                    createElement(View, { key: code, style: styles.pathItem },
                        createElement(Text, { style: styles.pathLevel }, `${levels[idx]}:`),
                        createElement(Text, { style: styles.pathCode }, code),
                        createElement(Text, { style: styles.pathDesc }, primary.path.descriptions[idx])
                    )
                )
            ),

            // Duty Breakdown Section
            primary.duty && createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Duty Breakdown'),
                createElement(View, { style: styles.dutyGrid },
                    createElement(View, { style: styles.dutyItem },
                        createElement(Text, { style: styles.dutyLabel }, 'Base MFN Rate'),
                        createElement(Text, { style: styles.dutyValue }, primary.duty.baseMfn)
                    ),
                    createElement(View, { style: styles.dutyItem },
                        createElement(Text, { style: styles.dutyLabel }, 'Additional Duties'),
                        createElement(Text, { style: styles.dutyValue }, primary.duty.additional || 'None')
                    ),
                    createElement(View, { style: styles.dutyItemHighlight },
                        createElement(Text, { style: styles.dutyLabel }, 'Effective Rate'),
                        createElement(Text, { style: styles.dutyValueHighlight }, primary.duty.effective)
                    )
                ),
                primary.duty.special && createElement(View, { style: styles.row },
                    createElement(Text, { style: styles.label }, 'Special Programs:'),
                    createElement(Text, { style: styles.value }, primary.duty.special)
                )
            ),

            // Disclaimer
            createElement(View, { style: styles.disclaimer },
                createElement(Text, { style: styles.disclaimerTitle }, 'Disclaimer'),
                createElement(Text, { style: styles.disclaimerText },
                    'This classification is provided for informational purposes only and does not constitute legal or professional advice. ' +
                    'The determination of the correct HTS classification is the responsibility of the importer. ' +
                    'Duty rates are subject to change and may be affected by special programs, trade agreements, or pending legislation. ' +
                    'Always verify classifications with U.S. Customs and Border Protection or a licensed customs broker before importing. ' +
                    'Sourcify makes no warranties regarding the accuracy of this classification.'
                )
            ),

            // Footer
            createElement(View, { style: styles.footer, fixed: true },
                createElement(Text, { style: styles.footerText }, 'Sourcify Trade Intelligence Platform - www.sourcify.io'),
                createElement(Text, { style: styles.pageNumber, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => 
                    `Page ${pageNumber} of ${totalPages}`
                })
            )
        ),

        // Page 2: AI Reasoning (if available)
        aiReasoning && createElement(Page, { size: 'A4', style: styles.page },
            // Header
            createElement(View, { style: styles.header },
                createElement(Text, { style: styles.logo }, 'Sourcify'),
                createElement(Text, { style: styles.tagline }, 'Trade Intelligence Platform'),
                createElement(Text, { style: styles.reportTitle }, 'AI Classification Reasoning')
            ),

            // Summary
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Classification Summary'),
                createElement(View, { style: styles.reasoningBox },
                    createElement(Text, { style: styles.reasoningText }, aiReasoning.summary)
                )
            ),

            // Chapter Reasoning
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Step 1: Chapter Selection'),
                createElement(View, { style: styles.reasoningBox },
                    createElement(Text, { style: styles.reasoningTitle }, 
                        `Chapter ${aiReasoning.chapterReasoning.chapter}: ${aiReasoning.chapterReasoning.description}`
                    ),
                    createElement(Text, { style: styles.reasoningText }, aiReasoning.chapterReasoning.explanation)
                )
            ),

            // Heading Reasoning
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Step 2: Heading Selection'),
                createElement(View, { style: styles.reasoningBox },
                    createElement(Text, { style: styles.reasoningTitle }, 
                        `Heading ${aiReasoning.headingReasoning.heading}${aiReasoning.headingReasoning.description ? `: ${aiReasoning.headingReasoning.description}` : ''}`
                    ),
                    createElement(Text, { style: styles.reasoningText }, aiReasoning.headingReasoning.explanation)
                )
            ),

            // Code Reasoning
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Step 3: Specific Code Selection'),
                createElement(View, { style: styles.reasoningBox },
                    createElement(Text, { style: styles.reasoningTitle }, 
                        `Code ${aiReasoning.codeReasoning.code}`
                    ),
                    createElement(Text, { style: styles.reasoningText }, aiReasoning.codeReasoning.explanation)
                )
            ),

            // Key Factors
            aiReasoning.keyFactors.length > 0 && createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Key Classification Factors'),
                ...aiReasoning.keyFactors.map((factor, idx) =>
                    createElement(View, { 
                        key: idx, 
                        style: factor.impact === 'uncertain' ? styles.keyFactorItemUncertain : styles.keyFactorItem 
                    },
                        createElement(View, { style: styles.keyFactorHeader },
                            createElement(Text, { 
                                style: factor.impact === 'uncertain' ? styles.keyFactorTitleUncertain : styles.keyFactorTitle 
                            }, factor.factor),
                            createElement(Text, { style: styles.keyFactorValue }, factor.value)
                        ),
                        createElement(Text, { style: styles.keyFactorExplanation }, factor.explanation)
                    )
                )
            ),

            // Confidence Assessment
            createElement(View, { style: styles.section },
                createElement(Text, { style: styles.sectionTitle }, 'Confidence Assessment'),
                createElement(View, { style: styles.reasoningBox },
                    createElement(Text, { style: styles.reasoningTitle }, 
                        `${aiReasoning.confidence.level.charAt(0).toUpperCase() + aiReasoning.confidence.level.slice(1)} Confidence`
                    ),
                    createElement(Text, { style: styles.reasoningText }, aiReasoning.confidence.explanation)
                )
            ),

            // Footer
            createElement(View, { style: styles.footer, fixed: true },
                createElement(Text, { style: styles.footerText }, 'Sourcify Trade Intelligence Platform - www.sourcify.io'),
                createElement(Text, { style: styles.pageNumber, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => 
                    `Page ${pageNumber} of ${totalPages}`
                })
            )
        )
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate and download a PDF classification report
 */
export async function exportClassificationPDF(data: ClassificationPDFData): Promise<void> {
    try {
        // Create the PDF document element
        const doc = createElement(ClassificationReportDocument, { data }) as React.ReactElement;
        
        // Generate the PDF blob
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = await pdf(doc as any).toBlob();
        
        // Generate filename
        const htsCode = data.primary.htsCode.replace(/\./g, '');
        const date = new Date().toISOString().split('T')[0];
        const productSnippet = data.productDescription
            .slice(0, 30)
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();
        const filename = `sourcify-classification-${htsCode}-${productSnippet}-${date}.pdf`;
        
        // Trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        throw new Error('Failed to generate PDF report');
    }
}

/**
 * Generate PDF blob without downloading (for preview or email attachment)
 */
export async function generateClassificationPDFBlob(data: ClassificationPDFData): Promise<Blob> {
    const doc = createElement(ClassificationReportDocument, { data }) as React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pdf(doc as any).toBlob();
}
