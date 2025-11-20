import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';

/**
 * ReservationModal Component
 * 
 * Modal dialog for creating or editing reservations.
 * Localized for Brazilian Portuguese (PT-BR).
 */
export function ReservationModal({ 
  isOpen, 
  onClose, 
  reservation = null, 
  units = [],
  prefilledData = {},
  onSave 
}) {
  const [formData, setFormData] = useState({
    client_name: '',
    check_in: '',
    check_out: '',
    accommodation_unit: '',
    status: 'PENDING',
  });
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Status options in Portuguese
  const statusOptions = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'CONFIRMED', label: 'Confirmado' },
    { value: 'CHECKED_IN', label: 'Check-in Feito' },
    { value: 'CHECKED_OUT', label: 'Check-out Feito' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  // Load clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get('clients/');
        const clientsData = response.data.results || response.data;
        setClients(clientsData);
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  // Initialize form data when modal opens or reservation changes
  useEffect(() => {
    if (isOpen) {
      if (reservation) {
        // Edit mode
        setFormData({
          client_name: reservation.client?.id || '',
          check_in: reservation.check_in || '',
          check_out: reservation.check_out || '',
          accommodation_unit: reservation.accommodation_unit?.id || '',
          status: reservation.status || 'PENDING',
        });
        setClientSearchTerm(reservation.client?.full_name || '');
      } else {
        // Create mode with prefilled data
        setFormData({
          client_name: '',
          check_in: prefilledData.check_in || '',
          check_out: prefilledData.check_out || '',
          accommodation_unit: prefilledData.unit_id || '',
          status: 'PENDING',
        });
        setClientSearchTerm('');
      }
      setError(null);
    }
  }, [isOpen, reservation, prefilledData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClientSearch = (e) => {
    const value = e.target.value;
    setClientSearchTerm(value);
    
    // If a client is selected from the list, update form data
    const selectedClient = clients.find(c => c.full_name === value);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_name: selectedClient.id
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare data for API
      const payload = {
        client: formData.client_name,
        check_in: formData.check_in,
        check_out: formData.check_out,
        accommodation_unit: formData.accommodation_unit,
        status: formData.status,
      };

      let response;
      if (reservation) {
        // Update existing reservation
        response = await api.put(`reservations/${reservation.id}/`, payload);
      } else {
        // Create new reservation
        response = await api.post('reservations/', payload);
      }

      // Call the onSave callback with the new/updated reservation
      if (onSave) {
        onSave(response.data);
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error saving reservation:', err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message ||
        'Erro ao salvar reserva. Verifique os dados e tente novamente.'
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
            {reservation ? 'Editar Reserva' : 'Nova Reserva'}
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

          {/* Client Name */}
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              list="clients-list"
              value={clientSearchTerm}
              onChange={handleClientSearch}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o nome do cliente"
            />
            <datalist id="clients-list">
              {clients.map(client => (
                <option key={client.id} value={client.full_name}>
                  {client.cpf} - {client.phone}
                </option>
              ))}
            </datalist>
          </div>

          {/* Check-in Date */}
          <div>
            <label htmlFor="check_in" className="block text-sm font-medium text-gray-700 mb-1">
              Check-in *
            </label>
            <input
              type="date"
              id="check_in"
              name="check_in"
              value={formData.check_in}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Check-out Date */}
          <div>
            <label htmlFor="check_out" className="block text-sm font-medium text-gray-700 mb-1">
              Check-out *
            </label>
            <input
              type="date"
              id="check_out"
              name="check_out"
              value={formData.check_out}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Accommodation Unit */}
          <div>
            <label htmlFor="accommodation_unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unidade *
            </label>
            <select
              id="accommodation_unit"
              name="accommodation_unit"
              value={formData.accommodation_unit}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma unidade</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} - {unit.type} ({unit.max_capacity} pessoas)
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
