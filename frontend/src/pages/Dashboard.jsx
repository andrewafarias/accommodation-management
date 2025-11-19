import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Home, Users, DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import api from '../services/api';

export function Dashboard() {
  const [stats, setStats] = useState({
    unitsAvailable: 0,
    checkInsToday: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch accommodations
      const accommodationsRes = await api.get('accommodations/');
      const accommodations = accommodationsRes.data.results || accommodationsRes.data;
      const cleanUnits = accommodations.filter(unit => unit.status === 'CLEAN').length;

      // Fetch reservations
      const reservationsRes = await api.get('reservations/');
      const reservations = reservationsRes.data.results || reservationsRes.data;
      
      // Get today's date in ISO format (YYYY-MM-DD)
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Count check-ins today
      const checkInsToday = reservations.filter(reservation => {
        const checkInDate = format(new Date(reservation.check_in), 'yyyy-MM-dd');
        return checkInDate === today;
      }).length;

      // Fetch financial transactions
      const transactionsRes = await api.get('financials/');
      const transactions = transactionsRes.data.results || transactionsRes.data;
      
      // Count unpaid transactions (where paid_date is null)
      const pendingPayments = transactions.filter(t => !t.paid_date).length;
      
      // Calculate total revenue (sum of income transactions that are paid)
      const totalRevenue = transactions
        .filter(t => t.transaction_type === 'INCOME' && t.paid_date)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      setStats({
        unitsAvailable: cleanUnits,
        checkInsToday,
        pendingPayments,
        totalRevenue,
      });

      // Mock chart data for Income vs Expenses
      // In a real implementation, this would aggregate data from the API
      const mockChartData = [
        { month: 'Jan', income: 12000, expenses: 4000 },
        { month: 'Feb', income: 15000, expenses: 5000 },
        { month: 'Mar', income: 18000, expenses: 4500 },
        { month: 'Apr', income: 16000, expenses: 5500 },
        { month: 'May', income: 20000, expenses: 6000 },
        { month: 'Jun', income: 22000, expenses: 5500 },
      ];
      setChartData(mockChartData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              />
              <Legend />
              <Bar dataKey="income" fill="#3b82f6" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
