import { useMemo, useCallback } from 'react';
import { format, addDays, startOfDay, isSameDay, parseISO, getYear, isFriday, isSaturday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

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
 * TimelineCalendar Component
 * 
 * A Gantt-style calendar view for accommodation reservations.
 * - Y-Axis: Lists accommodation units
 * - X-Axis: Displays dates horizontally
 * - Cells: Shows reservations as colored bars spanning check-in/out dates
 * - Holiday highlighting for Brazilian holidays
 */
export function TimelineCalendar({ 
  units = [], 
  reservations = [], 
  startDate = new Date(), 
  daysToShow = 30,
  onCellClick,
  onReservationClick,
  dateSelection = null,
  customPrices = {},
  getPackageForDate = () => null,
  scrollRef = null,
  onVisibleDateChange = null,
  onNavigate = null
}) {
  // Generate array of dates to display
  const dates = useMemo(() => {
    const start = startOfDay(startDate);
    return Array.from({ length: daysToShow }, (_, i) => addDays(start, i));
  }, [startDate, daysToShow]);

  // Get holidays for all years in the visible range
  const holidays = useMemo(() => {
    const years = [...new Set(dates.map(d => getYear(d)))];
    const allHolidays = {};
    years.forEach(year => {
      getBrazilianHolidays(year).forEach(holiday => {
        allHolidays[holiday.date] = holiday.name;
      });
    });
    return allHolidays;
  }, [dates]);

  // Check if a date is a holiday
  const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays[dateStr] || null;
  };

  // Check if a date is in the selection range
  const isDateInSelection = (date, unitId) => {
    if (!dateSelection || dateSelection.unitId !== unitId) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (dateSelection.startDate && dateSelection.endDate) {
      // Full selection - check if date is in range
      return dateStr >= dateSelection.startDate && dateStr <= dateSelection.endDate;
    } else if (dateSelection.startDate && dateSelection.isSelecting) {
      // Selection in progress - highlight start date
      return dateStr === dateSelection.startDate;
    }
    return false;
  };
  
  // Check if this is the start or end of selection
  const isSelectionEdge = (date, unitId) => {
    if (!dateSelection || dateSelection.unitId !== unitId) return null;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (dateStr === dateSelection.startDate) return 'start';
    if (dateStr === dateSelection.endDate) return 'end';
    return null;
  };

  // Calculate cell width for responsive design
  const cellWidth = 120; // pixels per day cell
  const sidebarWidth = 200; // pixels for the sidebar

  // Helper to get a light tint color from a hex color
  const getLightTint = (hexColor, opacity = 0.1) => {
    // Convert hex to RGB and return as rgba
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Helper function to get the appropriate price for a date (custom > holiday > weekend > base)
  const getPriceForDate = (date, unit) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const customPriceKey = `${unit.id}-${dateStr}`;
    
    // Custom price takes highest precedence
    if (customPrices[customPriceKey] !== undefined) {
      return { price: customPrices[customPriceKey], type: 'custom' };
    }
    
    const holidayName = isHoliday(date);
    
    // Holiday price takes precedence
    if (holidayName && unit.holiday_price) {
      return { price: parseFloat(unit.holiday_price), type: 'holiday' };
    }
    
    // Weekend price (Friday and Saturday only - Sunday is NOT considered weekend per requirement)
    if ((isFriday(date) || isSaturday(date)) && unit.weekend_price) {
      return { price: parseFloat(unit.weekend_price), type: 'weekend' };
    }
    
    // Default to base price
    return { price: parseFloat(unit.base_price), type: 'base' };
  };

  // Helper function to get status-based styling
  const getStatusColor = (status) => {
    const colors = {
      CONFIRMED: 'bg-green-500 border-green-600',
      PENDING: 'bg-yellow-400 border-yellow-500',
      CHECKED_IN: 'bg-blue-500 border-blue-600',
      CHECKED_OUT: 'bg-gray-400 border-gray-500',
      CANCELLED: 'bg-red-400 border-red-500',
    };
    return colors[status] || 'bg-gray-300 border-gray-400';
  };

  // Helper function to calculate reservation bar position and width
  const calculateReservationBar = (reservation, dates) => {
    const checkIn = startOfDay(parseISO(reservation.check_in));
    const checkOut = startOfDay(parseISO(reservation.check_out));
    
    const firstVisibleDate = dates[0];
    const lastVisibleDate = dates[dates.length - 1];
    
    // Check if reservation overlaps with visible range
    if (checkOut <= firstVisibleDate || checkIn > lastVisibleDate) {
      return null; // Reservation is completely outside visible range
    }
    
    // Calculate total days of reservation
    const totalDays = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Determine visible start position
    let visibleStartIndex = 0;
    if (checkIn >= firstVisibleDate) {
      // Reservation starts within visible range
      visibleStartIndex = dates.findIndex(date => isSameDay(date, checkIn));
    }
    // If checkIn < firstVisibleDate, visibleStartIndex stays 0 (starts before visible range)
    
    // Determine visible end position
    let visibleEndIndex = dates.length;
    if (checkOut <= lastVisibleDate) {
      // Reservation ends within visible range
      const endIdx = dates.findIndex(date => date >= checkOut);
      if (endIdx !== -1) visibleEndIndex = endIdx;
    }
    // If checkOut > lastVisibleDate, visibleEndIndex stays at dates.length (extends beyond visible range)
    
    const visibleDays = visibleEndIndex - visibleStartIndex;
    
    if (visibleDays <= 0) return null;
    
    return {
      left: visibleStartIndex * cellWidth,
      width: visibleDays * cellWidth - 4, // -4 for padding
      totalDays,
      visibleDays,
    };
  };

  // Group reservations by accommodation unit
  const reservationsByUnit = useMemo(() => {
    const grouped = {};
    units.forEach(unit => {
      grouped[unit.id] = reservations.filter(
        res => res.accommodation_unit.id === unit.id && res.status !== 'CANCELLED'
      );
    });
    return grouped;
  }, [units, reservations]);
  
  // Handle scroll to update visible date
  const handleScroll = useCallback((e) => {
    if (onVisibleDateChange && dates.length > 0) {
      const scrollLeft = e.target.scrollLeft;
      const visibleDateIndex = Math.floor(scrollLeft / cellWidth);
      const centeredIndex = Math.min(visibleDateIndex + Math.floor(e.target.clientWidth / cellWidth / 2), dates.length - 1);
      if (centeredIndex >= 0 && centeredIndex < dates.length) {
        onVisibleDateChange(dates[centeredIndex]);
      }
    }
  }, [onVisibleDateChange, dates, cellWidth]);

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="flex">
        {/* Fixed Sidebar - Unit Names */}
        <div 
          className="flex-shrink-0 border-r bg-gray-50" 
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Header */}
          <div className="h-12 border-b bg-gray-100 flex items-center px-4 font-semibold text-gray-700">
            Accommodation Units
          </div>
          
          {/* Unit List */}
          {units.map(unit => (
            <div
              key={unit.id}
              className="h-20 border-b flex items-center px-4 space-x-3"
            >
              {/* Color Indicator */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-gray-300"
                style={{ backgroundColor: unit.color_hex }}
                title={`Cor: ${unit.color_hex}`}
              />
              
              {/* Unit Details */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {unit.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {unit.type} • {unit.max_capacity} hóspedes
                </div>
                <div className="text-xs">
                  <span 
                    className={cn(
                      'inline-block px-1.5 py-0.5 rounded text-white text-[10px]',
                      unit.status === 'CLEAN' ? 'bg-green-600' : 'bg-orange-600'
                    )}
                    title={unit.status === 'CLEAN' ? 'Limpo' : 'Sujo'}
                  >
                    {unit.status === 'CLEAN' ? 'Limpo' : 'Sujo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Area */}
        <div 
          className="flex-1 overflow-x-auto"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <div style={{ minWidth: `${dates.length * cellWidth}px` }}>
            {/* Date Header */}
            <div className="h-12 border-b bg-gray-100 flex">
              {dates.map((date, index) => {
                const holidayName = isHoliday(date);
                return (
                  <div
                    key={index}
                    className={cn(
                      'border-r flex flex-col items-center justify-center text-xs',
                      isSameDay(date, new Date()) && 'bg-blue-50 border-blue-300'
                    )}
                    style={{ width: `${cellWidth}px` }}
                    title={holidayName || undefined}
                  >
                    <div className={cn(
                      'font-semibold text-gray-700',
                      holidayName && 'text-red-700'
                    )}>
                      {format(date, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={cn(
                      'text-gray-600',
                      isSameDay(date, new Date()) && 'text-blue-600 font-bold',
                      holidayName && 'text-red-600 font-bold'
                    )}>
                      {format(date, 'dd/MM/yy')}
                    </div>
                    {holidayName && (
                      <div className="text-[8px] text-red-600 truncate max-w-full px-1">
                        {holidayName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid Rows - One per Unit */}
            {units.map(unit => (
              <div key={unit.id} className="relative h-20 border-b">
                {/* Grid Cells */}
                <div className="absolute inset-0 flex">
                  {dates.map((date, index) => {
                    // Unit color is only shown on hover now
                    const hoverBgColor = getLightTint(unit.color_hex || '#4A90E2', 0.25);
                    return (
                      <div
                        key={index}
                        className={cn(
                          'border-r cursor-pointer transition-colors relative group',
                          isSameDay(date, new Date()) && 'ring-2 ring-inset ring-blue-400',
                          isDateInSelection(date, unit.id) && 'ring-2 ring-inset ring-green-500 bg-green-100',
                          isSelectionEdge(date, unit.id) === 'start' && 'ring-2 ring-green-600',
                          isSelectionEdge(date, unit.id) === 'end' && 'ring-2 ring-green-600'
                        )}
                        style={{ 
                          width: `${cellWidth}px`,
                          backgroundColor: isDateInSelection(date, unit.id) 
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'transparent',
                          '--hover-bg': hoverBgColor
                        }}
                        onMouseEnter={(e) => {
                          if (!isDateInSelection(date, unit.id)) {
                            e.currentTarget.style.backgroundColor = hoverBgColor;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDateInSelection(date, unit.id)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={() => onCellClick && onCellClick({
                          unit_id: unit.id,
                          check_in: format(date, 'yyyy-MM-dd'),
                        })}
                      >
                        {/* Package Indicator */}
                        {(() => {
                          const pkg = getPackageForDate(unit.id, date);
                          if (pkg) {
                            return (
                              <div 
                                className="absolute top-0 left-0 right-0 h-1.5"
                                style={{ backgroundColor: pkg.color }}
                                title={pkg.name}
                              />
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Price Display - shows custom/holiday/weekend/base price accordingly */}
                        {(() => {
                          const priceInfo = getPriceForDate(date, unit);
                          return (
                            <div className={cn(
                              "absolute bottom-1 left-1 text-[10px] group-hover:font-semibold transition-all",
                              priceInfo.type === 'custom' && 'text-purple-600 font-bold',
                              priceInfo.type === 'holiday' && 'text-orange-500 font-medium',
                              priceInfo.type === 'weekend' && 'text-orange-500 font-medium',
                              priceInfo.type === 'base' && 'text-gray-400 group-hover:text-gray-600'
                            )}>
                              R$ {priceInfo.price.toFixed(0)}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* Reservation Bars */}
                {reservationsByUnit[unit.id]?.map(reservation => {
                  const barConfig = calculateReservationBar(reservation, dates);
                  if (!barConfig) return null;

                  return (
                    <div
                      key={reservation.id}
                      className={cn(
                        'absolute top-2 h-16 rounded border-2 shadow-sm',
                        'flex items-center px-2 overflow-hidden cursor-pointer',
                        'transition-all hover:shadow-md hover:z-10',
                        getStatusColor(reservation.status)
                      )}
                      style={{
                        left: `${barConfig.left}px`,
                        width: `${barConfig.width}px`,
                      }}
                      title={`${reservation.client.full_name} - ${format(parseISO(reservation.check_in), 'dd/MM/yyyy')} até ${format(parseISO(reservation.check_out), 'dd/MM/yyyy')}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReservationClick && onReservationClick(reservation);
                      }}
                    >
                      <div className="text-white font-medium text-sm truncate">
                        {reservation.client.full_name}
                      </div>
                      {barConfig.visibleDays >= 3 && (
                        <div className="ml-auto text-white text-xs font-semibold">
                          {barConfig.totalDays}d
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-xs">
        {/* Status Legend - Left Side */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 border-2 border-green-600 rounded"></div>
            <span className="text-gray-700">Confirmado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-500 rounded"></div>
            <span className="text-gray-700">Pendente</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded"></div>
            <span className="text-gray-700">Check-in Feito</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 border-2 border-gray-500 rounded"></div>
            <span className="text-gray-700">Check-out Feito</span>
          </div>
        </div>
        
        {/* Navigation Controls - Right Side */}
        {onNavigate && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('left')}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Rolar para esquerda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span className="text-gray-600 font-medium">Navegar</span>
            <button
              onClick={() => onNavigate('right')}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Rolar para direita"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
