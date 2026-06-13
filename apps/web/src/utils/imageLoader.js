// Firebase Storage Image Loader for iOS Capacitor
// Handles CORS issues by using Capacitor HTTP plugin as fallback

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

/**
 * Load image using Capacitor HTTP plugin to bypass CORS issues
 */
export const loadImageWithCapacitorHttp = async (imageUrl) => {
  try {
    console.log('🔄 [ImageLoader] Loading image via Capacitor HTTP:', imageUrl);
    
    const response = await CapacitorHttp.get({
      url: imageUrl,
      headers: {
        'Accept': 'image/*'
      }
    });
    
    console.log('🔍 [ImageLoader] HTTP response status:', response.status);
    console.log('🔍 [ImageLoader] HTTP response data type:', typeof response.data);
    
    if (response.status === 200) {
      // Capacitor HTTP returns different data formats on different platforms
      let blob;
      
      if (typeof response.data === 'string') {
        // Base64 string - convert to blob
        console.log('📄 [ImageLoader] Converting base64 to blob');
        const base64Data = response.data.includes(',') ? response.data.split(',')[1] : response.data;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/jpeg' });
      } else {
        // ArrayBuffer or Blob
        console.log('💾 [ImageLoader] Converting ArrayBuffer/Blob to blob');
        blob = new Blob([response.data], { type: 'image/jpeg' });
      }
      
      const blobUrl = URL.createObjectURL(blob);
      console.log('✅ [ImageLoader] Image loaded successfully via HTTP, blob URL:', blobUrl.substring(0, 50) + '...');
      return blobUrl;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ [ImageLoader] Failed to load image via HTTP:', error);
    throw error;
  }
};

/**
 * Smart image loader that tries direct loading first, then falls back to HTTP
 */
export const loadImageSmart = async (imageUrl) => {
  const platform = Capacitor.getPlatform();
  
  // On native platforms, try Capacitor HTTP first to avoid CORS
  if (platform === 'ios' || platform === 'android') {
    try {
      return await loadImageWithCapacitorHttp(imageUrl);
    } catch (error) {
      console.log('🔄 [ImageLoader] HTTP method failed, falling back to direct URL');
      // Fall back to direct URL
      return imageUrl;
    }
  }
  
  // On web, use direct URL
  return imageUrl;
};

/**
 * Preload image to check if it loads successfully
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });
};

/**
 * Create a cached image loader
 */
class ImageCache {
  constructor() {
    this.cache = new Map();
  }
  
  async get(url) {
    if (this.cache.has(url)) {
      console.log('📋 [ImageLoader] Serving from cache:', url);
      return this.cache.get(url);
    }
    
    try {
      const processedUrl = await loadImageSmart(url);
      this.cache.set(url, processedUrl);
      return processedUrl;
    } catch (error) {
      console.error('❌ [ImageLoader] Failed to load and cache image:', error);
      throw error;
    }
  }
  
  clear() {
    // Clean up blob URLs to prevent memory leaks
    for (const [url, blobUrl] of this.cache.entries()) {
      if (blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    }
    this.cache.clear();
  }
}

export const imageCache = new ImageCache();