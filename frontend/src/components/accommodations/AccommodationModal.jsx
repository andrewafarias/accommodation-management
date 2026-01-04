import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import api from '../../services/api';

/**
 * AccommodationModal Component
 * 
 * Modal dialog for creating or editing accommodation units.
 * Localized for Brazilian Portuguese (PT-BR).
 */
export function AccommodationModal({ 
  isOpen, 
  onClose, 
  accommodation = null,
  onSave 
}) {
  const [formData, setFormData] = useState({
    name: '',
    max_capacity: 1,
    base_price: '',
    weekend_price: '',
    holiday_price: '',
    color_hex: '#4A90E2',
    auto_dirty_days: 3,
    default_check_in_time: '14:00',
    default_check_out_time: '12:00',
    short_description: '',
    long_description: '',
    album_photos: [],
    rules: '',
  });
  
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);



  // Initialize form data when modal opens or accommodation changes
  useEffect(() => {
    if (isOpen) {
      if (accommodation) {
        // Edit mode
        setFormData({
          name: accommodation.name || '',
          max_capacity: accommodation.max_capacity || 1,
          base_price: accommodation.base_price || '',
          weekend_price: accommodation.weekend_price || '',
          holiday_price: accommodation.holiday_price || '',
          color_hex: accommodation.color_hex || '#4A90E2',
          auto_dirty_days: accommodation.auto_dirty_days || 3,
          default_check_in_time: accommodation.default_check_in_time || '14:00',
          default_check_out_time: accommodation.default_check_out_time || '12:00',
          short_description: accommodation.short_description || '',
          long_description: accommodation.long_description || '',
          album_photos: accommodation.album_photos || [],
          rules: accommodation.rules || '',
        });
      } else {
        // Create mode
        setFormData({
          name: '',
          max_capacity: 1,
          base_price: '',
          weekend_price: '',
          holiday_price: '',
          color_hex: '#4A90E2',
          auto_dirty_days: 3,
          default_check_in_time: '14:00',
          default_check_out_time: '12:00',
          short_description: '',
          long_description: '',
          album_photos: [],
          rules: '',
        });
      }
      setError(null);
      setNewPhotoUrl('');
    }
  }, [isOpen, accommodation]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare data for API
      const payload = {
        name: formData.name,
        max_capacity: Number(formData.max_capacity),
        base_price: formData.base_price,
        weekend_price: formData.weekend_price || null,
        holiday_price: formData.holiday_price || null,
        color_hex: formData.color_hex,
        auto_dirty_days: Number(formData.auto_dirty_days),
        default_check_in_time: formData.default_check_in_time,
        default_check_out_time: formData.default_check_out_time,
        short_description: formData.short_description || null,
        long_description: formData.long_description || null,
        album_photos: formData.album_photos || [],
        rules: formData.rules || null,
      };

      let response;
      if (accommodation) {
        // Update existing accommodation
        response = await api.put(`accommodations/${accommodation.id}/`, payload);
      } else {
        // Create new accommodation
        response = await api.post('accommodations/', payload);
      }

      // Call the onSave callback with the new/updated accommodation
      // The parent will handle closing the modal and refreshing the list
      if (onSave) {
        await onSave(response.data);
      }
    } catch (err) {
      console.error('Error saving accommodation:', err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message ||
        err.response?.data?.name?.[0] ||
        'Erro ao salvar unidade. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {accommodation ? 'Editar Unidade' : 'Nova Unidade'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Chalé 1"
            />
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor="max_capacity" className="block text-sm font-medium text-gray-700 mb-1">
              Capacidade (pessoas) *
            </label>
            <input
              type="number"
              id="max_capacity"
              name="max_capacity"
              value={formData.max_capacity}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Base Price */}
          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 mb-1">
              Preço Base (R$) *
            </label>
            <input
              type="number"
              id="base_price"
              name="base_price"
              value={formData.base_price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Weekend and Holiday Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="weekend_price" className="block text-sm font-medium text-gray-700 mb-1">
                Preço Final de Semana (R$)
              </label>
              <input
                type="number"
                id="weekend_price"
                name="weekend_price"
                value={formData.weekend_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Sex, Sáb, Dom</p>
            </div>
            <div>
              <label htmlFor="holiday_price" className="block text-sm font-medium text-gray-700 mb-1">
                Preço Feriado (R$)
              </label>
              <input
                type="number"
                id="holiday_price"
                name="holiday_price"
                value={formData.holiday_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Feriados nacionais</p>
            </div>
          </div>

          {/* Auto Dirty Days */}
          <div>
            <label htmlFor="auto_dirty_days" className="block text-sm font-medium text-gray-700 mb-1">
              Dias para Sujeira Automática *
            </label>
            <input
              type="number"
              id="auto_dirty_days"
              name="auto_dirty_days"
              value={formData.auto_dirty_days}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número de dias antes da unidade ficar suja automaticamente
            </p>
          </div>

          {/* Default Check-in/out Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="default_check_in_time" className="block text-sm font-medium text-gray-700 mb-1">
                Horário Check-in Padrão *
              </label>
              <input
                type="time"
                id="default_check_in_time"
                name="default_check_in_time"
                value={formData.default_check_in_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="default_check_out_time" className="block text-sm font-medium text-gray-700 mb-1">
                Horário Check-out Padrão *
              </label>
              <input
                type="time"
                id="default_check_out_time"
                name="default_check_out_time"
                value={formData.default_check_out_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor do Calendário *
            </label>
            <ColorPicker
              value={formData.color_hex}
              onChange={(color) => setFormData(prev => ({ ...prev, color_hex: color }))}
            />
            <p className="text-xs text-gray-500 mt-2">Cor selecionada: {formData.color_hex}</p>
          </div>

          {/* Short Description */}
          <div>
            <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Curta
            </label>
            <textarea
              id="short_description"
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Breve descrição da unidade (suporta markdown)"
            />
          </div>

          {/* Long Description */}
          <div>
            <label htmlFor="long_description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Longa
            </label>
            <textarea
              id="long_description"
              name="long_description"
              value={formData.long_description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição detalhada da unidade (suporta markdown)"
            />
          </div>

          {/* Rules */}
          <div>
            <label htmlFor="rules" className="block text-sm font-medium text-gray-700 mb-1">
              Regras da Acomodação
            </label>
            <textarea
              id="rules"
              name="rules"
              value={formData.rules}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Regras e normas da unidade (suporta markdown)"
            />
          </div>

          {/* Album Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Álbum de Fotos
            </label>
            <div className="space-y-2">
              {/* Add new photo URL */}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="URL da foto"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newPhotoUrl.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        album_photos: [...prev.album_photos, newPhotoUrl.trim()]
                      }));
                      setNewPhotoUrl('');
                    }
                  }}
                  disabled={!newPhotoUrl.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* List of photos */}
              {formData.album_photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {formData.album_photos.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-20 object-cover rounded border bg-gray-100"
                        onError={(e) => {
                          e.target.classList.add('opacity-50');
                          e.target.alt = 'Erro ao carregar imagem';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            album_photos: prev.album_photos.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                {formData.album_photos.length} foto(s) adicionada(s)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
