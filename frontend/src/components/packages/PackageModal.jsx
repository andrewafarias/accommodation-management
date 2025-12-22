import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';

/**
 * PackageModal Component
 * 
 * Modal dialog for creating or editing accommodation packages.
 */
export function PackageModal({ 
  isOpen, 
  onClose, 
  package: packageData = null,
  onSave,
  preselectedUnits = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    accommodation_unit_ids: [],
    package_price: '',
    is_active: true,
  });
  
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingAccommodations, setLoadingAccommodations] = useState(true);

  // Fetch all accommodations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAccommodations();
    }
  }, [isOpen]);

  // Initialize form data when modal opens or package changes
  useEffect(() => {
    if (isOpen) {
      if (packageData) {
        // Edit mode
        setFormData({
          name: packageData.name || '',
          description: packageData.description || '',
          accommodation_unit_ids: packageData.accommodation_units?.map(u => u.id) || [],
          package_price: packageData.package_price || '',
          is_active: packageData.is_active !== undefined ? packageData.is_active : true,
        });
      } else {
        // Create mode
        setFormData({
          name: '',
          description: '',
          accommodation_unit_ids: preselectedUnits,
          package_price: '',
          is_active: true,
        });
      }
      setError(null);
    }
  }, [isOpen, packageData, preselectedUnits]);

  const fetchAccommodations = async () => {
    try {
      setLoadingAccommodations(true);
      const response = await api.get('accommodations/');
      const accommodationsData = response.data.results || response.data;
      setAccommodations(accommodationsData);
    } catch (err) {
      console.error('Error fetching accommodations:', err);
    } finally {
      setLoadingAccommodations(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUnitToggle = (unitId) => {
    setFormData(prev => {
      const units = prev.accommodation_unit_ids || [];
      const isSelected = units.includes(unitId);
      
      return {
        ...prev,
        accommodation_unit_ids: isSelected
          ? units.filter(id => id !== unitId)
          : [...units, unitId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate at least one unit selected
      if (!formData.accommodation_unit_ids || formData.accommodation_unit_ids.length === 0) {
        setError('Selecione pelo menos uma unidade de acomodação.');
        setLoading(false);
        return;
      }

      // Prepare data for API
      const payload = {
        name: formData.name,
        description: formData.description,
        accommodation_unit_ids: formData.accommodation_unit_ids,
        package_price: formData.package_price,
        is_active: formData.is_active,
      };

      let response;
      if (packageData) {
        // Update existing package
        response = await api.put(`packages/${packageData.id}/`, payload);
      } else {
        // Create new package
        response = await api.post('packages/', payload);
      }

      // Call the onSave callback
      if (onSave) {
        await onSave(response.data);
      }
    } catch (err) {
      console.error('Error saving package:', err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.accommodation_unit_ids?.[0] ||
        'Erro ao salvar pacote. Verifique os dados e tente novamente.'
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
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {packageData ? 'Editar Pacote' : 'Novo Pacote'}
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
              Nome do Pacote *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Pacote Família"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição detalhada do pacote"
            />
          </div>

          {/* Package Price */}
          <div>
            <label htmlFor="package_price" className="block text-sm font-medium text-gray-700 mb-1">
              Preço do Pacote (R$) *
            </label>
            <input
              type="number"
              id="package_price"
              name="package_price"
              value={formData.package_price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Pacote ativo
            </label>
          </div>

          {/* Accommodation Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidades de Acomodação *
            </label>
            {loadingAccommodations ? (
              <div className="text-sm text-gray-500">Carregando unidades...</div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                {accommodations.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhuma unidade disponível</div>
                ) : (
                  accommodations.map((unit) => (
                    <div key={unit.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`unit-${unit.id}`}
                        checked={formData.accommodation_unit_ids?.includes(unit.id) || false}
                        onChange={() => handleUnitToggle(unit.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`unit-${unit.id}`} className="ml-2 text-sm text-gray-700 flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: unit.color_hex }}
                        />
                        {unit.name} - Capacidade: {unit.max_capacity}
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Selecionadas: {formData.accommodation_unit_ids?.length || 0} unidade(s)
            </p>
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
              disabled={loading || loadingAccommodations}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
