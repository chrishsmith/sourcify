/**
 * Tariff Tracker API
 * 
 * GET /api/tariff-tracker
 *   Returns all special tariff programs (Section 301, IEEPA, Section 232)
 *   Query params:
 *     - category: 'section_301' | 'ieepa' | 'section_232'
 *     - country: ISO 2-letter country code
 *     - htsCode: HTS code to check for applicable tariffs
 *     - status: 'active' | 'paused' | 'expired'
 */

import { NextResponse } from 'next/server';
import {
  ALL_TARIFF_PROGRAMS,
  SECTION_301_PROGRAMS,
  IEEPA_PROGRAMS,
  SECTION_232_PROGRAMS,
  HTS_CHAPTER_COVERAGE,
  IEEPA_RECIPROCAL_RATES,
  EXTERNAL_RESOURCES,
  getTariffProgramsForCountry,
  getHtsChapterTariffs,
  calculateTotalAdditionalTariff,
  getIEEPAReciprocalRate,
  type TariffProgram,
} from '@/data/specialTariffs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as 'section_301' | 'ieepa' | 'section_232' | null;
    const country = searchParams.get('country');
    const htsCode = searchParams.get('htsCode');
    const status = searchParams.get('status') as 'active' | 'paused' | 'expired' | null;

    let programs: TariffProgram[] = ALL_TARIFF_PROGRAMS;

    // Filter by category
    if (category) {
      switch (category) {
        case 'section_301':
          programs = SECTION_301_PROGRAMS;
          break;
        case 'ieepa':
          programs = IEEPA_PROGRAMS;
          break;
        case 'section_232':
          programs = SECTION_232_PROGRAMS;
          break;
      }
    }

    // Filter by country
    if (country) {
      programs = programs.filter(p => 
        p.affectedCountries.includes(country.toUpperCase()) || 
        p.affectedCountries.includes('ALL')
      );
    }

    // Filter by HTS code
    if (htsCode) {
      const chapter = htsCode.replace(/\./g, '').substring(0, 2);
      const chapterTariffs = getHtsChapterTariffs(chapter);
      const chapterProgramIds = chapterTariffs.map(t => t.id);
      
      // Include IEEPA baseline/reciprocal which applies to all HTS codes
      programs = programs.filter(p => 
        chapterProgramIds.includes(p.id) ||
        p.type === 'ieepa_baseline' ||
        p.type === 'ieepa_reciprocal' ||
        p.type === 'ieepa_fentanyl'
      );
    }

    // Filter by status
    if (status) {
      programs = programs.filter(p => p.status === status);
    }

    // Calculate totals if both country and HTS code provided
    let calculation = null;
    if (country && htsCode) {
      calculation = calculateTotalAdditionalTariff(country, htsCode);
    }

    // Get country-specific rate if country provided
    let countryRate = null;
    if (country) {
      countryRate = getIEEPAReciprocalRate(country);
    }

    // Summary statistics
    const summary = {
      totalPrograms: programs.length,
      activePrograms: programs.filter(p => p.status === 'active').length,
      pausedPrograms: programs.filter(p => p.status === 'paused').length,
      byCategory: {
        section_301: programs.filter(p => p.category === 'section_301').length,
        ieepa: programs.filter(p => p.category === 'ieepa').length,
        section_232: programs.filter(p => p.category === 'section_232').length,
      },
    };

    return NextResponse.json({
      success: true,
      programs,
      summary,
      calculation,
      countryRate,
      htsCoverage: HTS_CHAPTER_COVERAGE,
      reciprocalRates: IEEPA_RECIPROCAL_RATES,
      externalResources: EXTERNAL_RESOURCES,
      lastUpdated: '2025-04-09', // Date of last tariff registry update
    });

  } catch (error) {
    console.error('[API] Tariff tracker error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tariff data' },
      { status: 500 }
    );
  }
}
