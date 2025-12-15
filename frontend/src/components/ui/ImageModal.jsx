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
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image */}
          <div className="p-4">
            <img
              src={imageUrl}
              alt={altText || 'Full size image'}
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
