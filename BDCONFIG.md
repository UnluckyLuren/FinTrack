# FinTrack — Guía de despliegue completo

**Frontend:** GitHub Pages → `docs/`  
**Backend:** ThinkPad con CasaOS → `backend/`

---

## Estructura del repositorio

```
FinTrack/
├── docs/                    ← GitHub Pages sirve desde aquí
│   └── index.html           ← SPA (apunta al backend en CasaOS)
├── backend/                 ← Se despliega en tu ThinkPad (NO en Pages)
│   ├── api/                 ← Endpoints REST PHP
│   ├── config/              ← Database.php (Singleton PDO)
│   ├── controllers/         ← ControladorAutenticacion.php
│   ├── middleware/           ← Session.php · Response.php (CORS)
│   ├── models/              ← Clases del Diagrama UML
│   ├── uploads/             ← Archivos OCR (ignorado por git)
│   ├── schema.sql           ← BD completa + datos de prueba
│   ├── docker-compose.yml   ← Levanta PHP + MySQL con un comando
│   ├── Dockerfile           ← PHP 8.2 + Apache + PDO MySQL
│   └── .env.example         ← Copia como .env con tu config
├── src/                     ← Código fuente webpack (existente)
├── package.json
└── webpack.config.js
```

---

## PASO 1 — Configurar GitHub Pages

1. Ve a **Settings → Pages** en tu repo de GitHub  
2. En **Source**, selecciona `Deploy from a branch`  
3. Rama: `main`, carpeta: `/docs`  
4. Guarda — en unos minutos estará en `https://unluckyluren.github.io/FinTrack`

---

## PASO 2 — Preparar el ThinkPad (CasaOS)

CasaOS ya tiene Docker instalado. Solo necesitas clonar el repo y levantar los contenedores.

### 2.1 Clonar el repo en el ThinkPad

Abre una terminal en tu ThinkPad y ejecuta:

```bash
# Clonar el repositorio
git clone https://github.com/UnluckyLuren/FinTrack.git
cd FinTrack/backend
```

### 2.2 Crear el archivo .env

```bash
cp .env.example .env
# El .env usa las variables por defecto del docker-compose.yml
# No necesitas cambiarlo para empezar
```

### 2.3 Levantar los contenedores

```bash
docker compose up -d --build
```

Esto hace automáticamente:
- Construye el contenedor PHP 8.2 + Apache
- Levanta MySQL 8 con datos de prueba
- Importa `schema.sql` con todas las tablas y el usuario demo

### 2.4 Verificar que funciona

```bash
# Ver logs
docker compose logs -f

# Probar el backend localmente
curl http://localhost:8080/api/auth.php?action=me
```

Deberías ver: `{"success":false,"error":"No autenticado..."}`

---

## PASO 3 — Exponer el backend a internet (Cloudflare Tunnel)

GitHub Pages necesita poder llegar a tu ThinkPad desde internet.  
Cloudflare Tunnel es **gratuito**, crea HTTPS automáticamente y no requiere abrir puertos en tu router.

### 3.1 Instalar cloudflared

```bash
# En el ThinkPad
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 3.2 Autenticarse (necesitas cuenta gratuita en cloudflare.com)

```bash
cloudflared tunnel login
# Abre el enlace en el navegador y autoriza
```

### 3.3 Crear el túnel

```bash
cloudflared tunnel create fintrack-api
# Guarda el ID del túnel que te muestra (algo como: abc123-...)
```

### 3.4 Crear el archivo de configuración del túnel

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Pega esto (cambia los valores):
```yaml
tunnel: TU_TUNNEL_ID_AQUI
credentials-file: /root/.cloudflared/TU_TUNNEL_ID_AQUI.json

ingress:
  - hostname: api-fintrack.tudominio.com
    service: http://localhost:8080
  - service: http_status:404
```

> Si no tienes dominio propio, usa uno gratuito de Cloudflare:  
> `api-fintrack.TU_USUARIO.workers.dev` (en el dashboard de Cloudflare)

### 3.5 Apuntar el DNS (en Cloudflare Dashboard)

```bash
cloudflared tunnel route dns fintrack-api api-fintrack.tudominio.com
```

### 3.6 Iniciar el túnel

```bash
# Modo temporal (para probar)
cloudflared tunnel run fintrack-api

# Modo permanente (como servicio)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## PASO 4 — Conectar el frontend con el backend

Ahora que tienes tu URL pública (ej. `https://api-fintrack.tudominio.com`),  
edita `docs/index.html` — busca esta línea:

```javascript
static BASE = window.FINTRACK_API_URL || 'http://localhost:8080/api';
```

Cámbiala por tu URL real:

```javascript
static BASE = 'https://api-fintrack.tudominio.com/api';
```

Luego haz commit y push:

```bash
git add docs/index.html
git commit -m "feat: apuntar frontend al backend de producción"
git push
```

GitHub Pages se actualiza automáticamente en ~1 minuto.

---

## PASO 5 — Actualizar el backend cuando hay cambios

Cada vez que hagas cambios al código PHP:

```bash
# En tu ThinkPad, dentro de FinTrack/backend/
git pull
docker compose restart php
```

No necesitas reconstruir la imagen a menos que cambies el `Dockerfile`.

---

## Credenciales demo

| Campo | Valor |
|-------|-------|
| Correo | admin@fintrack.mx |
| Contraseña | fintrack123 |

Para generar un hash nuevo si cambias la contraseña:
```bash
docker compose exec php php -r "echo password_hash('TU_PASSWORD', PASSWORD_BCRYPT);"
```

---

## Comandos útiles Docker

```bash
# Ver estado de los contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f php
docker compose logs -f mysql

# Entrar al contenedor PHP
docker compose exec php bash

# Entrar a MySQL
docker compose exec mysql mysql -u fintrack_user -pfintrack_pass_2026 fintrack

# Parar todo
docker compose down

# Parar y borrar datos (¡cuidado! borra la BD)
docker compose down -v
```

---

## Resolución de problemas

**Error CORS en el navegador**  
→ Asegúrate de que el `FINTRACK_API_URL` en `docs/index.html` empiece con `https://` y coincida exactamente con el hostname del túnel.

**Sesión no persiste entre peticiones**  
→ Las cookies cross-origin requieren `SameSite=None; Secure`. Revisa que el túnel tenga HTTPS activo. El middleware `Session.php` ya está configurado para esto.

**El contenedor PHP no conecta a MySQL**  
→ Espera ~30 segundos después del `docker compose up` para que MySQL termine de inicializarse. El healthcheck del compose lo maneja automáticamente.

**Cambios en el repo no se reflejan**  
→ En el ThinkPad: `git pull && docker compose restart php`
