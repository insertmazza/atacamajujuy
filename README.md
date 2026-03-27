# Puna de Atacama S.R.L. - Landing Page

Landing page premium para empresa de transporte corporativo y minero en San Salvador de Jujuy, Argentina.

## 🎨 Características de Diseño

### Estética Industrial-Premium
- **Paleta de colores**: Grises asfalto profundos con acentos cobre/terracota inspirados en la geografía de la Puna
- **Tipografía**: Outfit (display) + DM Sans (body) para un look moderno y profesional
- **Efectos visuales**: 
  - Gradientes minerales sutiles
  - Grain texture overlay para textura premium
  - Animaciones de scroll con Intersection Observer
  - Efectos hover sofisticados en cards y botones
  - Diagonal accent lines que evocan rutas de montaña

### Secciones
1. **Hero Section**: Título impactante con estadísticas animadas
2. **Sobre Nosotros**: Historia y certificaciones con layout asimétrico
3. **Servicios**: Grid de cards con efectos 3D hover
4. **Por qué Elegirnos**: Iconos destacados con valores diferenciales
5. **Contacto**: Formulario estilizado + información de contacto
6. **Footer**: Links y redes sociales

## 🏗️ Stack Tecnológico

### Frontend
- **HTML5 semántico**
- **Tailwind CSS** (vía CDN)
- **Vanilla JavaScript** (ES6+)
- **Google Fonts**: Outfit + DM Sans
- **Font Awesome**: Iconografía

### Backend (To-Do)
- **Supabase**: PostgreSQL, Auth, Storage
- **Cloudflare Pages/Workers**: Hosting + CDN + Edge Functions

## 📁 Estructura del Proyecto

```
puna-de-atacama/
├── index.html              # Landing page principal
├── README.md              # Este archivo
├── .env.example           # Variables de entorno (crear)
└── functions/             # Cloudflare Workers (crear)
    └── contact-submit.js  # Endpoint para formulario
```

## 🚀 Instalación y Configuración

### 1. Configuración Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/puna-de-atacama.git
cd puna-de-atacama

# Abrir en navegador
# Simplemente abre index.html en tu navegador favorito
# No requiere compilación para desarrollo local
```

### 2. Configuración de Supabase

#### 2.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Copia tu `SUPABASE_URL` y `SUPABASE_ANON_KEY` desde Settings > API

#### 2.2 Crear Tabla de Leads

Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Crear tabla para almacenar los leads de contacto
CREATE TABLE contact_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  notes TEXT
);

-- Crear índices para búsquedas rápidas
CREATE INDEX idx_contact_leads_email ON contact_leads(email);
CREATE INDEX idx_contact_leads_created_at ON contact_leads(created_at DESC);
CREATE INDEX idx_contact_leads_status ON contact_leads(status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserts desde el frontend (anon key)
CREATE POLICY "Allow public insert on contact_leads"
  ON contact_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para permitir lectura solo a usuarios autenticados
CREATE POLICY "Allow authenticated read on contact_leads"
  ON contact_leads
  FOR SELECT
  TO authenticated
  USING (true);
```

#### 2.3 Configurar Email Notifications (Opcional)

Para recibir emails cuando llega un nuevo lead:

```sql
-- Crear función para enviar notificación
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Aquí puedes integrar con un servicio de email
  -- Por ejemplo, usando Supabase Edge Functions o Resend API
  PERFORM pg_notify('new_lead', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER on_lead_created
  AFTER INSERT ON contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();
```

### 3. Integración de Supabase en el Frontend

#### 3.1 Opción A: Cliente Directo (Más Simple)

Reemplaza el bloque de código de formulario en `index.html` con:

```html
<!-- Agregar antes del cierre de </body> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // Inicializar Supabase
  const supabaseUrl = 'TU_SUPABASE_URL';
  const supabaseKey = 'TU_SUPABASE_ANON_KEY';
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  
  // Modificar el handler del formulario
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('name').value,
      company: document.getElementById('company').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      service: document.getElementById('service').value,
      message: document.getElementById('message').value,
      timestamp: new Date().toISOString()
    };
    
    const submitButton = contactForm.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
    submitButton.disabled = true;
    
    try {
      const { data, error } = await supabase
        .from('contact_leads')
        .insert([formData]);
      
      if (error) throw error;
      
      formMessage.className = 'mt-4 p-4 rounded bg-green-900/50 border border-green-500 text-green-200';
      formMessage.textContent = '¡Gracias! Hemos recibido su solicitud.';
      formMessage.classList.remove('hidden');
      contactForm.reset();
      
    } catch (error) {
      formMessage.className = 'mt-4 p-4 rounded bg-red-900/50 border border-red-500 text-red-200';
      formMessage.textContent = 'Error al enviar. Intente nuevamente.';
      formMessage.classList.remove('hidden');
      console.error('Error:', error);
    } finally {
      submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar Solicitud';
      submitButton.disabled = false;
    }
  });
</script>
```

