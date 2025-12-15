import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimelineCalendar } from '../components/calendar/TimelineCalendar';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { format, startOfMonth, addMonths, subMonths, differenceInDays, addYears } from 'date-fns';
import api from '../services/api';

export function Calendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  // Start 3 months before today (as per requirement: 3 months back, 2 years forward)
  const [startDate, setStartDate] = useState(() => startOfMonth(subMonths(new Date(), 3)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [prefilledData, setPrefilledData] = useState({});
  
  // Date range selection state
  const [dateSelection, setDateSelection] = useState({
    unitId: null,
    startDate: null,
    endDate: null,
    isSelecting: false
  });

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

  // Navigate to start of previous month (as per requirement)
  const handlePreviousMonth = () => {
    setStartDate(prevDate => startOfMonth(subMonths(prevDate, 1)));
  };

  // Navigate to start of next month (as per requirement)
  const handleNextMonth = () => {
    setStartDate(prevDate => startOfMonth(addMonths(prevDate, 1)));
  };

  const handleToday = () => {
    // Start 3 months before today (as per requirement: 3 months back, 2 years forward)
    setStartDate(startOfMonth(subMonths(new Date(), 3)));
  };
  
  // Calculate days to show: from 3 months back to 2 years forward
  const calculateDaysToShow = () => {
    const threeMonthsAgo = startOfMonth(subMonths(new Date(), 3));
    const twoYearsLater = addYears(new Date(), 2);
    return differenceInDays(twoYearsLater, threeMonthsAgo);
  };

  // Handle cell click for date range selection
  const handleCellClick = (data) => {
    const clickedDate = data.check_in;
    const unitId = data.unit_id;
    
    if (!dateSelection.isSelecting || dateSelection.unitId !== unitId) {
      // First click - start selection
      setDateSelection({
        unitId: unitId,
        startDate: clickedDate,
        endDate: null,
        isSelecting: true
      });
    } else {
      // Second click - complete selection
      const start = dateSelection.startDate;
      const end = clickedDate;
      
      // Ensure start is before end
      const [finalStart, finalEnd] = start <= end ? [start, end] : [end, start];
      
      setDateSelection({
        unitId: unitId,
        startDate: finalStart,
        endDate: finalEnd,
        isSelecting: false
      });
    }
  };
  
  // Create reservation from selected date range
  const handleCreateReservationFromSelection = () => {
    if (dateSelection.startDate && dateSelection.endDate && dateSelection.unitId) {
      setSelectedReservation(null);
      setPrefilledData({
        unit_id: dateSelection.unitId,
        check_in: dateSelection.startDate,
        check_out: dateSelection.endDate
      });
      setModalOpen(true);
    }
  };
  
  // Clear date selection
  const handleClearSelection = () => {
    setDateSelection({
      unitId: null,
      startDate: null,
      endDate: null,
      isSelecting: false
    });
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
    handleClearSelection();
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
              onClick={handlePreviousMonth}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
              Mês Anterior
            </Button>
            
            <Button
              onClick={handleToday}
              variant="outline"
              size="sm"
            >
              Hoje
            </Button>
            
            <Button
              onClick={handleNextMonth}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              Próximo Mês
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-6 h-6 mr-2" />
              Timeline View
            </CardTitle>
            
            {/* Selection Actions */}
            <div className="flex items-center space-x-2">
              {dateSelection.startDate && dateSelection.endDate ? (
                <>
                  <span className="text-sm text-gray-600">
                    Selecionado: {format(new Date(dateSelection.startDate), 'dd/MM/yyyy')} - {format(new Date(dateSelection.endDate), 'dd/MM/yyyy')}
                  </span>
                  <Button
                    onClick={handleCreateReservationFromSelection}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Criar Reserva
                  </Button>
                  <Button
                    onClick={handleClearSelection}
                    variant="outline"
                    size="sm"
                  >
                    Limpar
                  </Button>
                </>
              ) : dateSelection.isSelecting ? (
                <span className="text-sm text-blue-600 font-medium">
                  Selecione a data final...
                </span>
              ) : (
                <span className="text-sm text-gray-500">
                  Clique em uma data para selecionar
                </span>
              )}
            </div>
          </div>
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
              daysToShow={calculateDaysToShow()}
              onCellClick={handleCellClick}
              onReservationClick={handleReservationClick}
              dateSelection={dateSelection}
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
