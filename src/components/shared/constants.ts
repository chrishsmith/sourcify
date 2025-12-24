/**
 * Shared constants used across the application
 */

// Countries with flags for origin/destination selection
export const COUNTRIES = [
    { value: 'CN', label: '🇨🇳 China', flag: '🇨🇳', name: 'China' },
    { value: 'MX', label: '🇲🇽 Mexico', flag: '🇲🇽', name: 'Mexico' },
    { value: 'CA', label: '🇨🇦 Canada', flag: '🇨🇦', name: 'Canada' },
    { value: 'DE', label: '🇩🇪 Germany', flag: '🇩🇪', name: 'Germany' },
    { value: 'JP', label: '🇯🇵 Japan', flag: '🇯🇵', name: 'Japan' },
    { value: 'KR', label: '🇰🇷 South Korea', flag: '🇰🇷', name: 'South Korea' },
    { value: 'VN', label: '🇻🇳 Vietnam', flag: '🇻🇳', name: 'Vietnam' },
    { value: 'IN', label: '🇮🇳 India', flag: '🇮🇳', name: 'India' },
    { value: 'TW', label: '🇹🇼 Taiwan', flag: '🇹🇼', name: 'Taiwan' },
    { value: 'TH', label: '🇹🇭 Thailand', flag: '🇹🇭', name: 'Thailand' },
    { value: 'BD', label: '🇧🇩 Bangladesh', flag: '🇧🇩', name: 'Bangladesh' },
    { value: 'ID', label: '🇮🇩 Indonesia', flag: '🇮🇩', name: 'Indonesia' },
    { value: 'GB', label: '🇬🇧 United Kingdom', flag: '🇬🇧', name: 'United Kingdom' },
    { value: 'IT', label: '🇮🇹 Italy', flag: '🇮🇹', name: 'Italy' },
    { value: 'FR', label: '🇫🇷 France', flag: '🇫🇷', name: 'France' },
    { value: 'OTHER', label: '🌍 Other', flag: '🌍', name: 'Other' },
] as const;

export type CountryCode = typeof COUNTRIES[number]['value'];

// Helper to get country by code
export const getCountryByCode = (code: string) => 
    COUNTRIES.find(c => c.value === code);

// Helper to get country label
export const getCountryLabel = (code: string) => 
    getCountryByCode(code)?.label || code;

// Helper to get country name without flag
export const getCountryName = (code: string) => 
    getCountryByCode(code)?.name || code;

// Helper to get country flag
export const getCountryFlag = (code: string) => 
    getCountryByCode(code)?.flag || '🌍';


