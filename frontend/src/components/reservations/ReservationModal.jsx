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
    check_in_date: '',
    check_in_time: '14:00',
    check_out_date: '',
    check_out_time: '12:00',
    accommodation_unit: '',
    total_price: '',
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
        // Edit mode - parse existing datetime
        const checkInDate = reservation.check_in ? reservation.check_in.split('T')[0] : '';
        const checkInTime = reservation.check_in ? reservation.check_in.split('T')[1]?.substring(0, 5) || '14:00' : '14:00';
        const checkOutDate = reservation.check_out ? reservation.check_out.split('T')[0] : '';
        const checkOutTime = reservation.check_out ? reservation.check_out.split('T')[1]?.substring(0, 5) || '12:00' : '12:00';
        
        setFormData({
          client_name: reservation.client?.id || '',
          check_in_date: checkInDate,
          check_in_time: checkInTime,
          check_out_date: checkOutDate,
          check_out_time: checkOutTime,
          accommodation_unit: reservation.accommodation_unit?.id || '',
          total_price: reservation.total_price || '',
          status: reservation.status || 'PENDING',
        });
        setClientSearchTerm(reservation.client?.full_name || '');
      } else {
        // Create mode with prefilled data
        setFormData({
          client_name: '',
          check_in_date: prefilledData.check_in || '',
          check_in_time: '14:00',
          check_out_date: prefilledData.check_out || '',
          check_out_time: '12:00',
          accommodation_unit: prefilledData.unit_id || '',
          total_price: '',
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
      // Validate that a valid client is selected
      if (!formData.client_name || typeof formData.client_name !== 'number') {
        setError('Selecione um cliente da lista ou crie um novo antes de reservar.');
        setLoading(false);
        return;
      }

      // Combine date and time into ISO datetime format
      const checkIn = `${formData.check_in_date}T${formData.check_in_time}:00`;
      const checkOut = `${formData.check_out_date}T${formData.check_out_time}:00`;
      
      // Prepare data for API
      const payload = {
        client: formData.client_name,
        check_in: checkIn,
        check_out: checkOut,
        accommodation_unit: formData.accommodation_unit,
        status: formData.status,
      };
      
      // Add total_price if provided (convert to number)
      if (formData.total_price && formData.total_price !== '') {
        payload.total_price = parseFloat(formData.total_price);
      }

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
        await onSave(response.data);
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      
      // Extract specific error messages from the API response
      let errorMessage = 'Erro ao salvar reserva. Verifique os dados e tente novamente.';
      
      if (err.response?.status === 400) {
        const data = err.response.data;
        
        // Check for field-specific errors
        if (data.client) {
          errorMessage = Array.isArray(data.client) ? data.client[0] : data.client;
        } else if (data.check_in) {
          errorMessage = Array.isArray(data.check_in) ? data.check_in[0] : data.check_in;
        } else if (data.check_out) {
          errorMessage = Array.isArray(data.check_out) ? data.check_out[0] : data.check_out;
        } else if (data.accommodation_unit) {
          errorMessage = Array.isArray(data.accommodation_unit) ? data.accommodation_unit[0] : data.accommodation_unit;
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          // Try to display all error fields
          const errorFields = Object.keys(data).filter(key => data[key]);
          if (errorFields.length > 0) {
            const firstField = errorFields[0];
            const firstError = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
            errorMessage = `${firstField}: ${firstError}`;
          }
        }
      } else if (err.response?.status === 500) {
        errorMessage = 'Erro interno do servidor. Por favor, tente novamente mais tarde.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = `Erro: ${err.message}`;
      }
      
      setError(errorMessage);
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

          {/* Check-in Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">
                Data Check-in *
              </label>
              <input
                type="date"
                id="check_in_date"
                name="check_in_date"
                value={formData.check_in_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="check_in_time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora Check-in *
              </label>
              <input
                type="time"
                id="check_in_time"
                name="check_in_time"
                value={formData.check_in_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Check-out Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">
                Data Check-out *
              </label>
              <input
                type="date"
                id="check_out_date"
                name="check_out_date"
                value={formData.check_out_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="check_out_time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora Check-out *
              </label>
              <input
                type="time"
                id="check_out_time"
                name="check_out_time"
                value={formData.check_out_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          {/* Total Price */}
          <div>
            <label htmlFor="total_price" className="block text-sm font-medium text-gray-700 mb-1">
              Preço Total (R$)
            </label>
            <input
              type="number"
              id="total_price"
              name="total_price"
              value={formData.total_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Deixe em branco para calcular automaticamente</p>
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
