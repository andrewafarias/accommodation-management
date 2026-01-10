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
  onNavigate = null,
  focusedUnitId = null,
  onUnitFocus = null,
  desktopCellWidth = 120,
  mobileCellWidth = 80,
  sidebarWidth = 200,
  mobileSidebarWidth = 70,
  isMobileView = null
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

  // Check if a date is in any selection range
  const isDateInSelection = (date, unitId) => {
    if (!dateSelection || !dateSelection.selections) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if date is in any completed selection
    const inCompletedSelection = dateSelection.selections.some(selection => 
      selection.unitId === unitId && 
      dateStr >= selection.startDate && 
      dateStr <= selection.endDate
    );
    
    if (inCompletedSelection) return true;
    
    // Check if date is in current selection being made
    if (dateSelection.isSelecting && 
        dateSelection.currentUnitId === unitId && 
        dateSelection.currentStartDate) {
      return dateStr === dateSelection.currentStartDate;
    }
    
    return false;
  };
  
  // Check if this is the start or end of any selection
  const isSelectionEdge = (date, unitId) => {
    if (!dateSelection || !dateSelection.selections) return null;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    for (const selection of dateSelection.selections) {
      if (selection.unitId === unitId) {
        if (dateStr === selection.startDate) return 'start';
        if (dateStr === selection.endDate) return 'end';
      }
    }
    
    // Check current selection
    if (dateSelection.isSelecting && 
        dateSelection.currentUnitId === unitId && 
        dateSelection.currentStartDate === dateStr) {
      return 'start';
    }
    
    return null;
  };

  // Calculate cell width for responsive design (shared by bars and grid)
  const isMobile = typeof isMobileView === 'boolean'
    ? isMobileView
    : (typeof window !== 'undefined' && window.innerWidth < 768);
  const responsiveCellWidth = isMobile ? mobileCellWidth : desktopCellWidth;
  const responsiveSidebarWidth = isMobile ? mobileSidebarWidth : sidebarWidth;
  const responsiveUnitRowHeight = 'h-20';
  const responsiveHeaderHeight = isMobile ? 'h-10' : 'h-12';

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
      CONFIRMED: 'bg-accent-500 border-accent-600',
      PENDING: 'bg-yellow-400 border-yellow-500',
      CHECKED_IN: 'bg-primary-500 border-primary-600',
      CHECKED_OUT: 'bg-gray-400 border-gray-500',
      CANCELLED: 'bg-red-400 border-red-500',
    };
    return colors[status] || 'bg-gray-300 border-gray-400';
  };

  // Helper to format times as HH:mm
  const formatTimeHM = (isoString) => {
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch (e) {
      return '';
    }
  };

  // Helper function to calculate reservation bar position and width
  // Rule: Bar starts at 30% into check-in cell (70% on right) and ends at 20% into check-out cell
  const calculateReservationBar = (reservation, dates, dayWidth) => {
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
    
    // Find check-in and check-out indices
    let checkInIndex = dates.findIndex(date => isSameDay(date, checkIn));
    let checkOutIndex = dates.findIndex(date => isSameDay(date, checkOut));
    
    // Handle cases where dates are outside visible range
    const checkInBeforeVisible = checkIn < firstVisibleDate;
    const checkOutAfterVisible = checkOut > lastVisibleDate;
    
    if (checkInBeforeVisible) {
      checkInIndex = 0;
    }
    if (checkOutAfterVisible) {
      checkOutIndex = dates.length - 1;
    }
    
    // Special handling for same-day check-in and check-out
    const isSameDayCheckInOut = totalDays === 0;
    
    if (isSameDayCheckInOut) {
      if (checkInIndex === -1) return null;
      
      return {
        left: checkInIndex * dayWidth + dayWidth * 0.3, // Offset 30% from left
        width: dayWidth * 0.7 - 4, // 70% width (the check-in portion only)
        totalDays: 0,
        isSameDayCheckInOut: true,
      };
    }
    
    if (checkInIndex === -1 && checkOutIndex === -1) return null;
    
    // Calculate bar position and width as a single continuous bar
    // Start: 30% into the check-in cell (so 70% on right side)
    // End: 20% into the check-out cell
    const startLeft = checkInBeforeVisible 
      ? 0 
      : checkInIndex * dayWidth + dayWidth * 0.3;
    
    const endRight = checkOutAfterVisible
      ? dates.length * dayWidth
      : checkOutIndex * dayWidth + dayWidth * 0.2;
    
    const width = endRight - startLeft - 4; // -4 for padding
    
    if (width <= 0) return null;
    
    return {
      left: startLeft,
      width: width,
      totalDays,
      isSameDayCheckInOut: false,
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
      const visibleDateIndex = Math.floor(scrollLeft / responsiveCellWidth);
      const centeredIndex = Math.min(
        visibleDateIndex + Math.floor(e.target.clientWidth / responsiveCellWidth / 2),
        dates.length - 1
      );
      if (centeredIndex >= 0 && centeredIndex < dates.length) {
        onVisibleDateChange(dates[centeredIndex]);
      }
    }
  }, [onVisibleDateChange, dates, responsiveCellWidth]);

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="max-w-full overflow-x-auto">
      <div className="flex">
        {/* Fixed Sidebar - Unit Names */}
        <div 
          className="flex-shrink-0 border-r bg-gray-50" 
          style={{ width: `${responsiveSidebarWidth}px` }}
        >
          {/* Header */}
          <div className={cn("border-b bg-gray-100 flex items-center px-4 font-semibold text-gray-700", responsiveHeaderHeight)}>
            Acomodações
          </div>
          
          {/* Unit List */}
          {units.map(unit => {
            const isFocused = focusedUnitId === unit.id;
            const isDimmed = focusedUnitId !== null && !isFocused;
            
            return (
              <div
                key={unit.id}
                className={cn(
                  "border-b flex items-center transition-opacity",
                  responsiveUnitRowHeight,
                  isMobile ? "px-1 space-x-1" : "px-4 space-x-3",
                  isDimmed && "opacity-30"
                )}
              >
                {/* Color Indicator - Clickable for focus mode */}
                <div
                  className={cn(
                    "flex-shrink-0 border-2 cursor-pointer transition-all rounded-full",
                    isMobile ? "w-2.5 h-2.5" : "w-4 h-4",
                    isFocused ? "border-primary-500 ring-2 ring-primary-300 scale-125" : "border-gray-300 hover:border-primary-400"
                  )}
                  style={{ backgroundColor: unit.color_hex }}
                  title={isFocused ? `Modo foco ativo - ${unit.name}` : `Clique para focar em ${unit.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUnitFocus) {
                      onUnitFocus(unit.id);
                    }
                  }}
                />
                
                {/* Unit Details */}
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-gray-900 truncate", isMobile ? "text-[9px] leading-tight" : "text-sm")}>
                    {unit.name}
                  </div>
                  {!isMobile && (
                    <>
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
                    </>
                  )}
                  {isMobile && (
                    <div className="text-[8px]">
                      <span 
                        className={cn(
                          'inline-block px-0.5 py-0.5 rounded text-white text-[7px]',
                          unit.status === 'CLEAN' ? 'bg-green-600' : 'bg-orange-600'
                        )}
                        title={unit.status === 'CLEAN' ? 'Limpo' : 'Sujo'}
                      >
                        {unit.status === 'CLEAN' ? 'L' : 'S'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline Area */}
        <div 
          className="flex-1 overflow-x-auto"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <div style={{ minWidth: `${dates.length * responsiveCellWidth}px` }}>
            {/* Date Header */}
            <div className={cn("border-b bg-gray-100 flex", responsiveHeaderHeight)}>
              {dates.map((date, index) => {
                const holidayName = isHoliday(date);
                const isMonthBoundary = date.getDate() === 1;
                const monthBoundaryClasses = isMonthBoundary ? 'border-l-2 border-l-gray-500' : '';
                return (
                  <div
                    key={index}
                    className={cn(
                      'border-r border-gray-200 flex flex-col items-center justify-center',
                      monthBoundaryClasses,
                      isMobile ? 'text-[10px]' : 'text-xs',
                      isSameDay(date, new Date()) && 'bg-primary-50 border-primary-300'
                    )}
                    style={{ width: `${responsiveCellWidth}px` }}
                    title={holidayName || undefined}
                  >
                    <div className={cn(
                      'font-semibold text-gray-700',
                      holidayName && 'text-red-700'
                    )}>
                      {isMobile ? format(date, 'EEE', { locale: ptBR }).slice(0, 1).toUpperCase() : format(date, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={cn(
                      'text-gray-600',
                      isSameDay(date, new Date()) && 'text-primary-600 font-bold',
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
            {units.map(unit => {
              const isFocused = focusedUnitId === unit.id;
              const isDimmed = focusedUnitId !== null && !isFocused;
              
              return (
                <div 
                  key={unit.id} 
                  className={cn(
                    "relative h-20 border-b transition-opacity",
                    isDimmed && "opacity-30"
                  )}
                  style={{
                    pointerEvents: isDimmed ? 'none' : 'auto'
                  }}
                >
                {/* Grid Cells */}
                <div className="absolute inset-0 flex">
                  {dates.map((date, index) => {
                    // Unit color is only shown on hover now
                    const hoverBgColor = getLightTint(unit.color_hex || '#4A90E2', 0.25);
                    const isSelected = isDateInSelection(date, unit.id);
                    const isMonthBoundary = date.getDate() === 1;
                    const monthBoundaryClasses = isMonthBoundary ? 'border-l-2 border-l-gray-500' : '';
                    return (
                      <div
                        key={index}
                        data-selected={isSelected || undefined}
                        className={cn(
                          'calendar-cell border-r border-gray-200 cursor-pointer transition-colors relative group',
                          monthBoundaryClasses,
                          isSameDay(date, new Date()) && 'ring-2 ring-inset ring-primary-400',
                          isSelected && 'ring-2 ring-inset ring-accent-500 bg-accent-100',
                          isSelectionEdge(date, unit.id) === 'start' && 'ring-2 ring-accent-600',
                          isSelectionEdge(date, unit.id) === 'end' && 'ring-2 ring-accent-600'
                        )}
                        style={{ 
                          width: `${responsiveCellWidth}px`,
                          backgroundColor: isSelected 
                            ? 'rgba(34, 197, 94, 0.2)'
                            : undefined,
                          '--hover-bg-color': hoverBgColor
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
                  const barConfig = calculateReservationBar(reservation, dates, responsiveCellWidth);
                  if (!barConfig) return null;

                  // Build the tooltip text
                  const tooltipText = barConfig.isSameDayCheckInOut
                    ? `${reservation.client.full_name} - Check-in e Check-out no mesmo dia (${format(parseISO(reservation.check_in), 'dd/MM/yyyy')})`
                    : `${reservation.client.full_name} - ${format(parseISO(reservation.check_in), 'dd/MM/yyyy')} até ${format(parseISO(reservation.check_out), 'dd/MM/yyyy')}`;

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
                      title={tooltipText}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReservationClick && onReservationClick(reservation);
                      }}
                    >
                      {/* Main reservation bar content */}
                      <div className="absolute inset-0 flex items-center justify-center px-8 overflow-hidden">
                        {(() => {
                          const isCompact = barConfig.width < 180;
                          const hideTimeStamps = barConfig.isSameDayCheckInOut || barConfig.totalDays <= 1;
                          return (
                            <>
                              {/* Check-in time at left tip (hidden for 1-day or same-day reservations) */}
                              {!hideTimeStamps && (
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white z-20 pointer-events-none">
                                  {formatTimeHM(reservation.check_in)}
                                </div>
                              )}
                              {/* Centered content: client name + days */}
                              <div className="flex items-center gap-2 text-white z-10">
                                <span className={cn('font-medium text-sm', isCompact ? 'truncate max-w-[55%]' : 'whitespace-nowrap')}>
                                  {reservation.client.full_name}
                                </span>
                                {barConfig.totalDays >= 2 && (
                                  <span className="text-xs font-semibold">{barConfig.totalDays}d</span>
                                )}
                              </div>
                              {/* Check-out time at right tip (hidden for 1-day or same-day reservations) */}
                              {!hideTimeStamps && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white z-20 pointer-events-none">
                                  {formatTimeHM(reservation.check_out)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-xs">
        {/* Status Legend - Left Side */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-accent-500 border-2 border-accent-600 rounded"></div>
            <span className="text-gray-700">Confirmado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-500 rounded"></div>
            <span className="text-gray-700">Pendente</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-primary-500 border-2 border-primary-600 rounded"></div>
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
    </div>
  );
}
