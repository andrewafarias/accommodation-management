import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimelineCalendar } from '../components/calendar/TimelineCalendar';
import { format, addDays, subDays } from 'date-fns';
import api from '../services/api';

export function Calendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handlePreviousWeek = () => {
    setStartDate(prevDate => subDays(prevDate, 7));
  };

  const handleNextWeek = () => {
    setStartDate(prevDate => addDays(prevDate, 7));
  };

  const handleToday = () => {
    setStartDate(new Date());
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
              onClick={handlePreviousWeek}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Week
            </Button>
            
            <Button
              onClick={handleToday}
              variant="outline"
              size="sm"
            >
              Today
            </Button>
            
            <Button
              onClick={handleNextWeek}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              Next Week
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
            Starting: {format(startDate, 'dd/MM/yyyy')}
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
