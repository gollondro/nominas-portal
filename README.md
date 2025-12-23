# Portal de Nóminas

Sistema web para gestión de nóminas de contratistas con roles de admin y contratista.

## 🚀 Deploy en Render.com

### Opción 1: Deploy desde GitHub (Recomendado)

1. **Sube el proyecto a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/nominas-portal.git
   git push -u origin main
   ```

2. **Configura en Render.com**
   - Ve a [render.com](https://render.com) y crea una cuenta
   - Click en **"New +"** → **"Static Site"**
   - Conecta tu cuenta de GitHub
   - Selecciona el repositorio `nominas-portal`
   - Configura:
     - **Name:** `nominas-portal` (o el nombre que prefieras)
     - **Branch:** `main`
     - **Build Command:** `npm install && npm run build`
     - **Publish Directory:** `dist`
   - Click en **"Create Static Site"**

3. ¡Listo! Tu sitio estará disponible en `https://nominas-portal.onrender.com`

### Opción 2: Deploy manual

1. Construye el proyecto localmente:
   ```bash
   npm install
   npm run build
   ```

2. La carpeta `dist` contiene los archivos estáticos listos para deploy.

## 🔐 Credenciales de Acceso

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `admin123` |
| Contratista 1 | `contratista1` | `contra123` |
| Contratista 2 | `contratista2` | `contra123` |
| Contratista 3 | `contratista3` | `contra123` |

## ✨ Funcionalidades

### Perfil Contratista
- Subir archivos Excel (.xlsx, .xls) o CSV con nóminas
- Ver historial de nóminas subidas
- Ver estado de cada nómina
- Ver el total CLP de cada nómina

### Perfil Admin
- Ver listado completo de todas las nóminas
- Ver qué contratista subió cada nómina
- Suma total de todos los montos CLP
- Cambiar estado: Pendiente → En Proceso → Acreditada → Pagada
- Ver detalle de cada nómina

## 📊 Formato del Archivo de Nómina

El sistema detecta automáticamente columnas con estos nombres:
- `CLP`
- `Monto` / `MONTO`
- `Total` / `TOTAL`
- `Sueldo` / `SUELDO`

Ejemplo de estructura:
| Nombre | RUT | Cargo | CLP |
|--------|-----|-------|-----|
| Juan Pérez | 12.345.678-9 | Maestro | 850000 |
| María González | 11.222.333-4 | Ayudante | 650000 |

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Preview de la build
npm run preview
```

## ⚠️ Notas Importantes

- Los datos se guardan en `localStorage` del navegador
- Para producción real, implementar un backend con base de datos
- Las contraseñas están en texto plano (solo para demo)

## 📝 Licencia

MIT
