import React, { useState, useEffect } from 'react';
import { imageCache } from '../utils/imageLoader';

/**
 * SmartImage component that handles CORS issues for Firebase Storage images
 * Falls back to Capacitor HTTP loading when direct loading fails
 */
const SmartImage = ({ 
  src, 
  fallbackSrc, 
  alt = "Image", 
  onLoad, 
  onError, 
  style = {}, 
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        console.log('🖼️ [SmartImage] Loading image:', src);
        
        // Try to get from cache or load with smart loader
        const processedSrc = await imageCache.get(src);
        console.log('🖼️ [SmartImage] Processed src:', processedSrc ? processedSrc.substring(0, 50) + '...' : 'null');
        
        if (processedSrc) {
          setImageSrc(processedSrc);
          
          // For blob URLs, we can assume they're valid since they were created successfully
          if (processedSrc.startsWith('blob:')) {
            console.log('✅ [SmartImage] Using blob URL directly');
            setIsLoading(false);
            onLoad && onLoad();
            return;
          }
          
          // For regular URLs, verify they load
          const img = new Image();
          img.onload = () => {
            console.log('✅ [SmartImage] Image loaded successfully');
            setIsLoading(false);
            onLoad && onLoad();
          };
          img.onerror = (error) => {
            console.log('❌ [SmartImage] Image failed to load, using fallback');
            setHasError(true);
            setImageSrc(fallbackSrc);
            setIsLoading(false);
            onError && onError(error);
          };
          img.src = processedSrc;
        } else {
          throw new Error('No processed src returned');
        }
        
      } catch (error) {
        console.error('❌ [SmartImage] Failed to process image:', error);
        setHasError(true);
        setImageSrc(fallbackSrc);
        setIsLoading(false);
        onError && onError(error);
      }
    };

    loadImage();
  }, [src, fallbackSrc, onLoad, onError]);

  const handleError = (error) => {
    if (!hasError && fallbackSrc && imageSrc !== fallbackSrc) {
      console.log('🔄 [SmartImage] Switching to fallback image');
      setHasError(true);
      setImageSrc(fallbackSrc);
    }
  };

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      style={{
        ...style,
        opacity: isLoading ? 0.7 : 1,
        transition: 'opacity 0.3s ease'
      }}
      onError={handleError}
      onLoad={() => {
        setIsLoading(false);
        onLoad && onLoad();
      }}
    />
  );
};

export default SmartImage;