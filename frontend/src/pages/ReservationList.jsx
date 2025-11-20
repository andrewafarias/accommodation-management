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

  // Handle delete
  const handleDelete = async (reservation) => {
    if (!window.confirm(`Tem certeza que deseja excluir a reserva #${reservation.id}?`)) {
      return;
    }

    try {
      await api.delete(`reservations/${reservation.id}/`);
      // Refresh the list
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
          <CardTitle className="flex items-center">
            <Calendar className="w-6 h-6 mr-2" />
            Lista de Reservas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationTable
            reservations={reservations}
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
      />
    </div>
  );
}
