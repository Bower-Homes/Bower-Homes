# CLAUDE.md — Bower Homes
> Este archivo es el briefing completo del proyecto. Léelo en su totalidad antes de escribir cualquier línea de código.

---

## 1. Identidad de la empresa

| Campo | Valor |
|---|---|
| Nombre oficial | Bower Homes |
| Industria | Construcción e inversión inmobiliaria |
| Ubicación | Florida, Estados Unidos |
| Email | freddy@bowerhomesfl.com |
| WhatsApp | +1 (201) 210-9949 |
| Redes sociales | No tienen |

**Propuesta de valor:** Bower Homes desarrolla Single Family Homes en Florida con transparencia, experiencia y rentabilidad comprobada. En cada proyecto, Bower invierte su propio capital, alineando intereses con sus inversionistas.

**Tagline principal:** *"Construimos tu futuro en Florida"*

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Astro |
| Estilos | Tailwind CSS |
| Componentes UI | shadcn/ui |
| Hosting | Cloudflare Pages |
| Backend/API | Cloudflare Workers |
| Base de datos | Supabase (D1 para datos, Auth para login) |

**Importante:** No usar Next.js ni Vercel. El proyecto debe ser 100% compatible con Cloudflare Pages sin adaptadores experimentales.

---

## 3. Paleta de colores

### Blue (color principal)
```
--blue-50:  #f0f7ff   ← fondos muy claros
--blue-100: #dbeefe
--blue-200: #b6dcfd
--blue-300: #75bffa
--blue-400: #3899f5
--blue-500: #0f7de2
--blue-600: #0a5eb8
--blue-700: #0b4a90   ← color base de secciones oscuras
--blue-800: #0e3d70
--blue-900: #0a1f3d   ← el más oscuro, fondo principal dark
```

### Sky/Celeste (acento — reemplaza el gold de Manibe)
```
--sky-300: #7dd3fc   ← highlights, elementos decorativos
--sky-400: #38bdf8   ← botones primarios
--sky-500: #0ea5e9   ← hover states
--sky-600: #0284c7   ← pressed/active
```

### Superficies
```
--surface:     #ffffff
--surface-alt: #f0f7ff
```

**Regla de uso:**
- Fondos oscuros: `#0a1f3d` o `#0e3d70`
- Texto sobre oscuro: `#ffffff` o `#f0f7ff`
- Botones primarios: `#38bdf8` con texto `#0a1f3d`
- Secciones alternas: intercalar oscuro/claro para ritmo visual

---

## 4. Logo

- **Placeholder por ahora** — usar texto "BOWER HOMES" estilizado hasta tener logo oficial
- Composición futura: wordmark "BOWER HOMES" en bold mayúsculas
- Uso sobre fondos oscuros: versión blanca
- Uso sobre fondos claros: versión en azul `#0a1f3d`
- **NUNCA distorsionar ni cambiar proporciones del logo**

---

## 5. Tipografía recomendada

- **Headings:** Playfair Display o Cormorant Garamond (elegante, premium, serif)
- **Body:** Inter o DM Sans (limpio, legible, moderno)
- Importar desde Google Fonts

---

## 6. Los 3 modelos de negocio

### Producto 1 — Inversión Colectiva Premium
- **ROI:** 12% – 20% anual
- **Plazo:** ~6 meses promedio
- **Descripción:** Grupo reducido de inversionistas aportan capital para construir una Single Family Home. Bower invierte mínimo el 20% (generalmente el lote) y gestiona integralmente el proyecto.
- **Perfil:** Inversionista que busca alta rentabilidad y acepta variabilidad.

### Producto 2 — Rentabilidad Fija Garantizada
- **ROI:** 14% anual fijo
- **Plazo:** 12 meses
- **Descripción:** Múltiples inversionistas aportan capital. La rentabilidad es fija y no depende de que se venda la propiedad. Mayor previsibilidad y seguridad en los flujos.
- **Perfil:** Inversionista conservador que busca estabilidad y claridad.

### Producto 3 — Construye tu Casa
- **ROI:** Personalizado
- **Plazo:** A medida
- **Descripción:** Para un único cliente que desea construir su propia propiedad en Florida. Bower acompaña desde la compra del lote hasta la entrega de llaves.
- **Perfil:** Cliente final que quiere su casa en EE.UU. con gestión experta.

---

## 7. Portafolio de modelos de casas

Mismo portafolio de referencia que Manibe (ajustar nombres si Bower tiene los suyos):

### Modelo 1
- **Habitaciones:** 3 | **Baños:** 3 | **Extras:** Oficina, acabados modernos

### Modelo 2
- **Habitaciones:** 3 | **Baños:** 2 | **Extras:** Lanai amplio, 3 garajes

### Modelo 3
- **Habitaciones:** 3 | **Baños:** 2 | **Extras:** Luz natural, ubicación premium

> **Nota:** Confirmar nombres de modelos y agregar imágenes reales cuando estén disponibles.

---

## 8. Datos de mercado (sección "Por qué Florida")

- **22M+** habitantes en Florida, creciendo cada año
- **340+** días de sol al año en promedio
- **0%** impuesto estatal sobre la renta personal
- **#1** estado destino de migración en EE.UU.
- Más de 1,000 nuevos residentes por día
- Demanda de viviendas supera consistentemente la oferta

---

## 9. Estructura de la landing page

