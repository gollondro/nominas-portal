import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Users, CheckCircle, Clock, CreditCard, LogOut, Eye, ChevronDown, X, AlertCircle, Building2, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Usuarios predefinidos - En producción usar una base de datos
const USERS = {
  admin: { password: 'admin123', role: 'admin', name: 'Administrador' },
  contratista1: { password: 'contra123', role: 'contratista', name: 'Constructora Norte SpA' },
  contratista2: { password: 'contra123', role: 'contratista', name: 'Servicios Integrales Ltda' },
  contratista3: { password: 'contra123', role: 'contratista', name: 'Mantención Industrial SA' },
};

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  en_proceso: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  acreditada: { label: 'Acreditada', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle },
  pagada: { label: 'Pagada', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: CreditCard },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Cargar nóminas desde localStorage
  useEffect(() => {
    loadNominas();
    // Verificar si hay sesión guardada
    const savedUser = localStorage.getItem('nominas-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const loadNominas = () => {
    try {
      const saved = localStorage.getItem('nominas-data');
      if (saved) {
        setNominas(JSON.parse(saved));
      }
    } catch (e) {
      console.log('No hay nóminas guardadas');
    }
    setLoading(false);
  };

  const saveNominas = (newNominas) => {
    try {
      localStorage.setItem('nominas-data', JSON.stringify(newNominas));
      setNominas(newNominas);
    } catch (e) {
      console.error('Error guardando nóminas:', e);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const userData = USERS[loginForm.username];
    if (userData && userData.password === loginForm.password) {
      const userSession = { username: loginForm.username, ...userData };
      setUser(userSession);
      localStorage.setItem('nominas-user', JSON.stringify(userSession));
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nominas-user');
    setLoginForm({ username: '', password: '' });
    setSelectedNomina(null);
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => resolve(results.data.filter(row => Object.values(row).some(v => v))),
        error: reject,
      });
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(false);

    try {
      let data;
      if (file.name.endsWith('.csv')) {
        data = await parseCSVFile(file);
      } else {
        data = await parseExcelFile(file);
      }

      // Buscar columna CLP (puede tener diferentes nombres)
      const clpColumn = Object.keys(data[0] || {}).find(key => 
        key.toUpperCase().includes('CLP') || 
        key.toUpperCase().includes('MONTO') ||
        key.toUpperCase().includes('TOTAL') ||
        key.toUpperCase().includes('SUELDO')
      );

      const totalCLP = data.reduce((sum, row) => {
        const value = row[clpColumn] || row.CLP || row.Monto || row.MONTO || row.Total || row.TOTAL || 0;
        const numValue = typeof value === 'string' 
          ? parseFloat(value.replace(/[$.]/g, '').replace(',', '.')) 
          : value;
        return sum + (isNaN(numValue) ? 0 : numValue);
      }, 0);

      const newNomina = {
        id: Date.now().toString(),
        filename: file.name,
        contratista: user.username,
        contratistaName: user.name,
        fechaSubida: new Date().toISOString(),
        estado: 'pendiente',
        totalCLP,
        registros: data.length,
        data: data,
      };

      const updatedNominas = [...nominas, newNomina];
      saveNominas(updatedNominas);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Error procesando archivo:', error);
      alert('Error al procesar el archivo. Asegúrese de que sea un Excel o CSV válido.');
    }

    setUploading(false);
    e.target.value = '';
  };

  const updateEstado = (nominaId, nuevoEstado) => {
    const updatedNominas = nominas.map(n => 
      n.id === nominaId ? { ...n, estado: nuevoEstado } : n
    );
    saveNominas(updatedNominas);
  };

  const formatCLP = (value) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-emerald-600/10 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Portal de Nóminas
              </h1>
              <p className="text-slate-400 text-sm">Gestión de pagos a contratistas</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Usuario</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  placeholder="Ingrese su usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  placeholder="Ingrese su contraseña"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-semibold hover:from-blue-600 hover:to-emerald-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
              >
                Iniciar Sesión
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500 text-center mb-3">Credenciales de prueba:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <span className="text-slate-400">Admin:</span>
                  <span className="text-slate-300 ml-1">admin / admin123</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <span className="text-slate-400">Contratista:</span>
                  <span className="text-slate-300 ml-1">contratista1 / contra123</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Contratista Dashboard
  if (user.role === 'contratista') {
    const misNominas = nominas.filter(n => n.contratista === user.username);
    
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800">Portal de Nóminas</h1>
                <p className="text-xs text-slate-500">{user.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Cargar Nueva Nómina
            </h2>
            
            <label className="relative block cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}>
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-600">Procesando archivo...</p>
                  </div>
                ) : uploadSuccess ? (
                  <div className="flex flex-col items-center text-emerald-600">
                    <CheckCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">¡Nómina cargada exitosamente!</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-2">Arrastra un archivo o haz clic para seleccionar</p>
                    <p className="text-sm text-slate-400">Formatos aceptados: Excel (.xlsx, .xls) o CSV</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Mis Nóminas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                Mis Nóminas
              </h2>
            </div>
            
            {misNominas.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No has cargado ninguna nómina aún</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {misNominas.map((nomina) => {
                  const EstadoIcon = ESTADOS[nomina.estado].icon;
                  return (
                    <div key={nomina.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{nomina.filename}</p>
                            <p className="text-sm text-slate-500">{formatDate(nomina.fechaSubida)} • {nomina.registros} registros</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCLP(nomina.totalCLP)}</p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${ESTADOS[nomina.estado].color}`}>
                              <EstadoIcon className="w-3 h-3" />
                              {ESTADOS[nomina.estado].label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Admin Dashboard
  const totalGeneral = nominas.reduce((sum, n) => sum + n.totalCLP, 0);
  const nominasPorEstado = {
    pendiente: nominas.filter(n => n.estado === 'pendiente'),
    en_proceso: nominas.filter(n => n.estado === 'en_proceso'),
    acreditada: nominas.filter(n => n.estado === 'acreditada'),
    pagada: nominas.filter(n => n.estado === 'pagada'),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Panel de Administración</h1>
              <p className="text-xs text-slate-500">Gestión de Nóminas</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white col-span-1 md:col-span-2 lg:col-span-1">
            <p className="text-slate-400 text-sm mb-1">Total General CLP</p>
            <p className="text-2xl font-bold">{formatCLP(totalGeneral)}</p>
            <p className="text-slate-400 text-xs mt-2">{nominas.length} nóminas</p>
          </div>
          {Object.entries(ESTADOS).map(([key, estado]) => {
            const count = nominasPorEstado[key].length;
            const total = nominasPorEstado[key].reduce((s, n) => s + n.totalCLP, 0);
            return (
              <div key={key} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border mb-3 ${estado.color}`}>
                  <estado.icon className="w-3 h-3" />
                  {estado.label}
                </div>
                <p className="text-xl font-bold text-slate-800">{formatCLP(total)}</p>
                <p className="text-slate-400 text-xs">{count} nóminas</p>
              </div>
            );
          })}
        </div>

        {/* Nóminas Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Listado de Nóminas
            </h2>
          </div>

          {nominas.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No hay nóminas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contratista</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Archivo</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registros</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total CLP</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nominas.map((nomina) => {
                    const EstadoIcon = ESTADOS[nomina.estado].icon;
                    return (
                      <tr key={nomina.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                              {nomina.contratistaName?.charAt(0) || 'C'}
                            </div>
                            <span className="font-medium text-slate-800">{nomina.contratistaName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{nomina.filename}</td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{formatDate(nomina.fechaSubida)}</td>
                        <td className="px-6 py-4 text-slate-600">{nomina.registros}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCLP(nomina.totalCLP)}</td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block">
                            <select
                              value={nomina.estado}
                              onChange={(e) => updateEstado(nomina.id, e.target.value)}
                              className={`appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-full border text-xs font-medium ${ESTADOS[nomina.estado].color} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                            >
                              {Object.entries(ESTADOS).map(([key, estado]) => (
                                <option key={key} value={key}>{estado.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSelectedNomina(nomina)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalle */}
      {selectedNomina && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedNomina(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">{selectedNomina.filename}</h3>
                <p className="text-sm text-slate-500">{selectedNomina.contratistaName} • {formatDate(selectedNomina.fechaSubida)}</p>
              </div>
              <button
                onClick={() => setSelectedNomina(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <div className="mb-4 p-4 bg-blue-50 rounded-xl flex items-center justify-between">
                <span className="text-blue-800 font-medium">Total CLP:</span>
                <span className="text-2xl font-bold text-blue-900">{formatCLP(selectedNomina.totalCLP)}</span>
              </div>
              {selectedNomina.data && selectedNomina.data.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        {Object.keys(selectedNomina.data[0]).map((key) => (
                          <th key={key} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedNomina.data.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                              {val?.toString() || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedNomina.data.length > 50 && (
                    <div className="px-4 py-3 bg-slate-50 text-center text-sm text-slate-500">
                      Mostrando 50 de {selectedNomina.data.length} registros
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
