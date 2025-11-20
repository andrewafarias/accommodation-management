import { BedDouble } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { format, parseISO, isWithinInterval } from 'date-fns';

export function ActiveReservationsWidget({ reservations }) {
  // Filter reservations where today is between check_in and check_out
  const today = new Date();
  const activeReservations = reservations.filter(reservation => {
    if (reservation.status === 'CANCELLED') return false;
    
    try {
      const checkIn = parseISO(reservation.check_in);
      const checkOut = parseISO(reservation.check_out);
      
      return isWithinInterval(today, {
        start: checkIn,
        end: checkOut,
      });
    } catch (error) {
      console.error('Error parsing reservation dates:', error);
      return false;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-green-700">
          <BedDouble className="w-5 h-5 mr-2" />
          Reservas em Andamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeReservations.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma reserva em andamento no momento.</p>
        ) : (
          <div className="space-y-3">
            {activeReservations.map(reservation => (
              <div
                key={reservation.id}
                className="flex justify-between items-start p-3 bg-green-50 border border-green-200 rounded-md"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {reservation.client?.full_name || 'Cliente não especificado'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {reservation.accommodation_unit?.name || 'Unidade não especificada'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      Check-in: {format(parseISO(reservation.check_in), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Data de Saída</p>
                  <p className="font-semibold text-green-700">
                    {format(parseISO(reservation.check_out), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            ))}
            {activeReservations.length > 0 && (
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                Total: {activeReservations.length} {activeReservations.length === 1 ? 'reserva' : 'reservas'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
