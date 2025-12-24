/**
 * Scrapers Module
 * 
 * Unified interface for all data scraping operations.
 * Import from this module rather than individual scraper files.
 */

// Types
export * from './types';

// BOL Scraper
export {
    scrapeBolRecords,
    saveBolRecords,
    scrapeAndSaveBolRecords,
    type BolScraperOptions,
} from './bolScraper';

// Directory Scraper
export {
    scrapeDirectories,
    saveSupplierRecords,
    scrapeAndSaveDirectories,
    type DirectoryScraperOptions,
} from './directoryScraper';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED SCRAPING INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

import { scrapeAndSaveBolRecords, BolScraperOptions } from './bolScraper';
import { scrapeAndSaveDirectories, DirectoryScraperOptions } from './directoryScraper';

export interface FullScrapeOptions {
    bol?: BolScraperOptions;
    directories?: DirectoryScraperOptions;
    skipBol?: boolean;
    skipDirectories?: boolean;
}

export interface FullScrapeResult {
    bol: {
        scraped: number;
        saved: number;
        errors: number;
    };
    directories: {
        scraped: number;
        saved: number;
        updated: number;
        errors: number;
    };
    totalDurationMs: number;
}

/**
 * Run a full scrape across all sources
 */
export async function runFullScrape(
    options: FullScrapeOptions = {}
): Promise<FullScrapeResult> {
    const startTime = Date.now();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[Scraper] Starting full data scrape...');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Initialize result
    const result: FullScrapeResult = {
        bol: { scraped: 0, saved: 0, errors: 0 },
        directories: { scraped: 0, saved: 0, updated: 0, errors: 0 },
        totalDurationMs: 0,
    };
    
    // Scrape BOL data
    if (!options.skipBol) {
        console.log('\n[Scraper] Phase 1: Scraping BOL/shipment records...');
        const bolResult = await scrapeAndSaveBolRecords(options.bol);
        result.bol = {
            scraped: bolResult.scraped,
            saved: bolResult.saved,
            errors: bolResult.errors,
        };
        console.log(`[Scraper] BOL complete: ${bolResult.saved} saved, ${bolResult.errors} errors`);
    }
    
    // Scrape directories
    if (!options.skipDirectories) {
        console.log('\n[Scraper] Phase 2: Scraping business directories...');
        const dirResult = await scrapeAndSaveDirectories(options.directories);
        result.directories = {
            scraped: dirResult.scraped,
            saved: dirResult.saved,
            updated: dirResult.updated,
            errors: dirResult.errors,
        };
        console.log(`[Scraper] Directories complete: ${dirResult.saved} new, ${dirResult.updated} updated`);
    }
    
    result.totalDurationMs = Date.now() - startTime;
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('[Scraper] Full scrape complete!');
    console.log(`  BOL Records: ${result.bol.saved} saved`);
    console.log(`  Suppliers: ${result.directories.saved} new, ${result.directories.updated} updated`);
    console.log(`  Total time: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    return result;
}


