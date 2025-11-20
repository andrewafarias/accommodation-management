import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Home, Users, DollarSign, TrendingUp, Sparkles, CalendarCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addDays, parseISO, subMonths, isAfter, isBefore } from 'date-fns';
import api from '../services/api';
import { PeriodSelector } from '../components/dashboard/PeriodSelector';
import { ActiveReservationsWidget } from '../components/dashboard/ActiveReservationsWidget';
import { PendingPaymentsWidget } from '../components/dashboard/PendingPaymentsWidget';

export function Dashboard() {
  const [stats, setStats] = useState({
    unitsAvailable: 0,
    checkInsToday: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [dirtyUnits, setDirtyUnits] = useState([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [startDate, setStartDate] = useState(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch accommodations
      const accommodationsRes = await api.get('accommodations/');
      const accommodations = accommodationsRes.data.results || accommodationsRes.data;
      const cleanUnits = accommodations.filter(unit => unit.status === 'CLEAN').length;
      
      // Filter dirty units for cleaning widget
      const dirty = accommodations.filter(unit => unit.status === 'DIRTY');
      setDirtyUnits(dirty);

      // Fetch reservations
      const reservationsRes = await api.get('reservations/');
      const reservationsData = reservationsRes.data.results || reservationsRes.data;
      setReservations(reservationsData);
      
      // Get today's date in ISO format (YYYY-MM-DD)
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Count check-ins today
      const checkInsToday = reservationsData.filter(reservation => {
        const checkInDate = format(new Date(reservation.check_in), 'yyyy-MM-dd');
        return checkInDate === today && reservation.status !== 'CANCELLED';
      }).length;
      
      // Calculate upcoming arrivals (next 7 days, excluding today)
      const todayDate = new Date();
      const sevenDaysFromNow = addDays(todayDate, 7);
      const upcoming = reservationsData.filter(reservation => {
        if (reservation.status === 'CANCELLED') return false;
        const checkInDate = parseISO(reservation.check_in);
        return checkInDate > todayDate && checkInDate <= sevenDaysFromNow;
      }).sort((a, b) => new Date(a.check_in) - new Date(b.check_in));
      setUpcomingArrivals(upcoming);

      // Fetch financial transactions
      const transactionsRes = await api.get('financials/');
      const transactionsData = transactionsRes.data.results || transactionsRes.data;
      setTransactions(transactionsData);
      
      // Count unpaid transactions (where paid_date is null)
      const pendingPayments = transactionsData.filter(t => !t.paid_date).length;
      
      // Calculate total revenue (sum of income transactions that are paid)
      const totalRevenue = transactionsData
        .filter(t => t.transaction_type === 'INCOME' && t.paid_date)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      setStats({
        unitsAvailable: cleanUnits,
        checkInsToday,
        pendingPayments,
        totalRevenue,
      });

      // Generate chart data from real transactions
      // Group by month and aggregate income vs expenses
      const monthlyData = {};
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      transactionsData.forEach(transaction => {
        if (!transaction.paid_date) return; // Only consider paid transactions
        
        const date = parseISO(transaction.paid_date);
        
        // Filter by date range
        if (isBefore(date, startDate) || isAfter(date, endDate)) {
          return;
        }
        
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthLabel,
            income: 0,
            expenses: 0,
            sortKey: monthKey,
          };
        }
        
        const amount = parseFloat(transaction.amount);
        if (transaction.transaction_type === 'INCOME') {
          monthlyData[monthKey].income += amount;
        } else if (transaction.transaction_type === 'EXPENSE') {
          monthlyData[monthKey].expenses += amount;
        }
      });
      
      // Convert to array and sort by date
      const sortedData = Object.values(monthlyData)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      
      setChartData(sortedData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePeriodChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const statCards = [
    {
      title: 'Units Available',
      value: stats.unitsAvailable,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Check-ins Today',
      value: stats.checkInsToday,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Total Revenue',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cleaning Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <Sparkles className="w-5 h-5 mr-2" />
              Limpeza Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dirtyUnits.length === 0 ? (
              <p className="text-sm text-gray-500">Todas as unidades estão limpas! 🎉</p>
            ) : (
              <ul className="space-y-2">
                {dirtyUnits.map(unit => (
                  <li key={unit.id} className="flex items-center text-sm">
                    <span 
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                      style={{ backgroundColor: unit.color_hex }}
                    />
                    <span className="font-medium text-gray-700">{unit.name}</span>
                    <span className="ml-2 text-gray-500">- Sujo</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Arrivals Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700">
              <CalendarCheck className="w-5 h-5 mr-2" />
              Próximas Chegadas (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingArrivals.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma chegada nos próximos 7 dias.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingArrivals.slice(0, 5).map(reservation => (
                  <li key={reservation.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        {reservation.client.full_name}
                      </span>
                      <span className="text-gray-500">
                        {format(parseISO(reservation.check_in), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {reservation.accommodation_unit.name}
                    </div>
                  </li>
                ))}
                {upcomingArrivals.length > 5 && (
                  <li className="text-xs text-gray-400 italic">
                    +{upcomingArrivals.length - 5} mais...
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Widgets Row - Active Reservations and Pending Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActiveReservationsWidget reservations={reservations} />
        <PendingPaymentsWidget transactions={transactions} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Receita vs Despesa</CardTitle>
          <PeriodSelector onPeriodChange={handlePeriodChange} />
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Nenhum dado financeiro disponível ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Receita" />
                <Bar dataKey="expenses" fill="#ef4444" name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
