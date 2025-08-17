import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { getFirebaseInstances } from '../config';
export class StorageService {
    constructor() {
        const { storage } = getFirebaseInstances();
        this.storage = storage;
    }
    // Upload image file
    async uploadImage(file, path, onProgress) {
        try {
            const imageRef = ref(this.storage, `images/${path}`);
            if (onProgress) {
                // Upload with progress tracking
                const uploadTask = uploadBytesResumable(imageRef, file);
                return new Promise((resolve) => {
                    uploadTask.on('state_changed', (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        onProgress(progress);
                    }, (error) => {
                        console.error('Error uploading image:', error);
                        resolve({ success: false, error: error.message || 'Failed to upload image' });
                    }, async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve({ success: true, data: downloadURL });
                        }
                        catch (error) {
                            resolve({ success: false, error: error.message || 'Failed to get download URL' });
                        }
                    });
                });
            }
            else {
                // Simple upload without progress
                const snapshot = await uploadBytes(imageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return { success: true, data: downloadURL };
            }
        }
        catch (error) {
            console.error('Error uploading image:', error);
            return { success: false, error: error.message || 'Failed to upload image' };
        }
    }
    // Upload multiple images
    async uploadImages(files, basePath, onProgress) {
        try {
            const uploadPromises = files.map(async (file, index) => {
                const fileName = `${basePath}_${index}_${Date.now()}`;
                const result = await this.uploadImage(file, fileName, onProgress ? (progress) => onProgress(index, progress) : undefined);
                if (!result.success) {
                    throw new Error(result.error);
                }
                return result.data;
            });
            const urls = await Promise.all(uploadPromises);
            return { success: true, data: urls };
        }
        catch (error) {
            console.error('Error uploading multiple images:', error);
            return { success: false, error: error.message || 'Failed to upload images' };
        }
    }
    // Delete image
    async deleteImage(path) {
        try {
            const imageRef = ref(this.storage, `images/${path}`);
            await deleteObject(imageRef);
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting image:', error);
            return { success: false, error: error.message || 'Failed to delete image' };
        }
    }
    // Get image URL
    async getImageURL(path) {
        try {
            const imageRef = ref(this.storage, `images/${path}`);
            const url = await getDownloadURL(imageRef);
            return { success: true, data: url };
        }
        catch (error) {
            console.error('Error getting image URL:', error);
            return { success: false, error: error.message || 'Failed to get image URL' };
        }
    }
    // Validate image file
    static validateImageFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
            };
        }
        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'File size too large. Maximum size is 5MB.'
            };
        }
        return { valid: true };
    }
    // Compress image before upload (client-side)
    static async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, file.type, quality);
            };
            img.src = URL.createObjectURL(file);
        });
    }
}
