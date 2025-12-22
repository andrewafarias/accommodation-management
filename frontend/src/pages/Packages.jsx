import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PackageList } from '../components/packages/PackageList';
import { PackageModal } from '../components/packages/PackageModal';
import { Package as PackageIcon, Plus } from 'lucide-react';
import api from '../services/api';

export function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  // Fetch packages on mount
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get('packages/');
      const packagesData = response.data.results || response.data;
      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening modal for new package
  const handleNewPackage = () => {
    setEditingPackage(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setIsModalOpen(true);
  };

  // Handle saving package (create or update)
  const handleSave = async () => {
    // The modal already saves the data, we just need to refresh and close
    await fetchPackages();
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  // Handle delete
  const handleDelete = async (pkg) => {
    if (!window.confirm(`Tem certeza que deseja excluir o pacote "${pkg.name}"?`)) {
      return;
    }

    try {
      await api.delete(`packages/${pkg.id}/`);
      // Refresh the list
      await fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Falha ao excluir pacote.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Pacotes</h1>
        <Button onClick={handleNewPackage}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Pacote
        </Button>
      </div>

      {/* Package List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PackageIcon className="w-6 h-6 mr-2" />
            Gerenciamento de Pacotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PackageList
            packages={packages}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Package Modal */}
      <PackageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        package={editingPackage}
      />
    </div>
  );
}
