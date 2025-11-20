import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimelineCalendar } from '../components/calendar/TimelineCalendar';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { format, addDays, subDays } from 'date-fns';
import api from '../services/api';

export function Calendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [prefilledData, setPrefilledData] = useState({});

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch accommodations
      const accommodationsRes = await api.get('accommodations/');
      const accommodationsData = accommodationsRes.data.results || accommodationsRes.data;
      setAccommodations(accommodationsData);

      // Fetch reservations
      const reservationsRes = await api.get('reservations/');
      const reservationsData = reservationsRes.data.results || reservationsRes.data;
      setReservations(reservationsData);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious30Days = () => {
    setStartDate(prevDate => subDays(prevDate, 30));
  };

  const handleNext30Days = () => {
    setStartDate(prevDate => addDays(prevDate, 30));
  };

  const handleToday = () => {
    setStartDate(new Date());
  };

  const handleCellClick = (data) => {
    setSelectedReservation(null);
    setPrefilledData(data);
    setModalOpen(true);
  };

  const handleReservationClick = (reservation) => {
    setSelectedReservation(reservation);
    setPrefilledData({});
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedReservation(null);
    setPrefilledData({});
  };

  const handleReservationSave = async () => {
    // Refresh calendar data after saving
    await fetchCalendarData();
    // Close modal
    setModalOpen(false);
    setSelectedReservation(null);
    setPrefilledData({});
  };

  const handleReservationDelete = async () => {
    // Refresh calendar data after deleting
    await fetchCalendarData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">{error}</div>
            <div className="text-center mt-4">
              <Button onClick={fetchCalendarData}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        
        {/* Date Navigation Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePrevious30Days}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            
            <Button
              onClick={handleToday}
              variant="outline"
              size="sm"
            >
              Hoje
            </Button>
            
            <Button
              onClick={handleNext30Days}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
            Início: {format(startDate, 'dd/MM/yyyy')}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2" />
            Timeline View
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accommodations.length === 0 ? (
            <div className="flex items-center justify-center h-96 bg-gray-50">
              <div className="text-center">
                <CalendarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600">
                  No accommodation units found
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Add accommodation units to see them in the calendar
                </p>
              </div>
            </div>
          ) : (
            <TimelineCalendar
              units={accommodations}
              reservations={reservations}
              startDate={startDate}
              daysToShow={30}
              onCellClick={handleCellClick}
              onReservationClick={handleReservationClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        reservation={selectedReservation}
        units={accommodations}
        prefilledData={prefilledData}
        onSave={handleReservationSave}
        onDelete={handleReservationDelete}
      />
    </div>
  );
}
