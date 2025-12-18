export interface User {
    id: string;
    email: string;
    full_name?: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}
