import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Package, X } from 'lucide-react';
import { TimelineCalendar } from '../components/calendar/TimelineCalendar';
import { ReservationModal } from '../components/reservations/ReservationModal';
import { format, startOfMonth, addMonths, subMonths, differenceInDays, addYears, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';

export function Calendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  // Start date for the calendar (3 months before today) - fixed, doesn't change
  const startDate = useMemo(() => startOfMonth(subMonths(new Date(), 3)), []);
  // Currently visible month/year in the calendar header
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [prefilledData, setPrefilledData] = useState({});
  
  // Reference to the timeline scroll container
  const timelineScrollRef = useRef(null);
  
  // Price override modal state
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [customPrices, setCustomPrices] = useState({}); // { 'unitId-date': price }
  const [newPriceData, setNewPriceData] = useState({ price: '' });
  
  // Package modal state
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packages, setPackages] = useState([]); // { id, name, color, unitId, startDate, endDate }
  const [newPackageData, setNewPackageData] = useState({ name: '', color: '#FF5733' });
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  
  // Date range selection state
  const [dateSelection, setDateSelection] = useState({
    unitId: null,
    startDate: null,
    endDate: null,
    isSelecting: false
  });
  
  // Cell width constant (must match TimelineCalendar)
  const cellWidth = 120;

  useEffect(() => {
    fetchCalendarData();
  }, []);
  
  // Scroll to today's date when component mounts and data is loaded
  useEffect(() => {
    if (!loading && timelineScrollRef.current) {
      scrollToToday();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
    setVisibleDate(prevDate => subMonths(prevDate, 1));
  };

  // Navigate to start of next month (as per requirement)
  const handleNextMonth = () => {
    setVisibleDate(prevDate => addMonths(prevDate, 1));
  };
  
  // Scroll the timeline by a fixed amount
  const handleScrollLeft = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: -cellWidth * 7, behavior: 'smooth' });
    }
  };
  
  const handleScrollRight = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: cellWidth * 7, behavior: 'smooth' });
    }
  };
  
  // Handle navigation from bottom-right buttons
  const handleNavigate = (direction) => {
    if (direction === 'left') {
      handleScrollLeft();
    } else {
      handleScrollRight();
    }
  };
  
  // Calculate days from start date to today
  const getDaysToToday = useCallback(() => {
    const start = startOfDay(startDate);
    const today = startOfDay(new Date());
    return differenceInDays(today, start);
  }, [startDate]);
  
  // Scroll to today's date
  const scrollToToday = useCallback(() => {
    if (timelineScrollRef.current) {
      const daysToToday = getDaysToToday();
      const scrollPosition = daysToToday * cellWidth;
      // Center today in the viewport
      const containerWidth = timelineScrollRef.current.clientWidth;
      const centeredPosition = scrollPosition - (containerWidth / 2) + (cellWidth / 2);
      timelineScrollRef.current.scrollTo({ left: Math.max(0, centeredPosition), behavior: 'smooth' });
    }
  }, [getDaysToToday, cellWidth]);
  
  // Scroll to a specific date
  const scrollToDate = useCallback((dateStr) => {
    if (timelineScrollRef.current) {
      const targetDate = startOfDay(parseISO(dateStr));
      const start = startOfDay(startDate);
      const daysToTarget = differenceInDays(targetDate, start);
      const scrollPosition = daysToTarget * cellWidth;
      // Center the target date in the viewport
      const containerWidth = timelineScrollRef.current.clientWidth;
      const centeredPosition = scrollPosition - (containerWidth / 2) + (cellWidth / 2);
      timelineScrollRef.current.scrollTo({ left: Math.max(0, centeredPosition), behavior: 'smooth' });
    }
  }, [startDate, cellWidth]);

  const handleToday = () => {
    // Update visible date to today's month
    setVisibleDate(new Date());
    // Scroll to today
    scrollToToday();
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

  const handleReservationSave = async (data, hasWarning = false) => {
    // Refresh calendar data after saving
    await fetchCalendarData();
    // Close modal (warnings are now shown as browser alerts)
    setModalOpen(false);
    setSelectedReservation(null);
    setPrefilledData({});
    
    // Scroll to the reservation date
    if (data && data.check_in) {
      scrollToDate(data.check_in);
    }
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

  // Handle creating or applying a package for selected date range
  const handleCreatePackage = () => {
    if (!dateSelection.startDate || !dateSelection.endDate || !dateSelection.unitId) return;
    
    // If a recent package is selected, apply it to the new date range
    if (selectedPackageId) {
      const selectedPkg = packages.find(p => p.id === selectedPackageId);
      if (selectedPkg) {
        const newPackage = {
          id: Date.now(),
          name: selectedPkg.name,
          color: selectedPkg.color,
          unitId: dateSelection.unitId,
          startDate: dateSelection.startDate,
          endDate: dateSelection.endDate,
          createdAt: new Date().toISOString()
        };
        setPackages(prev => [...prev, newPackage]);
        setPackageModalOpen(false);
        setSelectedPackageId(null);
        setNewPackageData({ name: '', color: '#FF5733' });
        return;
      }
    }
    
    // Otherwise, create a new package
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
    setSelectedPackageId(null);
  };
  
  // Handle clearing packages from selected date range
  const handleClearPackages = () => {
    if (!dateSelection.startDate || !dateSelection.endDate || !dateSelection.unitId) return;
    
    // Remove all packages that overlap with the selected date range
    setPackages(prev => prev.filter(pkg => {
      // Keep packages that don't overlap with the selection
      if (pkg.unitId !== dateSelection.unitId) return true;
      
      // Check if package overlaps with selection
      const pkgStart = pkg.startDate;
      const pkgEnd = pkg.endDate;
      const selStart = dateSelection.startDate;
      const selEnd = dateSelection.endDate;
      
      // No overlap if package ends before selection starts or starts after selection ends
      if (pkgEnd < selStart || pkgStart > selEnd) return true;
      
      // There is overlap, so remove this package
      return false;
    }));
    
    setPackageModalOpen(false);
  };
  
  // Get the 5 most recent unique packages (by name)
  const getRecentPackages = () => {
    const uniquePackages = [];
    const seenNames = new Set();
    
    // Sort by createdAt descending, then take unique names
    const sorted = [...packages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    for (const pkg of sorted) {
      if (!seenNames.has(pkg.name) && uniquePackages.length < 5) {
        seenNames.add(pkg.name);
        uniquePackages.push(pkg);
      }
    }
    
    return uniquePackages;
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
            {format(visibleDate, 'MMMM yyyy', { locale: ptBR })}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-6 h-6 mr-2" />
              {(() => {
                const formatted = format(visibleDate, 'MMMM yyyy', { locale: ptBR });
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
              })()}
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
              scrollRef={timelineScrollRef}
              onVisibleDateChange={setVisibleDate}
              onNavigate={handleNavigate}
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
            onClick={() => {
              setPackageModalOpen(false);
              setSelectedPackageId(null);
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Criar Pacote</h2>
              <button
                onClick={() => {
                  setPackageModalOpen(false);
                  setSelectedPackageId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Selecione um pacote recente ou crie um novo para agrupar as datas selecionadas.
            </p>
            
            {/* Recent packages list */}
            {getRecentPackages().length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pacotes Recentes
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getRecentPackages().map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        setSelectedPackageId(pkg.id);
                        setNewPackageData({ name: '', color: '#FF5733' });
                      }}
                      className={`flex items-center p-2 rounded-md cursor-pointer border transition-colors ${
                        selectedPackageId === pkg.id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                        style={{ backgroundColor: pkg.color }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{pkg.name}</span>
                      {selectedPackageId === pkg.id && (
                        <span className="text-xs text-purple-600 font-medium">Selecionado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Divider if there are recent packages */}
            {getRecentPackages().length > 0 && (
              <div className="flex items-center mb-4">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-3 text-xs text-gray-500">ou crie um novo</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Pacote
              </label>
              <input
                type="text"
                value={newPackageData.name}
                onChange={(e) => {
                  setNewPackageData(prev => ({ ...prev, name: e.target.value }));
                  setSelectedPackageId(null); // Clear selection when typing new name
                }}
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
                  disabled={!!selectedPackageId}
                />
                <span className="text-sm text-gray-600">{selectedPackageId ? 'Usando cor do pacote selecionado' : newPackageData.color}</span>
              </div>
            </div>
            <div className="flex justify-between space-x-2">
              <Button
                onClick={handleClearPackages}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                Limpar Pacotes
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPackageModalOpen(false);
                    setSelectedPackageId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreatePackage}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!selectedPackageId && !newPackageData.name.trim()}
                >
                  {selectedPackageId ? 'Aplicar Pacote' : 'Criar Pacote'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
