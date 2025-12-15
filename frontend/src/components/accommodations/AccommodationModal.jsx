import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
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
    type: 'CHALET',
    max_capacity: 1,
    base_price: '',
    weekend_price: '',
    holiday_price: '',
    color_hex: '#4A90E2',
    auto_dirty_days: 3,
    default_check_in_time: '14:00',
    default_check_out_time: '12:00',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Type options
  const typeOptions = [
    { value: 'CHALET', label: 'Chalé' },
    { value: 'SUITE', label: 'Suíte' },
    { value: 'ROOM', label: 'Quarto' },
    { value: 'APARTMENT', label: 'Apartamento' },
  ];

  // Initialize form data when modal opens or accommodation changes
  useEffect(() => {
    if (isOpen) {
      if (accommodation) {
        // Edit mode
        setFormData({
          name: accommodation.name || '',
          type: accommodation.type || 'CHALET',
          max_capacity: accommodation.max_capacity || 1,
          base_price: accommodation.base_price || '',
          weekend_price: accommodation.weekend_price || '',
          holiday_price: accommodation.holiday_price || '',
          color_hex: accommodation.color_hex || '#4A90E2',
          auto_dirty_days: accommodation.auto_dirty_days || 3,
          default_check_in_time: accommodation.default_check_in_time || '14:00',
          default_check_out_time: accommodation.default_check_out_time || '12:00',
        });
      } else {
        // Create mode
        setFormData({
          name: '',
          type: 'CHALET',
          max_capacity: 1,
          base_price: '',
          weekend_price: '',
          holiday_price: '',
          color_hex: '#4A90E2',
          auto_dirty_days: 3,
          default_check_in_time: '14:00',
          default_check_out_time: '12:00',
        });
      }
      setError(null);
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
        type: formData.type,
        max_capacity: Number(formData.max_capacity),
        base_price: formData.base_price,
        weekend_price: formData.weekend_price || null,
        holiday_price: formData.holiday_price || null,
        color_hex: formData.color_hex,
        auto_dirty_days: Number(formData.auto_dirty_days),
        default_check_in_time: formData.default_check_in_time,
        default_check_out_time: formData.default_check_out_time,
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <label htmlFor="color_hex" className="block text-sm font-medium text-gray-700 mb-1">
              Cor do Calendário *
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                id="color_hex"
                name="color_hex"
                value={formData.color_hex}
                onChange={handleChange}
                required
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.color_hex}
                onChange={(e) => setFormData(prev => ({ ...prev, color_hex: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#4A90E2"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Código hexadecimal (ex: #4A90E2)</p>
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
