// Shared components
export { ProductInputForm } from './ProductInputForm';
export type { ProductInputValues, ProductInputFormProps } from './ProductInputForm';

// State components (loading, error, empty)
export { LoadingState, InlineSpinner } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

export { ErrorState, InlineError } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

export { EmptyState, SearchEmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction, EmptyIconType } from './EmptyState';

// Shared constants
export { 
    COUNTRIES, 
    getCountryByCode, 
    getCountryLabel, 
    getCountryName, 
    getCountryFlag 
} from './constants';
export type { CountryCode } from './constants';





