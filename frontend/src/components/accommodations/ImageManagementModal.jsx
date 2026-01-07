import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { ImageUploadManager } from './ImageUploadManager';

/**
 * ImageManagementModal Component
 * 
 * Modal dialog for managing images of an accommodation unit.
 * Allows uploading, deleting, and reordering images.
 */
export function ImageManagementModal({ 
  isOpen, 
  onClose, 
  accommodationUnit = null
}) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (isOpen && accommodationUnit) {
      // Load images from unit
      setImages(accommodationUnit.images || []);
    }
  }, [isOpen, accommodationUnit]);

  const handleImagesChange = (newImages) => {
    setImages(newImages);
  };

  if (!isOpen || !accommodationUnit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Gerenciar Imagens
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {accommodationUnit.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <ImageUploadManager
            accommodationUnit={accommodationUnit}
            images={images}
            onImagesChange={handleImagesChange}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t">
          <Button
            type="button"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
