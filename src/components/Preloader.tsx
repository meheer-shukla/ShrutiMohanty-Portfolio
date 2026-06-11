'use client';
import { useState, useEffect } from 'react';
import styles from './Preloader.module.css';

export default function Preloader() {
  const [stage, setStage] = useState<'loading' | 'flashing' | 'hiding' | 'done'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Hide native scrollbar while preloading
    document.body.style.overflow = 'hidden';
    
    // Simulate loading progress (fast — ~1.2s total)
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Larger increments for faster completion
      const increment = currentProgress > 85 ? Math.floor(Math.random() * 6) + 2 : Math.floor(Math.random() * 18) + 8;
      currentProgress += increment;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // When 100% is reached, trigger the flash quickly
        setTimeout(() => {
          setStage('flashing');
          setTimeout(() => {
            setStage('hiding');
            document.body.style.overflow = '';
            setTimeout(() => {
              setStage('done');
            }, 500);
          }, 300); // Shutter flash trigger duration
        }, 200); // Brief pause after hitting 100%
      }
      setProgress(currentProgress);
    }, 80); // Faster update interval

    return () => {
      clearInterval(interval);
      document.body.style.overflow = '';
    };
  }, []);

  if (stage === 'done') return null;

  return (
    <div className={`${styles.preloader} ${stage === 'hiding' ? styles.hidden : ''}`}>
      <div className={`${styles.cameraContainer} ${stage !== 'loading' ? styles.hideFrame : ''}`}>
        
        <div className={styles.cameraIcon}>
          <div className={styles.cameraBody}>
            <div className={styles.cameraLens}>
              <div className={styles.lensReflection}></div>
            </div>
            <div className={styles.cameraFlash}></div>
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.percentage}>{progress}%</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
          </div>
        </div>

      </div>
      <div className={`${styles.shutter} ${stage === 'flashing' ? styles.flash : ''}`}></div>
    </div>
  );
}
