'use client';
import { useState, useEffect } from 'react';
import styles from './Preloader.module.css';

export default function Preloader() {
  const [stage, setStage] = useState<'loading' | 'flashing' | 'hiding' | 'done'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Hide native scrollbar while preloading
    document.body.style.overflow = 'hidden';
    
    // Simulate loading progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      // Slow down towards the end for realism
      const increment = currentProgress > 85 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 12) + 4;
      currentProgress += increment;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // When 100% is reached, wait a moment, then trigger the flash
        setTimeout(() => {
          setStage('flashing');
          setTimeout(() => {
            setStage('hiding');
            document.body.style.overflow = '';
            setTimeout(() => {
              setStage('done');
            }, 800);
          }, 400); // Shutter flash trigger duration
        }, 500); // Wait 0.5s after hitting 100%
      }
      setProgress(currentProgress);
    }, 120); // Update speed interval

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
