import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Servir archivos estáticos del build de React
app.use(express.static(path.join(__dirname, 'dist')));

// Rutas de datos
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const NOMINAS_FILE = path.join(DATA_DIR, 'nominas.json');

// Asegurar que exista el directorio de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Funciones helper para leer/escribir archivos
const readJsonFile = (filePath, defaultValue = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
};

// Inicializar archivos si no existen
const initializeData = () => {
  // Usuarios por defecto
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = {
      admin: { password: 'admin123', role: 'admin', name: 'Administrador' },
      contratista1: { password: 'contra123', role: 'contratista', name: 'Constructora Norte SpA' },
      contratista2: { password: 'contra123', role: 'contratista', name: 'Servicios Integrales Ltda' },
      contratista3: { password: 'contra123', role: 'contratista', name: 'Mantención Industrial SA' },
    };
    writeJsonFile(USERS_FILE, defaultUsers);
    console.log('✅ Archivo de usuarios creado');
  }

  // Nóminas vacías
  if (!fs.existsSync(NOMINAS_FILE)) {
    writeJsonFile(NOMINAS_FILE, []);
    console.log('✅ Archivo de nóminas creado');
  }
};

initializeData();

// ==================== API ROUTES ====================

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJsonFile(USERS_FILE, {});
  
  const user = users[username];
  if (user && user.password === password) {
    res.json({ 
      success: true, 
      user: { 
        username, 
        role: user.role, 
        name: user.name 
      } 
    });
  } else {
    res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
  }
});

// OBTENER USUARIOS (solo admin)
app.get('/api/users', (req, res) => {
  const users = readJsonFile(USERS_FILE, {});
  // No enviar contraseñas
  const safeUsers = Object.entries(users).reduce((acc, [key, value]) => {
    acc[key] = { ...value, password: '********' };
    return acc;
  }, {});
  res.json(safeUsers);
});

// CREAR/ACTUALIZAR USUARIO
app.post('/api/users', (req, res) => {
  const { username, password, role, name } = req.body;
  
  if (!username || !password || !role || !name) {
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
  }
  
  const users = readJsonFile(USERS_FILE, {});
  users[username] = { password, role, name };
  
  if (writeJsonFile(USERS_FILE, users)) {
    res.json({ success: true, message: 'Usuario guardado correctamente' });
  } else {
    res.status(500).json({ success: false, message: 'Error al guardar usuario' });
  }
});

// ELIMINAR USUARIO
app.delete('/api/users/:username', (req, res) => {
  const { username } = req.params;
  const users = readJsonFile(USERS_FILE, {});
  
  if (username === 'admin') {
    return res.status(400).json({ success: false, message: 'No se puede eliminar el usuario admin' });
  }
  
  if (users[username]) {
    delete users[username];
    if (writeJsonFile(USERS_FILE, users)) {
      res.json({ success: true, message: 'Usuario eliminado' });
    } else {
      res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
});

// OBTENER NÓMINAS
app.get('/api/nominas', (req, res) => {
  const { contratista } = req.query;
  let nominas = readJsonFile(NOMINAS_FILE, []);
  
  if (contratista) {
    nominas = nominas.filter(n => n.contratista === contratista);
  }
  
  res.json(nominas);
});

// CREAR NÓMINA
app.post('/api/nominas', (req, res) => {
  const nominaData = req.body;
  
  if (!nominaData.filename || !nominaData.contratista) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }
  
  const nominas = readJsonFile(NOMINAS_FILE, []);
  
  const newNomina = {
    id: uuidv4(),
    ...nominaData,
    fechaSubida: new Date().toISOString(),
    estado: 'pendiente'
  };
  
  nominas.push(newNomina);
  
  if (writeJsonFile(NOMINAS_FILE, nominas)) {
    res.json({ success: true, nomina: newNomina });
  } else {
    res.status(500).json({ success: false, message: 'Error al guardar nómina' });
  }
});

// ACTUALIZAR ESTADO DE NÓMINA
app.patch('/api/nominas/:id', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  const nominas = readJsonFile(NOMINAS_FILE, []);
  const index = nominas.findIndex(n => n.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Nómina no encontrada' });
  }
  
  nominas[index].estado = estado;
  
  if (writeJsonFile(NOMINAS_FILE, nominas)) {
    res.json({ success: true, nomina: nominas[index] });
  } else {
    res.status(500).json({ success: false, message: 'Error al actualizar nómina' });
  }
});

// ELIMINAR NÓMINA
app.delete('/api/nominas/:id', (req, res) => {
  const { id } = req.params;
  
  let nominas = readJsonFile(NOMINAS_FILE, []);
  const initialLength = nominas.length;
  nominas = nominas.filter(n => n.id !== id);
  
  if (nominas.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Nómina no encontrada' });
  }
  
  if (writeJsonFile(NOMINAS_FILE, nominas)) {
    res.json({ success: true, message: 'Nómina eliminada' });
  } else {
    res.status(500).json({ success: false, message: 'Error al eliminar nómina' });
  }
});

// Ruta catch-all para SPA (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor AFEX Nóminas iniciado
  📡 Puerto: ${PORT}
  📁 Datos en: ${DATA_DIR}
  🌐 URL: http://localhost:${PORT}
  `);
});
