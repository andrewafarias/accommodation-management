import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ReservationTable } from '../components/reservations/ReservationTable';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { Calendar } from 'lucide-react';
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

  // Handle opening modal for editing
  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setIsModalOpen(true);
  };

  // Handle saving reservation
  const handleSave = async () => {
    // Refresh the list after saving
    await fetchData();
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
