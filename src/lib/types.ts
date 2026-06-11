export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category?: string;
  description?: string;
  createdAt?: string | Date;
}

/** Allowed gallery categories — used for server-side validation */
export const ALLOWED_CATEGORIES = ['Editorial', 'Abstract', 'Wedding', 'Personal'] as const;
export type GalleryCategory = typeof ALLOWED_CATEGORIES[number];
