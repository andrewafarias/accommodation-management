import { useMemo } from 'react';
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

/**
 * TimelineCalendar Component
 * 
 * A Gantt-style calendar view for accommodation reservations.
 * - Y-Axis: Lists accommodation units
 * - X-Axis: Displays dates horizontally
 * - Cells: Shows reservations as colored bars spanning check-in/out dates
 */
export function TimelineCalendar({ 
  units = [], 
  reservations = [], 
  startDate = new Date(), 
  daysToShow = 30,
  onCellClick,
  onReservationClick 
}) {
  // Generate array of dates to display
  const dates = useMemo(() => {
    const start = startOfDay(startDate);
    return Array.from({ length: daysToShow }, (_, i) => addDays(start, i));
  }, [startDate, daysToShow]);

  // Calculate cell width for responsive design
  const cellWidth = 120; // pixels per day cell
  const sidebarWidth = 200; // pixels for the sidebar

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
    
    // Find start index (where reservation begins in visible range)
    const startIndex = dates.findIndex(date => isSameDay(date, checkIn) || date > checkIn);
    if (startIndex === -1) return null; // Reservation ends before visible range
    
    // Calculate the actual start position (may need to start before visible range)
    let offsetDays = 0;
    if (dates[0] > checkIn) {
      // Reservation starts before visible range
      offsetDays = Math.floor((dates[0] - checkIn) / (1000 * 60 * 60 * 24));
    }
    
    // Find end index (where reservation ends in visible range)
    const endIndex = dates.findIndex(date => date >= checkOut);
    const actualEndIndex = endIndex === -1 ? dates.length : endIndex;
    
    // Calculate number of days to display
    const totalDays = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const visibleStartIndex = offsetDays > 0 ? 0 : startIndex;
    const visibleDays = actualEndIndex - visibleStartIndex;
    
    if (visibleDays <= 0) return null; // Not in visible range
    
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
        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: `${dates.length * cellWidth}px` }}>
            {/* Date Header */}
            <div className="h-12 border-b bg-gray-100 flex">
              {dates.map((date, index) => (
                <div
                  key={index}
                  className={cn(
                    'border-r flex flex-col items-center justify-center text-xs',
                    isSameDay(date, new Date()) && 'bg-blue-50 border-blue-300'
                  )}
                  style={{ width: `${cellWidth}px` }}
                >
                  <div className="font-semibold text-gray-700">
                    {format(date, 'EEE', { locale: ptBR })}
                  </div>
                  <div className={cn(
                    'text-gray-600',
                    isSameDay(date, new Date()) && 'text-blue-600 font-bold'
                  )}>
                    {format(date, 'dd/MM')}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Rows - One per Unit */}
            {units.map(unit => (
              <div key={unit.id} className="relative h-20 border-b">
                {/* Grid Cells */}
                <div className="absolute inset-0 flex">
                  {dates.map((date, index) => (
                    <div
                      key={index}
                      className={cn(
                        'border-r hover:bg-blue-50 cursor-pointer transition-colors',
                        isSameDay(date, new Date()) && 'bg-blue-50/50'
                      )}
                      style={{ width: `${cellWidth}px` }}
                      onClick={() => onCellClick && onCellClick({
                        unit_id: unit.id,
                        check_in: format(date, 'yyyy-MM-dd'),
                      })}
                    />
                  ))}
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
      <div className="px-4 py-3 border-t bg-gray-50 flex flex-wrap gap-4 text-xs">
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
    </div>
  );
}
