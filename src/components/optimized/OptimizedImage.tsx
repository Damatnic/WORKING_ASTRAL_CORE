/**
 * Optimized Image Component
 * Provides performance-optimized image loading with Next.js Image component
 */

import Image, { ImageProps } from 'next/image';
import React, { memo, useState, useCallback } from 'react';
import { useDeviceCapabilities } from '@/lib/performance/dynamic-imports';

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  lowQualitySrc?: string;
  aspectRatio?: number;
  enableLazyLoading?: boolean;
  enableBlurPlaceholder?: boolean;
  enableCriticalResource?: boolean;
  onLoadComplete?: (duration: number) => void;
  className?: string;
}

const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  fallbackSrc,
  lowQualitySrc,
  aspectRatio,
  enableLazyLoading = true,
  enableBlurPlaceholder = true,
  enableCriticalResource = false,
  onLoadComplete,
  className = '',
  priority,
  quality,
  sizes,
  fill,
  width,
  height,
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadStartTime] = useState(() => performance.now());
  const capabilities = useDeviceCapabilities();

  // Determine optimal image quality based on device capabilities
  const getOptimalQuality = useCallback(() => {
    if (quality) return quality;
    
    if (capabilities.isSlowNetwork) return 60;
    if (capabilities.isLowEnd) return 70;
    return 80;
  }, [quality, capabilities]);

  // Determine optimal sizes attribute
  const getOptimalSizes = useCallback(() => {
    if (sizes) return sizes;
    
    // Default responsive sizes
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }, [sizes]);

  // Handle successful image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    
    if (onLoadComplete) {
      const loadTime = performance.now() - loadStartTime;
      onLoadComplete(loadTime);
    }
  }, [onLoadComplete, loadStartTime]);

  // Handle image load error
  const handleError = useCallback(() => {
    console.warn(`[OptimizedImage] Failed to load image: ${src}`);
    setHasError(true);
    setIsLoading(false);
  }, [src]);

  // Get the appropriate image source
  const getImageSrc = useCallback(() => {
    if (hasError && fallbackSrc) {
      return fallbackSrc;
    }
    
    if (capabilities.isSlowNetwork && lowQualitySrc) {
      return lowQualitySrc;
    }
    
    return src;
  }, [hasError, fallbackSrc, capabilities.isSlowNetwork, lowQualitySrc, src]);

  // Generate blur data URL for placeholder
  const getBlurDataURL = useCallback(() => {
    if (!enableBlurPlaceholder) return undefined;
    
    // Generate a simple blur placeholder
    const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
    if (!canvas) return undefined;
    
    canvas.width = 10;
    canvas.height = aspectRatio ? Math.round(10 / aspectRatio) : 10;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    // Create simple gradient blur
    const gradient = ctx.createLinearGradient(0, 0, 10, 10);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 10, 10);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }, [enableBlurPlaceholder, aspectRatio]);

  // Determine if image should be loaded with high priority
  const shouldUsePriority = enableCriticalResource || priority || !enableLazyLoading;

  // Base image props
  const imageProps: ImageProps = {
    src: getImageSrc(),
    alt,
    quality: getOptimalQuality(),
    priority: shouldUsePriority,
    onLoad: handleLoad,
    onError: handleError,
    sizes: getOptimalSizes(),
    className: `transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`,
    style: {
      objectFit: 'cover',
      ...style
    },
    ...props
  };

  // Add blur placeholder if enabled
  if (enableBlurPlaceholder) {
    const blurDataURL = getBlurDataURL();
    if (blurDataURL) {
      imageProps.placeholder = 'blur';
      imageProps.blurDataURL = blurDataURL;
    }
  }

  // Add dimensions
  if (fill) {
    imageProps.fill = true;
  } else if (width && height) {
    imageProps.width = width;
    imageProps.height = height;
  }

  // Error state with fallback
  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center text-gray-500 ${className}`}
        style={{
          width: width || '100%',
          height: height || 'auto',
          aspectRatio: aspectRatio || 'auto',
          ...style
        }}
        role="img"
        aria-label={`Failed to load image: ${alt}`}
      >
        <div className="text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Image unavailable</span>
        </div>
      </div>
    );
  }

  // Wrap with container for aspect ratio if needed
  if (aspectRatio && !fill && !height) {
    return (
      <div 
        className="relative overflow-hidden"
        style={{ aspectRatio: aspectRatio }}
      >
        <Image
          {...imageProps}
          fill
          className={`object-cover ${imageProps.className}`}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Image {...imageProps} />
      
      {/* Loading overlay for non-fill images */}
      {isLoading && !fill && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{
            width: width || '100%',
            height: height || 'auto'
          }}
        >
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
    </>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Avatar-specific optimized image
 */
interface OptimizedAvatarProps extends Omit<OptimizedImageProps, 'aspectRatio'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  name?: string;
}

export const OptimizedAvatar = memo<OptimizedAvatarProps>(({
  size = 'md',
  name,
  alt,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const dimensions = {
    xs: { width: 24, height: 24 },
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 }
  };

  // Generate initials fallback if name is provided
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center relative ${className}`}>
      <OptimizedImage
        {...props}
        alt={alt || `${name}'s avatar`}
        width={dimensions[size].width}
        height={dimensions[size].height}
        aspectRatio={1}
        className="rounded-full"
        quality={60} // Lower quality for avatars
        fallbackSrc={undefined} // Handle fallback with initials below
      />
      
      {/* Initials fallback */}
      {name && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300 text-gray-600 font-medium text-sm">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

/**
 * Hero image with optimized loading
 */
interface OptimizedHeroImageProps extends OptimizedImageProps {
  overlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
}

export const OptimizedHeroImage = memo<OptimizedHeroImageProps>(({
  overlay = false,
  overlayColor = 'bg-black',
  overlayOpacity = 0.3,
  className = '',
  ...props
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <OptimizedImage
        {...props}
        enableCriticalResource={true}
        priority={true}
        quality={85} // Higher quality for hero images
        sizes="100vw"
        fill
        className="object-cover"
      />
      
      {overlay && (
        <div 
          className={`absolute inset-0 ${overlayColor}`}
          style={{ opacity: overlayOpacity }}
        />
      )}
    </div>
  );
});

OptimizedHeroImage.displayName = 'OptimizedHeroImage';

export default OptimizedImage;