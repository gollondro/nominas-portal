# AFEX Portal de Nóminas

Sistema web para gestión de nóminas de contratistas con almacenamiento en archivos JSON.

## 🚀 Deploy en Render.com (Web Service)

### ⚠️ IMPORTANTE: Cambio de tipo de servicio

Este proyecto ahora requiere un **Web Service** (no Static Site) porque tiene un backend con Express.

### Pasos para deploy:

1. **Sube a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Portal de nóminas con backend"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/nominas-portal.git
   git push -u origin main
   ```

2. **En Render.com:**
   - Click en **"New +"** → **"Web Service"** (NO Static Site)
   - Conecta tu repositorio de GitHub
   - Configura:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `nominas-portal-afex` |
   | **Region** | Oregon (US West) o el más cercano |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |

3. Click en **"Create Web Service"**

4. ¡Listo! Tu portal estará en `https://nominas-portal-afex.onrender.com`

## 📁 Estructura de Archivos de Datos

Los datos se guardan en la carpeta `/data`:

```
data/
├── users.json    # Usuarios del sistema
└── nominas.json  # Nóminas cargadas
```

## 🔐 Credenciales por Defecto

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `admin123` |
| Contratista 1 | `contratista1` | `contra123` |
| Contratista 2 | `contratista2` | `contra123` |
| Contratista 3 | `contratista3` | `contra123` |

## ✨ Funcionalidades

### Perfil Contratista
- Subir archivos Excel o CSV con nóminas
- **Campos adicionales al cargar nómina:**
  - País de destino
  - Email remitente
  - DNI remitente
  - RUT remitente
- Ver historial de nóminas subidas
- Ver estado de cada nómina

### Perfil Admin
- Ver todas las nóminas de todos los contratistas
- **Visualización de datos del remitente:**
  - País de destino
  - Email remitente
  - DNI y RUT del remitente
- Cambiar estado: Pendiente → En Proceso → Acreditada → Pagada
- **Gestión de usuarios**: Crear, ver y eliminar usuarios
- Ver suma total de todos los montos CLP
- Ver detalle de cada nómina con información completa

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (frontend + backend)
npm run dev

# O ejecutar por separado:
npm run server:dev  # Backend en puerto 3000
npm run client:dev  # Frontend en puerto 5173

# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

## 📊 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/login` | Iniciar sesión |
| GET | `/api/users` | Obtener usuarios |
| POST | `/api/users` | Crear usuario |
| DELETE | `/api/users/:username` | Eliminar usuario |
| GET | `/api/nominas` | Obtener nóminas |
| POST | `/api/nominas` | Crear nómina (incluye nuevos campos) |
| PATCH | `/api/nominas/:id` | Actualizar estado |
| DELETE | `/api/nominas/:id` | Eliminar nómina |

### Campos de Nómina

```json
{
  "id": "uuid",
  "filename": "nomina.xlsx",
  "contratista": "contratista1",
  "contratistaName": "Constructora Norte SpA",
  "totalCLP": 5000000,
  "registros": 50,
  "data": [...],
  "paisDestino": "Perú",
  "emailRemitente": "contacto@empresa.com",
  "dniRemitente": "12345678",
  "rutRemitente": "12.345.678-9",
  "fechaSubida": "2024-01-15T10:30:00.000Z",
  "estado": "pendiente"
}
```

## ⚠️ Nota sobre Persistencia en Render

En el plan gratuito de Render, el sistema de archivos es efímero (se reinicia periódicamente). Para persistencia permanente, considera:

1. **Render Disk** (plan de pago) - Almacenamiento persistente
2. **Base de datos externa** - MongoDB Atlas, Supabase, etc.
3. **Render con PostgreSQL** - Base de datos incluida

## 📝 Licencia

MIT - AFEX Chile
