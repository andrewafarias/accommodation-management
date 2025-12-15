import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';
import { differenceInDays, parseISO, addDays, isWeekend, isFriday, format } from 'date-fns';

// Brazilian National Holidays (fixed dates and Easter-based)
const getBrazilianHolidays = (year) => {
  const holidays = [
    // Fixed holidays
    { date: `${year}-01-01`, name: 'Ano Novo' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];
  
  // Calculate Easter-based holidays
  const easter = calculateEaster(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);
  
  // Carnival (47 days before Easter)
  const carnival = addDays(easterDate, -47);
  holidays.push({ date: format(carnival, 'yyyy-MM-dd'), name: 'Carnaval' });
  
  // Good Friday (2 days before Easter)
  const goodFriday = addDays(easterDate, -2);
  holidays.push({ date: format(goodFriday, 'yyyy-MM-dd'), name: 'Sexta-feira Santa' });
  
  // Corpus Christi (60 days after Easter)
  const corpusChristi = addDays(easterDate, 60);
  holidays.push({ date: format(corpusChristi, 'yyyy-MM-dd'), name: 'Corpus Christi' });
  
  return holidays;
};

// Calculate Easter using Computus algorithm
const calculateEaster = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
};

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
  onSave,
  onDelete
}) {
  const [formData, setFormData] = useState({
    client_name: '',
    check_in_date: '',
    check_in_time: '14:00',
    check_out_date: '',
    check_out_time: '12:00',
    accommodation_unit: '',
    guest_count_adults: 1,
    guest_count_children: 0,
    total_price: '',
    price_breakdown: [],
    amount_paid: 0,
    status: 'PENDING',
  });
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
  });
  const [newPayment, setNewPayment] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Use refs to track if we've already initialized the form
  const initializedRef = useRef(false);
  const prefilledDataRef = useRef(prefilledData);
  const modalContentRef = useRef(null);

  // Status options in Portuguese
  const statusOptions = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'CONFIRMED', label: 'Confirmado' },
    { value: 'CHECKED_IN', label: 'Check-in Feito' },
    { value: 'CHECKED_OUT', label: 'Check-out Feito' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  // Helper function to check if a date is a Brazilian holiday
  const isHoliday = useMemo(() => {
    const holidayMap = {};
    
    // Get unique years from check-in and check-out dates
    const years = new Set();
    if (formData.check_in_date) years.add(new Date(formData.check_in_date).getFullYear());
    if (formData.check_out_date) years.add(new Date(formData.check_out_date).getFullYear());
    
    // Build holiday map for all relevant years
    years.forEach(year => {
      getBrazilianHolidays(year).forEach(holiday => {
        holidayMap[holiday.date] = holiday.name;
      });
    });
    
    return (dateStr) => holidayMap[dateStr] || null;
  }, [formData.check_in_date, formData.check_out_date]);

  // Calculate suggested price based on dates and unit pricing
  const calculateSuggestedPrice = useMemo(() => {
    if (!formData.check_in_date || !formData.check_out_date || !formData.accommodation_unit) {
      return 0;
    }
    
    const selectedUnit = units.find(u => u.id === parseInt(formData.accommodation_unit));
    if (!selectedUnit) return 0;
    
    let total = 0;
    const checkIn = parseISO(formData.check_in_date);
    const checkOut = parseISO(formData.check_out_date);
    const nights = differenceInDays(checkOut, checkIn);
    
    // Calculate price for each night
    for (let i = 0; i < nights; i++) {
      const currentDate = addDays(checkIn, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const holidayName = isHoliday(dateStr);
      
      let priceForNight = 0;
      
      // Holiday price takes precedence
      if (holidayName && selectedUnit.holiday_price) {
        priceForNight = parseFloat(selectedUnit.holiday_price);
      }
      // Weekend price (Friday, Saturday, Sunday)
      else if ((isWeekend(currentDate) || isFriday(currentDate)) && selectedUnit.weekend_price) {
        priceForNight = parseFloat(selectedUnit.weekend_price);
      }
      // Default to base price
      else {
        priceForNight = parseFloat(selectedUnit.base_price || 0);
      }
      
      total += priceForNight;
    }
    
    return total;
  }, [formData.check_in_date, formData.check_out_date, formData.accommodation_unit, units, isHoliday]);

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
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      prefilledDataRef.current = prefilledData;
      
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
          guest_count_adults: reservation.guest_count_adults || 1,
          guest_count_children: reservation.guest_count_children || 0,
          total_price: reservation.total_price || '',
          price_breakdown: reservation.price_breakdown || [],
          amount_paid: reservation.amount_paid || 0,
          payment_history: reservation.payment_history || [],
          status: reservation.status || 'PENDING',
        });
        setClientSearchTerm(reservation.client?.full_name || '');
      } else {
        // Create mode with prefilled data
        setFormData({
          client_name: '',
          check_in_date: prefilledDataRef.current.check_in || '',
          check_in_time: '14:00',
          check_out_date: prefilledDataRef.current.check_out || '',
          check_out_time: '12:00',
          accommodation_unit: prefilledDataRef.current.unit_id || '',
          guest_count_adults: 1,
          guest_count_children: 0,
          total_price: '',
          price_breakdown: [],
          amount_paid: 0,
          payment_history: [],
          status: 'PENDING',
        });
        setClientSearchTerm('');
      }
      setError(null);
      setWarning(null);
      setNewPayment('');
    } else if (!isOpen) {
      // Reset when modal closes
      initializedRef.current = false;
    }
  }, [isOpen, reservation, prefilledData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If accommodation unit is changed, apply default check-in/out times
    if (name === 'accommodation_unit' && value) {
      const selectedUnit = units.find(u => u.id === parseInt(value));
      if (selectedUnit) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          // Only apply defaults if times haven't been modified by user
          check_in_time: selectedUnit.default_check_in_time?.substring(0, 5) || prev.check_in_time,
          check_out_time: selectedUnit.default_check_out_time?.substring(0, 5) || prev.check_out_time,
        }));
        return;
      }
    }
    
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
    } else {
      // Clear client_name if no match
      setFormData(prev => ({
        ...prev,
        client_name: ''
      }));
    }
  };

  const handleNewClientChange = (e) => {
    const { name, value } = e.target;
    setNewClientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addBreakdownItem = () => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: [...prev.price_breakdown, { name: '', value: '', quantity: 1 }]
    }));
  };

  const removeBreakdownItem = (index) => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: prev.price_breakdown.filter((_, i) => i !== index)
    }));
  };

  const updateBreakdownItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: prev.price_breakdown.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Calculate total considering quantity * unit value for each item
  const calculateBreakdownTotal = () => {
    return formData.price_breakdown.reduce((sum, item) => {
      const value = parseFloat(item.value) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return sum + (value * quantity);
    }, 0);
  };

  // Insert breakdown total into total price field
  const handleInsertBreakdownTotal = () => {
    const total = calculateBreakdownTotal();
    setFormData(prev => ({
      ...prev,
      total_price: total.toFixed(2)
    }));
  };

  // Add payment to pool
  const handleAddPayment = () => {
    const paymentAmount = parseFloat(newPayment);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return;
    }
    
    const newPaymentEntry = {
      date: new Date(newPaymentDate + 'T00:00:00').toISOString(),
      amount: paymentAmount,
      method: 'Pagamento' // Generic payment type
    };
    
    const newAmountPaid = (parseFloat(formData.amount_paid) || 0) + paymentAmount;
    
    // Auto-confirm when adding payment to pool (requirement: auto-set to CONFIRMED)
    const shouldAutoConfirm = formData.status === 'PENDING' && newAmountPaid > 0;
    
    setFormData(prev => ({
      ...prev,
      amount_paid: newAmountPaid,
      payment_history: [...(prev.payment_history || []), newPaymentEntry],
      status: shouldAutoConfirm ? 'CONFIRMED' : prev.status
    }));
    setNewPayment('');
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
  };

  // Calculate remaining amount
  const calculateRemainingAmount = () => {
    const total = parseFloat(formData.total_price) || 0;
    const paid = parseFloat(formData.amount_paid) || 0;
    return Math.max(0, total - paid);
  };

  // Calculate total nights from check-in to check-out dates
  const calculateTotalNights = useMemo(() => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;
    const checkIn = parseISO(formData.check_in_date);
    const checkOut = parseISO(formData.check_out_date);
    const nights = differenceInDays(checkOut, checkIn);
    return nights > 0 ? nights : 0;
  }, [formData.check_in_date, formData.check_out_date]);

  // Remove payment from pool with status reset logic
  const handleRemovePayment = (index) => {
    const paymentToRemove = formData.payment_history[index];
    if (!paymentToRemove) return;
    
    const newAmountPaid = Math.max(0, (parseFloat(formData.amount_paid) || 0) - parseFloat(paymentToRemove.amount));
    const newPaymentHistory = formData.payment_history.filter((_, i) => i !== index);
    
    // If amount_paid becomes 0 and status was auto-confirmed, revert to PENDING
    const shouldRevertToPending = newAmountPaid === 0 && formData.status === 'CONFIRMED';
    
    setFormData(prev => ({
      ...prev,
      amount_paid: newAmountPaid,
      payment_history: newPaymentHistory,
      status: shouldRevertToPending ? 'PENDING' : prev.status
    }));
  };

  const handleCreateClient = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('clients/', newClientData);
      const newClient = response.data;
      
      // Add to clients list
      setClients(prev => [...prev, newClient]);
      
      // Select the new client
      setClientSearchTerm(newClient.full_name);
      setFormData(prev => ({
        ...prev,
        client_name: newClient.id
      }));
      
      // Hide the new client form
      setShowNewClientForm(false);
      
      // Reset new client data
      setNewClientData({
        full_name: '',
        cpf: '',
        phone: '',
        email: '',
      });
    } catch (err) {
      console.error('Error creating client:', err);
      let errorMessage = 'Erro ao criar cliente.';
      
      if (err.response?.data) {
        const data = err.response.data;
        if (data.cpf) {
          errorMessage = `CPF: ${Array.isArray(data.cpf) ? data.cpf[0] : data.cpf}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reservation) return;
    
    if (!window.confirm(`Tem certeza que deseja excluir a reserva #${reservation.id}?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`reservations/${reservation.id}/`);
      
      // Call the onDelete callback
      if (onDelete) {
        await onDelete(reservation);
      }
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Error deleting reservation:', err);
      setError('Erro ao excluir reserva. Verifique se não há transações associadas.');
    } finally {
      setLoading(false);
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
        guest_count_adults: parseInt(formData.guest_count_adults, 10),
        guest_count_children: parseInt(formData.guest_count_children, 10),
        status: formData.status,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        payment_history: formData.payment_history || [],
      };
      
      // Add total_price if provided (convert to number)
      if (formData.total_price && formData.total_price !== '') {
        payload.total_price = parseFloat(formData.total_price);
      }

      // Add price_breakdown if items exist
      if (formData.price_breakdown && formData.price_breakdown.length > 0) {
        // Filter out empty items and convert values to numbers, include quantity
        payload.price_breakdown = formData.price_breakdown
          .filter(item => item.name && item.value)
          .map(item => ({
            name: item.name,
            value: parseFloat(item.value),
            quantity: parseFloat(item.quantity) || 1
          }));
      }

      let response;
      if (reservation) {
        // Update existing reservation
        response = await api.put(`reservations/${reservation.id}/`, payload);
      } else {
        // Create new reservation
        response = await api.post('reservations/', payload);
      }

      // Check for tight turnaround warning
      if (response.data.warning) {
        // Show warning as in-site panel - don't close modal yet
        setWarning(response.data.warning);
        // Still call onSave to refresh data but the modal stays open for user to see warning
        if (onSave) {
          await onSave(response.data, true); // Pass true to indicate warning present
        }
        return; // Don't close modal - let user see the warning
      }

      // No warning - Call the onSave callback with the new/updated reservation
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
      
      // Scroll to top when there's an error (especially for conflict errors)
      if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0;
      }
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
      <div 
        ref={modalContentRef}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
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
          
          {warning && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium mb-1">⚠️ Aviso</div>
                {warning}
              </div>
              <button
                type="button"
                onClick={() => setWarning(null)}
                className="ml-2 text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          )}

          {/* Client Name */}
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            
            {!showNewClientForm ? (
              <>
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
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(true)}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  + Criar novo cliente
                </button>
              </>
            ) : (
              <div className="space-y-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-xs font-medium text-gray-700">Novo Cliente</p>
                <input
                  type="text"
                  name="full_name"
                  value={newClientData.full_name}
                  onChange={handleNewClientChange}
                  placeholder="Nome completo *"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="cpf"
                  value={newClientData.cpf}
                  onChange={handleNewClientChange}
                  placeholder="CPF *"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  type="tel"
                  name="phone"
                  value={newClientData.phone}
                  onChange={handleNewClientChange}
                  placeholder="Telefone *"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={newClientData.email}
                  onChange={handleNewClientChange}
                  placeholder="Email (opcional)"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={loading || !newClientData.full_name || !newClientData.cpf || !newClientData.phone}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(false)}
                    className="flex-1 px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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

          {/* Total Nights Display */}
          {calculateTotalNights > 0 && (
            <div className="text-sm text-gray-500">
              Total de noites: <strong>{calculateTotalNights}</strong>
            </div>
          )}

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

          {/* Guest Count - Adults and Children */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="guest_count_adults" className="block text-sm font-medium text-gray-700 mb-1">
                Adultos *
              </label>
              <input
                type="number"
                id="guest_count_adults"
                name="guest_count_adults"
                value={formData.guest_count_adults}
                onChange={handleChange}
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="guest_count_children" className="block text-sm font-medium text-gray-700 mb-1">
                Crianças
              </label>
              <input
                type="number"
                id="guest_count_children"
                name="guest_count_children"
                value={formData.guest_count_children}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Price Breakdown Section */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Discriminação de Valores
              </label>
              <button
                type="button"
                onClick={addBreakdownItem}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                + Adicionar Item
              </button>
            </div>
            
            {formData.price_breakdown.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Nenhum item adicionado</p>
            ) : (
              <div className="space-y-2">
                {/* Header for breakdown fields */}
                <div className="flex gap-2 items-center text-xs text-gray-600 font-medium">
                  <span className="flex-1">Nome</span>
                  <span className="w-20 text-center">Qtd</span>
                  <span className="w-28 text-center">Valor Unit.</span>
                  <span className="w-24 text-center">Total</span>
                  <span className="w-4"></span>
                </div>
                {formData.price_breakdown.map((item, index) => {
                  const itemTotal = (parseFloat(item.value) || 0) * (parseFloat(item.quantity) || 1);
                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateBreakdownItem(index, 'name', e.target.value)}
                        placeholder="Nome (ex: Diária)"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => updateBreakdownItem(index, 'quantity', e.target.value)}
                        placeholder="Qtd"
                        min="1"
                        step="1"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateBreakdownItem(index, 'value', e.target.value)}
                        placeholder="Valor"
                        min="0"
                        step="0.01"
                        className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="w-24 text-sm text-gray-700 text-right">
                        R$ {itemTotal.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBreakdownItem(index)}
                        className="text-red-600 hover:text-red-800 text-xs w-4"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                
                {formData.price_breakdown.length > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 mt-2">
                    <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        R$ {calculateBreakdownTotal().toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={handleInsertBreakdownTotal}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                        title="Inserir no preço total"
                      >
                        Usar como Total
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
            {calculateSuggestedPrice > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Preço sugerido: R$ {calculateSuggestedPrice.toFixed(2)}
              </p>
            )}
          </div>

          {/* Payment Pool Section */}
          <div className="border border-gray-200 rounded-md p-3 bg-blue-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pagamentos
            </label>
            
            {/* Payment Status Summary */}
            <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
              <div className="bg-white rounded p-2 text-center">
                <div className="text-gray-500 text-xs">Total</div>
                <div className="font-bold">R$ {parseFloat(formData.total_price || 0).toFixed(2)}</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="text-gray-500 text-xs">Pago</div>
                <div className="font-bold text-green-600">R$ {parseFloat(formData.amount_paid || 0).toFixed(2)}</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="text-gray-500 text-xs">Restante</div>
                <div className="font-bold text-red-600">R$ {calculateRemainingAmount().toFixed(2)}</div>
              </div>
            </div>
            
            {/* Add Payment */}
            <div className="space-y-2 mb-3">
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                  placeholder="Valor do pagamento"
                  min="0"
                  step="0.01"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={newPaymentDate}
                  onChange={(e) => setNewPaymentDate(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPayment}
                disabled={!newPayment || parseFloat(newPayment) <= 0}
                className="w-full px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Adicionar Pagamento
              </button>
            </div>
            
            {/* Payment History */}
            {formData.payment_history && formData.payment_history.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-600 mb-1">Histórico de Pagamentos:</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {formData.payment_history.map((payment, index) => (
                    <div key={index} className="text-xs bg-white rounded px-2 py-1 flex justify-between items-center">
                      <span className="text-gray-500">
                        {new Date(payment.date).toLocaleDateString('pt-BR')} - {payment.method || 'Pagamento'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">
                          R$ {parseFloat(payment.amount).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remover pagamento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <div className="flex justify-between pt-4">
            {/* Delete button (only shown when editing) */}
            {reservation && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Excluir
              </Button>
            )}
            
            <div className={`flex space-x-3 ${reservation ? 'ml-auto' : 'ml-auto'}`}>
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
          </div>
        </form>
      </div>
    </div>
  );
}