#### 3.2 Opción B: Cloudflare Worker (Más Seguro - Recomendado)

Crea `functions/contact-submit.js`:

```javascript
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const formData = await request.json();
    
    // Validación básica
    if (!formData.name || !formData.email || !formData.company) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Insertar en Supabase
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/contact_leads`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al guardar lead');
    }
    
    // Opcional: Enviar email de notificación usando Resend o similar
    // await sendEmailNotification(formData);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

Y actualiza el frontend para llamar a este endpoint:

```javascript
const response = await fetch('/functions/contact-submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});

const result = await response.json();
if (!response.ok) throw new Error(result.error);
```

## 🌐 Despliegue en Cloudflare Pages

### 1. Via GitHub (Recomendado)

```bash
# Inicializar git
git init
git add .
git commit -m "Initial commit"

# Crear repo en GitHub y subir
git remote add origin https://github.com/tu-usuario/puna-de-atacama.git
git push -u origin main
```

Luego en Cloudflare Dashboard:

1. **Pages** → **Create a project** → **Connect to Git**
2. Selecciona el repositorio
3. **Build settings**:
   - Framework preset: `None`
   - Build command: (dejar vacío)
   - Build output directory: `/`
4. **Environment variables**:
   ```
   SUPABASE_URL = tu_url
   SUPABASE_KEY = tu_key
   ```
5. **Deploy**

### 2. Via Wrangler CLI

```bash
# Instalar Wrangler
npm install -g wrangler

# Login a Cloudflare
wrangler login

# Deploy
wrangler pages publish . --project-name=puna-de-atacama
```

## 🔒 Seguridad

### Variables de Entorno

Crea `.env.local` (nunca commitear):

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_key_solo_backend
```

### Configurar en Cloudflare Pages

Dashboard → Pages → Tu Proyecto → Settings → Environment Variables

### Rate Limiting

Agrega rate limiting en Cloudflare Worker:

```javascript
// En functions/contact-submit.js
const RATE_LIMIT = 5; // requests per minute
const cache = await caches.open('rate-limit');
const key = new Request(`https://rate-limit/${request.headers.get('CF-Connecting-IP')}`);
const cached = await cache.match(key);

if (cached) {
  const count = parseInt(await cached.text());
  if (count >= RATE_LIMIT) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  await cache.put(key, new Response(count + 1), { expirationTtl: 60 });
} else {
  await cache.put(key, new Response('1'), { expirationTtl: 60 });
}
```

## 📊 Analytics y Monitoreo

### Cloudflare Web Analytics

Agrega antes del cierre de `</body>`:

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "tu-token"}'></script>
```

### Google Analytics 4 (Opcional)

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🎯 Próximos Pasos

### Features Recomendados

1. **Sistema de Autenticación**: Dashboard admin para ver leads
2. **Email Automation**: Confirmación automática al cliente + notificación interna
3. **Chatbot**: WhatsApp Business API o Crisp
4. **Galería de Flota**: Sección con imágenes de vehículos
5. **Testimonios**: Sistema de reviews de clientes
6. **Blog/Noticias**: Para SEO y contenido
7. **Multi-idioma**: Español + Inglés (muchas mineras son multinacionales)

### Optimizaciones

1. **Imágenes**: Usar Cloudflare Images para optimización automática
2. **Critical CSS**: Inline para faster FCP
3. **Service Worker**: PWA para offline support
4. **CDN**: Configurar Cloudflare caching rules
5. **SEO**: Meta tags, Schema.org, sitemap.xml

## 📞 Soporte

Para consultas técnicas o modificaciones:
- Email: punadeatacama@gmail.com
- Teléfono: +54 388 155 718 528

## 📄 Licencia

Propiedad de Puna de Atacama S.R.L. - Todos los derechos reservados.

---

**Desarrollado con**: HTML5, CSS3, JavaScript ES6+, Tailwind CSS
**Diseñado para**: Máxima conversión, experiencia premium, mobile-first
**Stack Backend**: Supabase + Cloudflare Pages/Workers
