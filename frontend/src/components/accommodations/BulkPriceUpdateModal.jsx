import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';

/**
 * BulkPriceUpdateModal Component
 * 
 * Modal for bulk updating prices of multiple accommodation units.
 */
export function BulkPriceUpdateModal({ 
  isOpen, 
  onClose, 
  unitIds = [],
  onSave
}) {
  const [formData, setFormData] = useState({
    base_price: '',
    weekend_price: '',
    holiday_price: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build price_updates object with only filled fields
      const price_updates = {};
      if (formData.base_price) {
        price_updates.base_price = parseFloat(formData.base_price);
      }
      if (formData.weekend_price) {
        price_updates.weekend_price = parseFloat(formData.weekend_price);
      }
      if (formData.holiday_price) {
        price_updates.holiday_price = parseFloat(formData.holiday_price);
      }

      // Validate at least one price field is filled
      if (Object.keys(price_updates).length === 0) {
        setError('Preencha pelo menos um campo de preço.');
        setLoading(false);
        return;
      }

      // Call the API
      const response = await api.post('accommodations/bulk_update_prices/', {
        unit_ids: unitIds,
        price_updates
      });

      // Show success message
      alert(response.data.message || `${response.data.updated} unidade(s) atualizada(s) com sucesso!`);

      // Reset form
      setFormData({
        base_price: '',
        weekend_price: '',
        holiday_price: '',
      });

      // Call the onSave callback
      if (onSave) {
        await onSave();
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error updating prices:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message ||
        'Erro ao atualizar preços. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      base_price: '',
      weekend_price: '',
      holiday_price: '',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-6 h-6 mr-2" />
            Atualizar Preços em Lote
          </h2>
          <button
            onClick={handleClose}
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

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p>
              Você está atualizando <strong>{unitIds.length}</strong> unidade{unitIds.length !== 1 ? 's' : ''}.
            </p>
            <p className="mt-1 text-xs">
              Preencha apenas os preços que deseja atualizar. Os campos vazios não serão alterados.
            </p>
          </div>

          {/* Base Price */}
          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 mb-1">
              Preço Base (R$)
            </label>
            <input
              type="number"
              id="base_price"
              name="base_price"
              value={formData.base_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Deixe vazio para não alterar"
            />
          </div>

          {/* Weekend Price */}
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
              placeholder="Deixe vazio para não alterar"
            />
          </div>

          {/* Holiday Price */}
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
              placeholder="Deixe vazio para não alterar"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Atualizar Preços'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
