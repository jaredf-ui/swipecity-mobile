import { ApiResponse } from '@swipecity/shared';
export declare class StorageService {
    private storage;
    constructor();
    uploadImage(file: File | Blob, path: string, onProgress?: (progress: number) => void): Promise<ApiResponse<string>>;
    uploadImages(files: (File | Blob)[], basePath: string, onProgress?: (fileIndex: number, progress: number) => void): Promise<ApiResponse<string[]>>;
    deleteImage(path: string): Promise<ApiResponse<void>>;
    getImageURL(path: string): Promise<ApiResponse<string>>;
    static validateImageFile(file: File): {
        valid: boolean;
        error?: string;
    };
    static compressImage(file: File, maxWidth?: number, quality?: number): Promise<File>;
}
