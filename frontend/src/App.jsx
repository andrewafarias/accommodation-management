import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Calendar } from './pages/Calendar';
import { Clients } from './pages/Clients';
import { Financials } from './pages/Financials';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reservations" element={<Calendar />} />
          <Route path="/financials" element={<Financials />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

