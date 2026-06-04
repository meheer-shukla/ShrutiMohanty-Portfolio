'use client';

import Image from 'next/image';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import styles from './InfiniteGallery.module.css';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category?: string;
  description?: string;
}

export default function InfiniteGallery({ images }: { images: GalleryImage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    if (!containerRef.current || images.length === 0) return;

    let mm = gsap.matchMedia();

    mm.add({
      isDesktop: "(min-width: 768px)",
      isMobile: "(max-width: 767px)"
    }, (context) => {
      let { isDesktop, isMobile } = context.conditions as { isDesktop: boolean, isMobile: boolean };
      
      const tl = gsap.timeline();

      for (let i = 0; i < images.length; i++) {
        // Phase 1: Enter (if i > 0)
        if (i > 0) {
          tl.fromTo(itemsRef.current[i], 
            { opacity: 0, scale: 1.1, filter: "blur(20px)" },
            { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1, ease: "power2.inOut" },
            `exit${i - 1}` // Enters exactly when previous exits
          );
        }

        // Phase 2: Split (Image shifts, Text appears)
        // Initial state for text container (hidden/collapsed)
        gsap.set(textRefs.current[i], { 
          width: isDesktop ? 0 : "100%", 
          height: isDesktop ? "auto" : 0, 
          opacity: 0,
          marginTop: isDesktop ? 0 : -20 // Slight offset for mobile pop-in
        });

        tl.to(textRefs.current[i], {
          width: isDesktop ? 400 : "100%",
          height: isDesktop ? "auto" : 140, 
          opacity: 1,
          marginTop: 0,
          duration: 1,
          ease: "power2.inOut",
        }, `split${i}`);

        // Phase 3: Exit (if not the last image)
        if (i < images.length - 1) {
          tl.to(itemsRef.current[i], {
            opacity: 0,
            scale: 0.9,
            filter: "blur(12px)",
            duration: 1,
            ease: "power2.inOut",
          }, `exit${i}`);
        }
      }

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: () => `+=${images.length * 150}%`, // Longer scroll distance for 3 phases per image
        pin: true,
        animation: tl,
        scrub: 1,
        invalidateOnRefresh: true,
      });

      return () => {
        ScrollTrigger.getAll().forEach(t => t.kill());
      };
    });

  }, { scope: containerRef, dependencies: [images.length] });

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
    <div className={styles.galleryWrapper}>
      <div ref={containerRef} className={styles.pinContainer}>
        <div className={styles.galleryStack}>
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className={styles.galleryItem}
              ref={(el) => {
                itemsRef.current[index] = el;
              }}
            >
              <div className={styles.imageContainer}>
                <Image
                  src={image.url}
                  alt={image.title}
                  fill
                  className={styles.image}
                  sizes="(max-width: 768px) 360px, 440px"
                  priority={index === 0} 
                />
              </div>
              <div 
                className={styles.textContainer}
                ref={(el) => {
                  textRefs.current[index] = el;
                }}
              >
                <span className={styles.category}>{image.category || 'Editorial'}</span>
                <h3 className={styles.title}>{image.title}</h3>
                {image.description && (
                  <p className={styles.description}>{image.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
