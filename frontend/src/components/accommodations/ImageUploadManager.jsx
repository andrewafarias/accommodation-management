import { useState } from 'react';
import { Upload, X, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';

/**
 * ImageUploadManager Component
 * 
 * Component for managing images for accommodation units.
 * Features:
 * - Upload multiple images at once
 * - Delete images
 * - Reorder images
 * - Preview images
 */
export function ImageUploadManager({ accommodationUnit, images = [], onImagesChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('accommodation_unit', accommodationUnit.id);
      
      files.forEach((file) => {
        formData.append('images', file);
      });

      // Upload images
      const response = await api.post('unit-images/bulk_upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Notify parent component
      if (onImagesChange) {
        onImagesChange([...images, ...response.data.images]);
      }

      // Clear file input
      e.target.value = '';
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(
        err.response?.data?.error || 
        'Erro ao fazer upload das imagens. Tente novamente.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta imagem?')) {
      return;
    }

    try {
      await api.delete(`unit-images/${imageId}/`);
      
      // Update images list
      const updatedImages = images.filter(img => img.id !== imageId);
      if (onImagesChange) {
        onImagesChange(updatedImages);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Erro ao excluir imagem. Tente novamente.');
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;

    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    
    await reorderImages(newImages);
  };

  const handleMoveDown = async (index) => {
    if (index === images.length - 1) return;

    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    
    await reorderImages(newImages);
  };

  const reorderImages = async (newImages) => {
    try {
      const imageIds = newImages.map(img => img.id);
      await api.post('unit-images/reorder/', { image_ids: imageIds });
      
      if (onImagesChange) {
        onImagesChange(newImages);
      }
    } catch (err) {
      console.error('Error reordering images:', err);
      setError('Erro ao reordenar imagens. Tente novamente.');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload de Imagens
        </label>
        <div className="flex items-center space-x-3">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Upload className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">
                {uploading ? 'Fazendo upload...' : 'Selecionar Imagens'}
              </span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Selecione uma ou mais imagens para fazer upload
        </p>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagens ({images.length})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
              >
                {/* Image Preview */}
                <div className="aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.caption || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mover para cima"
                    >
                      <MoveUp className="w-4 h-4 text-gray-700" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === images.length - 1}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Mover para baixo"
                    >
                      <MoveDown className="w-4 h-4 text-gray-700" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="p-2 bg-red-500 rounded-full hover:bg-red-600"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Order badge */}
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Nenhuma imagem ainda. Faça upload das primeiras imagens desta unidade.
        </div>
      )}
    </div>
  );
}
