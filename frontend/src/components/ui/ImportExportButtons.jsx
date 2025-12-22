import { useState, useRef } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from './Button';

export function ImportExportButtons({ 
  onExport, 
  onImport, 
  className = '' 
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = (format) => {
    onExport(format);
    setShowExportMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await onImport(file);
    } finally {
      setImporting(false);
      // Reset the file input so the same file can be selected again
      event.target.value = '';
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Export Button with Dropdown */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportMenu(!showExportMenu)}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
        
        {showExportMenu && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowExportMenu(false)}
            />
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              <div className="py-1">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                >
                  <FileJson className="w-4 h-4 mr-2 text-blue-600" />
                  Exportar como JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Exportar como CSV
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleImportClick}
        disabled={importing}
      >
        <Upload className="w-4 h-4 mr-2" />
        {importing ? 'Importando...' : 'Importar'}
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export function ExportAllButton({ onExport, className = '' }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onExport('json')}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Exportar Tudo
    </Button>
  );
}

export function ImportAllButton({ onImport, className = '' }) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await onImport(file);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleImportClick}
        disabled={importing}
        className={className}
      >
        <Upload className="w-4 h-4 mr-2" />
        {importing ? 'Importando...' : 'Importar Tudo'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
