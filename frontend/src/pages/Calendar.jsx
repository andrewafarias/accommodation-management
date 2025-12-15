import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Package, X } from 'lucide-react';
import { TimelineCalendar } from '../components/calendar/TimelineCalendar';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { format, startOfMonth, addMonths, subMonths, differenceInDays, addYears, parseISO, eachDayOfInterval } from 'date-fns';
import api from '../services/api';

export function Calendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  // Start on current date (will be scrolled to in the calendar)
  const [startDate, setStartDate] = useState(() => startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [prefilledData, setPrefilledData] = useState({});
  
  // Price override modal state
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [customPrices, setCustomPrices] = useState({}); // { 'unitId-date': price }
  const [newPriceData, setNewPriceData] = useState({ price: '' });
  
  // Package modal state
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packages, setPackages] = useState([]); // { id, name, color, unitId, startDate, endDate }
  const [newPackageData, setNewPackageData] = useState({ name: '', color: '#FF5733' });
  
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
    // Center calendar on current month
    setStartDate(startOfMonth(new Date()));
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

  // Handle setting custom prices for selected date range
  const handleSetPrices = () => {
    if (!dateSelection.startDate || !dateSelection.endDate || !dateSelection.unitId) return;
    
    const price = parseFloat(newPriceData.price);
    if (isNaN(price) || price <= 0) return;
    
    const dates = eachDayOfInterval({
      start: parseISO(dateSelection.startDate),
      end: parseISO(dateSelection.endDate)
    });
    
    const newCustomPrices = { ...customPrices };
    dates.forEach(date => {
      const key = `${dateSelection.unitId}-${format(date, 'yyyy-MM-dd')}`;
      newCustomPrices[key] = price;
    });
    
    setCustomPrices(newCustomPrices);
    setPriceModalOpen(false);
    setNewPriceData({ price: '' });
  };

  // Handle creating a package for selected date range
  const handleCreatePackage = () => {
    if (!dateSelection.startDate || !dateSelection.endDate || !dateSelection.unitId) return;
    if (!newPackageData.name.trim()) return;
    
    // Create new package - newer packages override older ones in case of conflict
    const newPackage = {
      id: Date.now(),
      name: newPackageData.name,
      color: newPackageData.color,
      unitId: dateSelection.unitId,
      startDate: dateSelection.startDate,
      endDate: dateSelection.endDate,
      createdAt: new Date().toISOString()
    };
    
    setPackages(prev => [...prev, newPackage]);
    setPackageModalOpen(false);
    setNewPackageData({ name: '', color: '#FF5733' });
  };

  // Get package for a specific date and unit (newer packages take precedence)
  const getPackageForDate = (unitId, date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    
    // Filter packages for this unit and date, sorted by createdAt (newest first)
    const matchingPackages = packages
      .filter(pkg => 
        pkg.unitId === unitId && 
        dateStr >= pkg.startDate && 
        dateStr <= pkg.endDate
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return matchingPackages[0] || null;
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
                    onClick={() => setPriceModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Definir Preços
                  </Button>
                  <Button
                    onClick={() => setPackageModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Criar Pacote
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
              customPrices={customPrices}
              getPackageForDate={getPackageForDate}
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

      {/* Price Override Modal */}
      {priceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setPriceModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Definir Preço Manual</h2>
              <button
                onClick={() => setPriceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Defina um preço manual para as datas selecionadas. Este valor irá sobrepor os preços padrão.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço por noite (R$)
              </label>
              <input
                type="number"
                value={newPriceData.price}
                onChange={(e) => setNewPriceData({ price: e.target.value })}
                min="0"
                step="0.01"
                placeholder="Ex: 350.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setPriceModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSetPrices}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Aplicar Preço
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Package Creation Modal */}
      {packageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setPackageModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Criar Pacote</h2>
              <button
                onClick={() => setPackageModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Crie um pacote para agrupar as datas selecionadas. Pacotes mais recentes sobrepõem os antigos em caso de conflito.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Pacote
              </label>
              <input
                type="text"
                value={newPackageData.name}
                onChange={(e) => setNewPackageData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Natal 2025, Carnaval, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor do Pacote
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={newPackageData.color}
                  onChange={(e) => setNewPackageData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600">{newPackageData.color}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setPackageModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePackage}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Criar Pacote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
