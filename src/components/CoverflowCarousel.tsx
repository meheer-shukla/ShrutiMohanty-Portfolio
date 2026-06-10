'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CoverflowCarousel.module.css';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category?: string;
  description?: string;
}

export default function CoverflowCarousel({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, images.length - 1));
  }, [images.length]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const isScrollingRef = useRef(false);
  const isInViewRef = useRef(false);

  // Setup Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle wheel events for scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isInViewRef.current) return; // Don't intercept if not in view

      const isScrollDown = e.deltaY > 0 || e.deltaX > 0;
      const isScrollUp = e.deltaY < 0 || e.deltaX < 0;

      // Allow page scroll if we are at the boundaries
      if (isScrollDown && activeIndex === images.length - 1) {
        return;
      }
      if (isScrollUp && activeIndex === 0) {
        return;
      }

      // Inside carousel bounds: prevent page scroll and change images
      e.preventDefault(); 
      if (isScrollingRef.current) return;

      isScrollingRef.current = true;
      if (isScrollDown) {
        next();
      } else {
        prev();
      }

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 400); // Debounce duration to prevent flying through
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [activeIndex, images.length, next, prev]);

  // Touch handling for mobile swipe
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      next();
    } else if (diff < -50) {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    touchStartX.current = null;
  };

  if (images.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <h2 className={styles.emptyTitle}>Gallery Coming Soon</h2>
          <p className={styles.emptyDesc}>
            We are currently curating a new collection of visual works. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.carouselWrapper}>
      <div 
        className={styles.carouselContainer} 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((image, index) => {
          const offset = index - activeIndex;
          const absOffset = Math.abs(offset);
          const direction = Math.sign(offset);

          let translateX = 0;
          let scale = 1.1; // Make center image bigger
          let zIndex = 100 - absOffset;
          let opacity = 1;

          if (absOffset > 0) {
            // Adjust overlap and spread
            translateX = direction * (absOffset * 65); 
            scale = Math.max(0.85 - (absOffset - 1) * 0.15, 0.4);
            opacity = Math.max(1 - absOffset * 0.15, 0);
          }

          const isActive = offset === 0;

          return (
            <div
              key={image.id}
              className={`${styles.carouselItem} ${isActive ? styles.active : ''}`}
              onClick={() => setActiveIndex(index)}
              style={{
                transform: `translate(-50%, -50%) translateX(${translateX}%) scale(${scale})`,
                zIndex,
                opacity,
                pointerEvents: absOffset > 3 ? 'none' : 'auto',
              }}
            >
              <div className={styles.imageContainer}>
                <Image
                  src={image.url}
                  alt={image.title}
                  fill
                  className={styles.image}
                  sizes="(max-width: 768px) 250px, 400px"
                  priority={absOffset <= 1}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Active Image Metadata */}
      <div className={styles.metadataContainer}>
        <span className={styles.category}>{images[activeIndex]?.category || 'Editorial'}</span>
        <h3 className={styles.title}>{images[activeIndex]?.title}</h3>
        <p className={styles.description}>
          {images[activeIndex]?.description || 'No additional description provided for this work.'}
        </p>
      </div>
    </div>
  );
}
