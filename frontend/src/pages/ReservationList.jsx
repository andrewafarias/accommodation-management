import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImportExportButtons } from '../components/ui/ImportExportButtons';
import { ReservationTable } from '../components/reservations/ReservationTable';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { Calendar, Plus } from 'lucide-react';
import { parseISO, getMonth, getYear } from 'date-fns';
import api from '../services/api';

export function ReservationList() {
  const [reservations, setReservations] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [allAccommodations, setAllAccommodations] = useState([]); // Includes deleted units from reservations
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at' or 'check_in'
  
  // Filters
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAccommodation, setFilterAccommodation] = useState('ALL');

  // Fetch reservations and accommodations on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch reservations
      const reservationsRes = await api.get('reservations/');
      const reservationsData = reservationsRes.data.results || reservationsRes.data;
      setReservations(reservationsData);

      // Fetch accommodations for the modal
      const accommodationsRes = await api.get('accommodations/');
      const accommodationsData = accommodationsRes.data.results || accommodationsRes.data;
      setAccommodations(accommodationsData);
      
      // Build list of all accommodations including deleted ones (from reservation data)
      const accommodationMap = new Map();
      accommodationsData.forEach(acc => accommodationMap.set(acc.id, acc));
      reservationsData.forEach(res => {
        if (res.accommodation_unit && !accommodationMap.has(res.accommodation_unit.id)) {
          accommodationMap.set(res.accommodation_unit.id, {
            ...res.accommodation_unit,
            _deleted: true
          });
        }
      });
      setAllAccommodations(Array.from(accommodationMap.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get available years from reservations
  const availableYears = useMemo(() => {
    const years = new Set();
    reservations.forEach(res => {
      if (res.check_in) {
        years.add(getYear(parseISO(res.check_in)));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [reservations]);

  // Month options
  const monthOptions = [
    { value: 'ALL', label: 'Todos os Meses' },
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ];

  // Status options
  const statusOptions = [
    { value: 'ALL', label: 'Todos os Status' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'CONFIRMED', label: 'Confirmado' },
    { value: 'CHECKED_IN', label: 'Check-in Feito' },
    { value: 'CHECKED_OUT', label: 'Check-out Feito' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  // Handle opening modal for new reservation
  const handleNewReservation = () => {
    setEditingReservation(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setIsModalOpen(true);
  };

  // Handle saving reservation
  const handleSave = async (data, hasWarning = false) => {
    // Refresh the list after saving
    await fetchData();
    // Only close modal if there's no warning to show
    if (!hasWarning) {
      setIsModalOpen(false);
      setEditingReservation(null);
    }
  };

  // Handle delete from modal
  const handleDeleteFromModal = async () => {
    // Refresh the list after deleting
    await fetchData();
  };

  // Handle delete
  const handleDelete = async (reservation) => {
    if (!window.confirm(`Tem certeza que deseja excluir a reserva #${reservation.id}?`)) {
      return;
    }

    try {
      await api.delete(`reservations/${reservation.id}/`);
      // CRITICAL FIX: Refresh the list immediately after deletion
      await fetchData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      alert('Falha ao excluir reserva. Verifique se não há transações associadas.');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingReservation(null);
  };

  // Filter and sort reservations based on selected criteria
  const filteredAndSortedReservations = useMemo(() => {
    let filtered = [...reservations];
    
    // Filter by month
    if (filterMonth !== 'ALL') {
      filtered = filtered.filter(res => {
        if (!res.check_in) return false;
        return getMonth(parseISO(res.check_in)) === parseInt(filterMonth);
      });
    }
    
    // Filter by year
    if (filterYear !== 'ALL') {
      filtered = filtered.filter(res => {
        if (!res.check_in) return false;
        return getYear(parseISO(res.check_in)) === parseInt(filterYear);
      });
    }
    
    // Filter by status
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(res => res.status === filterStatus);
    }
    
    // Filter by accommodation (including deleted)
    if (filterAccommodation !== 'ALL') {
      filtered = filtered.filter(res => 
        res.accommodation_unit?.id === parseInt(filterAccommodation)
      );
    }
    
    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'check_in') {
        return new Date(a.check_in) - new Date(b.check_in);
      } else {
        // Sort by created_at (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [reservations, filterMonth, filterYear, filterStatus, filterAccommodation, sortBy]);

  // Handle export
  const handleExport = async (format) => {
    try {
      const response = await api.get(`reservations/export_data/?export_format=${format}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reservations.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting reservations:', error);
      alert('Erro ao exportar reservas.');
    }
  };

  // Handle import
  const handleImport = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('reservations/import_data/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const { imported, errors } = response.data;
      
      if (errors && errors.length > 0) {
        alert(`Importadas: ${imported} reservas.\nErros: ${errors.length} registros não puderam ser importados.`);
      } else {
        alert(`Importadas: ${imported} reservas com sucesso!`);
      }
      
      // Refresh the list
      await fetchData();
    } catch (error) {
      console.error('Error importing reservations:', error);
      alert('Erro ao importar reservas. Verifique o formato do arquivo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reservas</h1>
        <div className="flex flex-wrap gap-2">
          <ImportExportButtons 
            onExport={handleExport}
            onImport={handleImport}
          />
          <Button onClick={handleNewReservation} className="flex-1 sm:flex-initial" aria-label="Nova Reserva">
            <Plus className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Nova Reserva</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Todos os Anos</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Accommodation Filter (includes deleted ones) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acomodação</label>
              <select
                value={filterAccommodation}
                onChange={(e) => setFilterAccommodation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Todas as Acomodações</option>
                {allAccommodations.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc._deleted ? '(Deletada)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="created_at">Data de Criação</option>
                <option value="check_in">Data de Check-in</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservation List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Lista de Reservas ({filteredAndSortedReservations.length} de {reservations.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ReservationTable
            reservations={filteredAndSortedReservations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        reservation={editingReservation}
        units={accommodations}
        onSave={handleSave}
        onDelete={handleDeleteFromModal}
      />
    </div>
  );
}
