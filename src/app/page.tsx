import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getGalleryImages } from "@/lib/gallery";
import InfiniteGallery from "@/components/InfiniteGallery";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const galleryData = await getGalleryImages();
  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Shruti Mohanty
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <nav className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="#gallery" className={styles.navLink}>Gallery</Link>
            <Link href="#contact" className={styles.navLink}>Contact</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Curating<br />Digital<br /><em>Emotions</em>
          </h1>
        </div>
        <div className={styles.heroImages}>
          <div className={styles.heroImage1}>
            <Image
              src="/images/IMG_6111.JPG"
              alt="Editorial Hero Image"
              fill
              className={styles.heroImg}
            />
          </div>
          <div className={styles.heroImage2}>
            <Image
              src="/images/IMG_6028.JPG"
              alt="Abstract Placeholder"
              fill
              className={styles.heroImg}
            />
          </div>
        </div>
      </section>

      <section id="about" className={styles.storytelling}>
        <div className={styles.storytellingGrid}>
          <h2 className={styles.storyTitle}>The Art of Storytelling</h2>
          <div className={styles.storyText}>
            <p>My narrative is woven into every frame. I believe that behind every great visual is an untold story waiting to be expressed. With a deep appreciation for the subtle and the profound, I curate moments that transcend the ordinary.</p>
            <p>It is not just about what is seen, but what is felt. I craft experiences that resonate deeply, bringing emotional depth to digital spaces.</p>
          </div>
        </div>
      </section>

      <section id="gallery" className={styles.gallerySection}>
        <div className={styles.galleryHeader}>
          <span className={styles.galleryLabel}>Curated Works</span>
          <h2 className={styles.galleryTitle}>The Gallery</h2>
        </div>
        <InfiniteGallery images={galleryData} />
      </section>

      <section id="contact" className={styles.cta}>
        <div className={styles.ctaHeader}>
          <h2 className={styles.ctaTitle}>Start A <em>Conversation</em></h2>
          <p className={styles.ctaDesc}>Get in touch to discuss your next project, collaboration, or any inquiries you might have.</p>
        </div>
        <form className={styles.contactForm} action="https://api.web3forms.com/submit" method="POST">
          <input type="hidden" name="access_key" value={process.env.NEXT_PUBLIC_WEB3FORMS_KEY || ''} />
          <input type="hidden" name="subject" value="New message from Portfolio" />
          <input type="hidden" name="redirect" value="" />
          <div className={styles.formGroup}>
            <input type="text" name="name" placeholder="YOUR NAME" className={styles.contactInput} required />
          </div>
          <div className={styles.formGroup}>
            <input type="email" name="email" placeholder="EMAIL ADDRESS" className={styles.contactInput} required />
          </div>
          <div className={styles.formGroup}>
            <textarea name="message" placeholder="MESSAGE" className={styles.contactInput} rows={5} required></textarea>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>Send Message</button>
        </form>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.footerLink}>© Shruti Mohanty {new Date().getFullYear()}</span>
        </div>
        <div className={styles.footerRight}>
          <Link href="https://www.linkedin.com/in/shrutimohanty/" className={styles.footerLink}>LinkedIn</Link>
          <Link href="https://www.instagram.com/sochography_?igsh=MTJoZnNjbXk0YXgzcg==" className={styles.footerLink}>Instagram</Link>
          <Link href="/admin" className={`${styles.footerLink} ${styles.adminLink}`} aria-label="Admin Access">⌘</Link>
        </div>
      </footer>
    </div>
  );
}
