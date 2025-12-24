import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Users, CheckCircle, Clock, CreditCard, LogOut, Eye, ChevronDown, X, AlertCircle, Shield, UserPlus, Trash2, Save, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const API_URL = '/api';

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  en_proceso: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  acreditada: { label: 'Acreditada', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle },
  pagada: { label: 'Pagada', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: CreditCard },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState({});
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [editingNomina, setEditingNomina] = useState(null);
  const [editForm, setEditForm] = useState({ numeroOperacion: '', montoRecibido: '', numeroBoleta: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('nominas');
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'contratista' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('nominas-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadNominas();
      if (user.role === 'admin') {
        loadUsers();
      }
    }
  }, [user]);

  const loadNominas = async () => {
    try {
      const url = user.role === 'admin' 
        ? `${API_URL}/nominas` 
        : `${API_URL}/nominas?contratista=${user.username}`;
      const res = await fetch(url);
      const data = await res.json();
      setNominas(data);
    } catch (error) {
      console.error('Error cargando nóminas:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('nominas-user', JSON.stringify(data.user));
      } else {
        setLoginError(data.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      setLoginError('Error de conexión');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nominas-user');
    setLoginForm({ username: '', password: '' });
    setSelectedNomina(null);
    setNominas([]);
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

      const nominaData = {
        filename: file.name,
        contratista: user.username,
        contratistaName: user.name,
        totalCLP,
        registros: data.length,
        data: data,
      };

      const res = await fetch(`${API_URL}/nominas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nominaData)
      });

      if (res.ok) {
        await loadNominas();
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      alert('Error al procesar el archivo.');
    }

    setUploading(false);
    e.target.value = '';
  };

  const updateEstado = async (nominaId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_URL}/nominas/${nominaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (res.ok) {
        setNominas(nominas.map(n => n.id === nominaId ? { ...n, estado: nuevoEstado } : n));
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const handleEditNomina = (nomina) => {
    setEditingNomina(nomina);
    setEditForm({
      numeroOperacion: nomina.numeroOperacion || '',
      montoRecibido: nomina.montoRecibido || '',
      numeroBoleta: nomina.numeroBoleta || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/nominas/${editingNomina.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setNominas(nominas.map(n => n.id === editingNomina.id ? { ...n, ...editForm } : n));
        setEditingNomina(null);
        setEditForm({ numeroOperacion: '', montoRecibido: '', numeroBoleta: '' });
      } else {
        alert('Error al guardar');
      }
    } catch (error) {
      alert('Error de conexión');
    }

    setSaving(false);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      if (res.ok) {
        await loadUsers();
        setShowUserModal(false);
        setUserForm({ username: '', password: '', name: '', role: 'contratista' });
      } else {
        const data = await res.json();
        alert(data.message || 'Error al guardar usuario');
      }
    } catch (error) {
      alert('Error de conexión');
    }

    setSaving(false);
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`¿Eliminar usuario "${username}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/users/${username}`, { method: 'DELETE' });
      if (res.ok) {
        await loadUsers();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const formatCLP = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00A651] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00A651] via-[#008C45] to-[#006633] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
        </div>
        
        <div className="relative w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <span className="text-4xl font-black text-[#00A651] tracking-tight">AFEX</span>
              <h1 className="text-xl font-semibold text-gray-800 mb-1 mt-4">Portal de Nóminas</h1>
              <p className="text-gray-500 text-sm">Gestión de pagos a contratistas</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
                <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] transition-all"
                  placeholder="Ingrese su usuario" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50 focus:border-[#00A651] transition-all"
                  placeholder="Ingrese su contraseña" />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3 border border-red-200">
                  <AlertCircle className="w-4 h-4" />{loginError}
                </div>
              )}
              <button type="submit" className="w-full py-3.5 px-4 rounded-xl bg-[#00A651] text-white font-semibold hover:bg-[#008C45] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00A651]/30">
                Iniciar Sesión
              </button>
            </form>
          </div>
          <p className="text-center text-white/60 text-xs mt-6">© 2024 AFEX Chile. Todos los derechos reservados.</p>
        </div>
      </div>
    );
  }

  // Contratista Dashboard
  if (user.role === 'contratista') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-[#00A651] sticky top-0 z-40 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-white tracking-tight">AFEX</span>
              <div className="h-8 w-px bg-white/30"></div>
              <div>
                <h1 className="font-semibold text-white">Portal de Nóminas</h1>
                <p className="text-xs text-white/70">{user.name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />Salir
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#00A651]" />Cargar Nueva Nómina
            </h2>
            <label className="relative block cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${uploading ? 'border-[#00A651] bg-green-50' : 'border-gray-300 hover:border-[#00A651] hover:bg-green-50/50'}`}>
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600">Procesando archivo...</p>
                  </div>
                ) : uploadSuccess ? (
                  <div className="flex flex-col items-center text-[#00A651]">
                    <CheckCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">¡Nómina cargada exitosamente!</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Arrastra un archivo o haz clic para seleccionar</p>
                    <p className="text-sm text-gray-400">Formatos: Excel (.xlsx, .xls) o CSV</p>
                  </>
                )}
              </div>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#00A651]" />Mis Nóminas
              </h2>
            </div>
            {nominas.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No has cargado ninguna nómina aún</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {nominas.map((nomina) => {
                  const EstadoIcon = ESTADOS[nomina.estado]?.icon || Clock;
                  return (
                    <div key={nomina.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#00A651]/10 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-[#00A651]" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{nomina.filename}</p>
                            <p className="text-sm text-gray-500">{formatDate(nomina.fechaSubida)} • {nomina.registros} registros</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">{formatCLP(nomina.totalCLP)}</p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${ESTADOS[nomina.estado]?.color || 'bg-gray-100'}`}>
                            <EstadoIcon className="w-3 h-3" />{ESTADOS[nomina.estado]?.label || nomina.estado}
                          </span>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#00A651] sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-black text-white tracking-tight">AFEX</span>
            <div className="h-8 w-px bg-white/30"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-white/80" />
              <div>
                <h1 className="font-semibold text-white">Panel de Administración</h1>
                <p className="text-xs text-white/70">Gestión de Nóminas</p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('nominas')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'nominas' ? 'bg-[#00A651] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <FileSpreadsheet className="w-4 h-4 inline mr-2" />Nóminas
          </button>
          <button onClick={() => setActiveTab('usuarios')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'usuarios' ? 'bg-[#00A651] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            <Users className="w-4 h-4 inline mr-2" />Usuarios
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'nominas' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-[#00A651] rounded-2xl p-6 text-white shadow-lg">
                <p className="text-white/70 text-sm mb-1">Total General CLP</p>
                <p className="text-2xl font-bold">{formatCLP(totalGeneral)}</p>
                <p className="text-white/70 text-xs mt-2">{nominas.length} nóminas</p>
              </div>
              {Object.entries(ESTADOS).map(([key, estado]) => {
                const count = nominasPorEstado[key].length;
                const total = nominasPorEstado[key].reduce((s, n) => s + n.totalCLP, 0);
                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border mb-3 ${estado.color}`}>
                      <estado.icon className="w-3 h-3" />{estado.label}
                    </div>
                    <p className="text-xl font-bold text-gray-800">{formatCLP(total)}</p>
                    <p className="text-gray-400 text-xs">{count} nóminas</p>
                  </div>
                );
              })}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#00A651]" />Listado de Nóminas
                </h2>
              </div>
              {nominas.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay nóminas registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Contratista</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Archivo</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Total CLP</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">N° Operación</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Monto Recibido</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">N° Boleta</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {nominas.map((nomina) => (
                        <tr key={nomina.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#00A651]/10 flex items-center justify-center text-[#00A651] font-semibold text-sm">
                                {nomina.contratistaName?.charAt(0) || 'C'}
                              </div>
                              <span className="font-medium text-gray-800">{nomina.contratistaName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{nomina.filename}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{formatDate(nomina.fechaSubida)}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCLP(nomina.totalCLP)}</td>
                          <td className="px-6 py-4 text-gray-600">{nomina.numeroOperacion || '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-600">{nomina.montoRecibido ? formatCLP(parseFloat(nomina.montoRecibido)) : '-'}</td>
                          <td className="px-6 py-4 text-gray-600">{nomina.numeroBoleta || '-'}</td>
                          <td className="px-6 py-4">
                            <select value={nomina.estado} onChange={(e) => updateEstado(nomina.id, e.target.value)}
                              className={`appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-full border text-xs font-medium ${ESTADOS[nomina.estado]?.color || 'bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-[#00A651]/50`}>
                              {Object.entries(ESTADOS).map(([key, estado]) => (
                                <option key={key} value={key}>{estado.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setSelectedNomina(nomina)} className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-[#00A651] hover:bg-[#00A651]/10 rounded-lg font-medium" title="Ver detalle">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEditNomina(nomina)} className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium" title="Editar campos">
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Usuarios Tab */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00A651]" />Gestión de Usuarios
              </h2>
              <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#008C45] transition-colors">
                <UserPlus className="w-4 h-4" />Nuevo Usuario
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(users).map(([username, userData]) => (
                    <tr key={username} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{username}</td>
                      <td className="px-6 py-4 text-gray-600">{userData.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${userData.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {userData.role === 'admin' ? 'Administrador' : 'Contratista'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {username !== 'admin' && (
                          <button onClick={() => handleDeleteUser(username)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Detalle Nómina */}
      {selectedNomina && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedNomina(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between bg-[#00A651]">
              <div className="text-white">
                <h3 className="font-bold">{selectedNomina.filename}</h3>
                <p className="text-sm text-white/80">{selectedNomina.contratistaName} • {formatDate(selectedNomina.fechaSubida)}</p>
              </div>
              <button onClick={() => setSelectedNomina(null)} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <div className="mb-4 p-4 bg-[#00A651]/10 rounded-xl flex items-center justify-between border border-[#00A651]/20">
                <span className="text-[#00A651] font-medium">Total CLP:</span>
                <span className="text-2xl font-bold text-[#00A651]">{formatCLP(selectedNomina.totalCLP)}</span>
              </div>
              
              {/* Info adicional */}
              {(selectedNomina.numeroOperacion || selectedNomina.montoRecibido || selectedNomina.numeroBoleta) && (
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Operación</p>
                    <p className="font-semibold text-gray-800">{selectedNomina.numeroOperacion || '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Monto Recibido</p>
                    <p className="font-semibold text-gray-800">{selectedNomina.montoRecibido ? formatCLP(parseFloat(selectedNomina.montoRecibido)) : '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">N° Boleta</p>
                    <p className="font-semibold text-gray-800">{selectedNomina.numeroBoleta || '-'}</p>
                  </div>
                </div>
              )}

              {selectedNomina.data?.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(selectedNomina.data[0]).map((key) => (
                          <th key={key} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedNomina.data.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="px-4 py-2 text-gray-700 whitespace-nowrap">{val?.toString() || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedNomina.data.length > 50 && (
                    <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                      Mostrando 50 de {selectedNomina.data.length} registros
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Nómina */}
      {editingNomina && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingNomina(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between bg-[#00A651]">
              <div className="text-white">
                <h3 className="font-bold">Editar Nómina</h3>
                <p className="text-sm text-white/80">{editingNomina.filename}</p>
              </div>
              <button onClick={() => setEditingNomina(null)} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Operación</label>
                <input type="text" value={editForm.numeroOperacion} onChange={(e) => setEditForm({ ...editForm, numeroOperacion: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50"
                  placeholder="Ej: 123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Recibido (CLP)</label>
                <input type="number" value={editForm.montoRecibido} onChange={(e) => setEditForm({ ...editForm, montoRecibido: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50"
                  placeholder="Ej: 1500000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Boleta</label>
                <input type="text" value={editForm.numeroBoleta} onChange={(e) => setEditForm({ ...editForm, numeroBoleta: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50"
                  placeholder="Ej: BOL-001234" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008C45] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between bg-[#00A651]">
              <h3 className="font-bold text-white">Nuevo Usuario</h3>
              <button onClick={() => setShowUserModal(false)} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/50">
                  <option value="contratista">Contratista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full py-3 bg-[#00A651] text-white rounded-lg font-semibold hover:bg-[#008C45] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                Guardar Usuario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
