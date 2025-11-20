import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ReservationTable } from '../components/reservations/ReservationTable';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { Calendar, Plus } from 'lucide-react';
import api from '../services/api';

export function ReservationList() {
  const [reservations, setReservations] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at' or 'check_in'

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
  const handleSave = async () => {
    // Refresh the list after saving
    await fetchData();
    setIsModalOpen(false);
    setEditingReservation(null);
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

  // Sort reservations based on selected criteria
  const sortedReservations = [...reservations].sort((a, b) => {
    if (sortBy === 'check_in') {
      return new Date(a.check_in) - new Date(b.check_in);
    } else {
      // Sort by created_at (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
        <Button onClick={handleNewReservation}>
          <Plus className="w-5 h-5 mr-2" />
          Nova Reserva
        </Button>
      </div>

      {/* Reservation List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Lista de Reservas
            </CardTitle>
            
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-by" className="text-sm font-medium text-gray-700">
                Ordenar por:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Data de Criação</option>
                <option value="check_in">Data de Check-in</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReservationTable
            reservations={sortedReservations}
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