> **IMPORTANTE:** La estructura es diferente a Manibe Homes intencionalmente para que no parezca una copia.

### Navbar
- Logo/wordmark Bower (izquierda)
- Links: Inicio | Nosotros | Modelos | Invierte | Contacto
- Botón destacado: **"Acceder al Portal"** → sky blue (`#38bdf8`), link placeholder `/portal`
- Navbar transparente sobre hero, sólido (`#0a1f3d`) al hacer scroll

### Sección 1 — Hero (Split 50/50)
- Layout: **dos columnas** — texto a la izquierda, imagen de casa a la derecha
- NO video de fondo, imagen estática de alta calidad
- Headline: *"Construimos tu futuro en Florida"*
- Subheadline: *"Desarrollo inmobiliario de alto valor con transparencia, experiencia y rentabilidad comprobada."*
- CTA primario: "Conoce nuestros modelos" → ancla a #modelos
- CTA secundario: "Invierte con nosotros" → ancla a #productos

### Sección 2 — Stats de Florida (Franja horizontal)
- NO cards separadas — usar una **franja horizontal** con 4 números grandes centrados
- Fondo degradado azul oscuro a celeste
- Números enormes con label debajo: `22M+` / `340+` / `0%` / `#1`
- Sin título de sección extenso — solo los datos impactan visualmente

### Sección 3 — Nosotros (Texto + imagen lateral)
- Breve historia y propuesta de valor de Bower
- Layout: imagen a la izquierda, texto a la derecha
- Fondo blanco / muy claro

### Sección 4 — Productos de inversión (Tabs o accordion)
- NO 3 cards iguales — usar **tabs horizontales** (Producto 1 / Producto 2 / Producto 3)
- Al seleccionar un tab se despliega el detalle del producto
- Fondo azul oscuro (`#0a1f3d`) con texto claro
- Acento celeste en el tab activo

### Sección 5 — Modelos de casas (Slider/Carousel)
- NO grid de cards — usar un **carousel horizontal** con flechas de navegación
- Una casa a la vez (o 2 visibles en desktop)
- Cada slide: imagen grande | nombre | habitaciones | baños | extras | botón

### Sección 6 — Por qué elegirnos
- 4 pilares en layout **2x2** (grid) en vez de fila horizontal
- Íconos grandes + título + descripción
- Fondo `#f0f7ff` (azul muy claro)

### Sección 7 — Testimonios (Cita grande centrada)
- NO cards — usar un **slider de cita grande** con comillas decorativas enormes
- Una cita a la vez, centrada, tipografía grande
- Nombre + país debajo con separador

### Sección 8 — Contacto
- Layout: **formulario a la derecha, mapa/imagen + info a la izquierda**
- Info: 📧 freddy@bowerhomesfl.com | 📱 +1 (201) 210-9949
- Botón WhatsApp directo: `https://wa.me/12012109949`
- Fondo blanco limpio

### Footer
- Wordmark/Logo Bower
- 2 columnas: Navegación | Contacto (sin redes sociales)
- WhatsApp: +1 (201) 210-9949
- Email: freddy@bowerhomesfl.com
- Copyright: © 2025 Bower Homes. Todos los derechos reservados.
- Fondo: `#0a1f3d`

---

## 10. Estilo visual general

- **Mood:** Premium, confiable, moderno, aspiracional — pero más fresco que Manibe
- **Diferenciador visual:** Azules profundos + celestes vibrantes vs. navy + gold de Manibe
- **NO usar:** colores cálidos (dorado, ámbar), estilos copiados de Manibe
- **SÍ usar:** Gradientes de azul a celeste, mucho espacio en blanco, tipografía elegante
- **Animaciones:** Suaves al hacer scroll (fade in, slide up) — nada exagerado
- **Imágenes:** Alta calidad, casas reales de Florida (Unsplash/Pexels)
- **Responsive:** Mobile-first, perfectamente adaptado a todos los tamaños
- **Bordes:** Sutiles, `border-radius` moderado (8-12px para cards)

---

## 11. Referencia de proyecto similar

Este proyecto es una versión adaptada de Manibe Homes (mismo stack, mismos textos base).
Código de referencia en: `f:\Proyectos\Manibe Homes\Public\src\`

Componentes a tomar como base estructural (adaptar estilos y layout):
- `src/components/Navbar.astro`
- `src/components/HeroSection.astro`
- `src/components/WhyFlorida.astro`
- `src/components/InvestmentProducts.astro`
- `src/components/HouseModels.astro`
- `src/components/ContactSection.astro`
- `src/i18n/translations.ts`

---

## 12. Comandos útiles del proyecto

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Deploy a Cloudflare Pages
npx wrangler pages deploy dist
```

---

## 13. Notas importantes para Claude Code

1. **Solo landing page en esta fase.** El portal es fase 2.
2. La estructura de secciones es **diferente a Manibe** — respetar el diseño definido arriba.
3. Paleta azul/celeste — NO usar gold ni colores cálidos.
4. Logo placeholder hasta tener el oficial — usar wordmark de texto.
5. Sin redes sociales en footer ni ningún otro lugar.
6. El formulario de contacto puede abrir WhatsApp por ahora.
7. Cada sección debe tener su propio `id` para que los links del navbar funcionen.
8. El botón "Acceder al Portal" debe ser sky blue (`#38bdf8`) con borde redondeado.
