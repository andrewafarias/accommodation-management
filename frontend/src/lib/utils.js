import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function to merge Tailwind classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Get the current date in YYYY-MM-DD format without timezone conversion.
 * This ensures the date stays consistent regardless of the user's timezone.
 * 
 * @param {Date} [date=new Date()] - The date to format (defaults to current date)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
