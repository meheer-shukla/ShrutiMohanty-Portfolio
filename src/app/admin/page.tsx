"use client";

import { useState, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [images, setImages] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Editorial");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Basic persistent auth check via sessionStorage
    if (typeof window !== "undefined" && sessionStorage.getItem("adminAuth") === "true") {
      setIsAuthenticated(true);
      fetchImages();
    }
  }, []);

  const fetchImages = async () => {
    try {
      const res = await fetch("/api/gallery");
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error("Failed to fetch images", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsAuthenticated(true);
          sessionStorage.setItem("adminAuth", "true");
          fetchImages();
          return;
        }
      } else {
        const errData = await res.json();
        setLoginError(errData.error || "Incorrect password");
        return;
      }
      setLoginError("Incorrect password");
    } catch (err) {
      setLoginError("Authentication failed");
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    
    // Optimistic UI: remove from state immediately
    const previousImages = [...images];
    setImages(prev => prev.filter(img => img.id !== id));
    
    try {
      const res = await fetch(`/api/gallery?id=${id}&url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Rollback on failure
        setImages(previousImages);
        alert("Failed to delete photo");
      }
    } catch (err) {
      console.error(err);
      // Rollback on failure
      setImages(previousImages);
      alert("Failed to delete photo");
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuth");
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch (e) {}
  };

  const handleHomeClick = () => {
    handleLogout();
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) {
      alert("Please select a file.");
      return;
    }
    
    setUploading(true);
    
    // Create a local preview immediately
    const tempId = Date.now().toString();
    const localPreviewUrl = URL.createObjectURL(newFile);
    const optimisticItem = {
      id: tempId,
      title: newTitle,
      category: newCategory,
      url: localPreviewUrl,
    };
    
    // Save current state for rollback
    const previousImages = [...images];
    
    // Optimistic UI: add to grid immediately and close modal
    setImages(prev => [optimisticItem, ...prev]);
    setShowModal(false);
    
    const savedTitle = newTitle;
    const savedDescription = newDescription;
    const savedCategory = newCategory;
    const savedFile = newFile;
    setNewTitle("");
    setNewDescription("");
    setNewCategory("Editorial");
    setNewFile(null);
    
    try {
      let fileUrl = "";
      
      // 1. Attempt Vercel Blob Client Upload (bypasses 4.5MB limit)
      try {
        const blob = await upload(savedFile.name, savedFile, {
          access: 'public',
          handleUploadUrl: '/api/gallery/upload',
        });
        fileUrl = blob.url;
      } catch (uploadError) {
        console.warn("Client upload skipped or failed, falling back to server upload.", uploadError);
      }

      // 2. Save metadata (and file if client upload failed)
      const formData = new FormData();
      formData.append("title", savedTitle);
      formData.append("category", savedCategory);
      formData.append("description", savedDescription);
      
      if (fileUrl) {
        formData.append("url", fileUrl);
      } else {
        formData.append("file", savedFile);
      }

      const res = await fetch("/api/gallery", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = `Upload failed (Status: ${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch (parseError) {
          // If it fails to parse JSON, it might be an HTML error page from Vercel (e.g. 413 Payload Too Large)
          if (res.status === 413) {
            errorMessage = "File is too large. Vercel limits server uploads to 4.5MB.";
          } else {
            errorMessage = `Server error ${res.status}: ${res.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }
      
      // Replace optimistic item with real server data
      const data = await res.json();
      if (data.item) {
        setImages(prev => prev.map(img => img.id === tempId ? data.item : img));
      } else {
        // Fallback: re-fetch
        fetchImages();
      }
      
      URL.revokeObjectURL(localPreviewUrl);
    } catch (err: any) {
      console.error(err);
      // Rollback on failure
      setImages(previousImages);
      URL.revokeObjectURL(localPreviewUrl);
      alert(`Failed to add photo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Restricted Access</h1>
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={styles.passwordInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--on-surface-variant)" }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            <button type="submit" className="btn-primary">Login</button>
            {loginError && <p className={styles.errorText}>{loginError}</p>}
          </form>
          <div style={{ marginTop: '24px' }}>
            <Link href="/" onClick={handleHomeClick} style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <Link href="/" onClick={handleHomeClick} className={styles.logo}>Shruti Mohanty</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <nav className={styles.navLinks}>
            <Link href="/gallery" className={styles.navLink}>View Gallery</Link>
            <button onClick={handleLogout} className={styles.btnSmall}>Log Out</button>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Gallery Management</h1>
          <p className={styles.pageSubtitle}>Manage and curate your portfolio entries.</p>
        </div>

        {/* Upload Dropzone (Simulated) */}
        <div className={styles.uploadZone} onClick={() => setShowModal(true)}>
          <div className={styles.uploadIcon}>+</div>
          <h2 className={styles.uploadTitle}>Add New Photo</h2>
          <p className={styles.uploadSubtitle}>Click to enter image URL and metadata</p>
        </div>

        {/* Photo Grid */}
        <div className={styles.photoGrid}>
          {images.map((img) => {
            const filename = img.url.split('/').pop()?.split('?')[0] || `${img.title}.jpg`;
            return (
              <div key={img.id} className={styles.photoCard}>
                <div className={styles.photoThumb}>
                  <Image 
                    src={img.url} 
                    alt={img.title} 
                    fill 
                    className={styles.image}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(img.id, img.url)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', zIndex: 10 }}
                  >
                    Delete
                  </button>
                </div>
                <div className={styles.photoMeta}>
                  <span className={styles.photoDate}>{img.category || "UNCATEGORIZED"}</span>
                  <span className={styles.photoFilename}>{img.title.replace(/\s+/g, '_')}_{img.id.substring(0,4)}.jpg</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal for adding URL */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Add Artwork</h2>
            <form onSubmit={handleAddPhoto}>
              <div className={styles.formGroup}>
                <label className="label-md">Artwork Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className="label-md">Description (up to 100 words)</label>
                <textarea 
                  className={styles.textareaField}
                  placeholder="Enter a short description about this piece..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className="label-md">Category</label>
                <select 
                  className="input-field" 
                  required 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                >
                  <option value="Editorial">Editorial</option>
                  <option value="Abstract">Abstract</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className="label-md">Image File</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="input-field" 
                  required 
                  onChange={e => setNewFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Adding...' : 'Add Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
