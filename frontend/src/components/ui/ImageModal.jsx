import { X } from 'lucide-react';

/**
 * ImageModal Component
 * 
 * Modal for displaying images in full size.
 * Features:
 * - Click outside to close
 * - Close button
 * - Centered image display
 */
export function ImageModal({ isOpen, onClose, imageUrl, altText }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-primary-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-soft-xl max-w-4xl w-full border border-primary-100">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white bg-gradient-to-r from-secondary-500 to-primary-500 hover:from-secondary-600 hover:to-primary-600 rounded-full p-2.5 transition-all duration-200 shadow-soft hover:shadow-soft-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image */}
          <div className="p-6">
            <img
              src={imageUrl}
              alt={altText || 'Full size image'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
