<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ClarityHub - AI-Powered Project Management

ClarityHub es una aplicación de gestión de proyectos potenciada por IA que te ayuda a organizar ideas, analizar requisitos no funcionales, y generar tarjetas de proyecto detalladas.

## Características

- 🧠 **Free Jam Session**: Captura y organiza ideas libremente
- 🛡️ **Análisis de NFRs**: Define y analiza requisitos no funcionales
- 📋 **Generación de Tarjetas**: Crea tarjetas de proyecto detalladas con estimaciones
- 📊 **Exportación a CSV**: Exporta tus tarjetas para usar en Jira u otras herramientas

## Tecnología

- **Frontend**: React + TypeScript + Vite
- **IA**: Bedrock (Claude) via API personalizada
- **Estilo**: Tailwind CSS

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Luego edita `.env` y actualiza `VITE_API_KEY` con tu API key

3. Run the app:
   ```bash
   npm run dev
   ```

## Configuración de la API

La aplicación está configurada para usar AWS Bedrock a través de un endpoint personalizado:
- **URL**: `https://chat.jazusoft.com/v1/chat/completions`
- **Modelo**: `clarityhub`
- **API Key**: Configurada mediante variable de entorno `VITE_API_KEY`

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:
```env
VITE_API_KEY=tu-api-key-aqui
```

## Despliegue en GitHub Pages

El proyecto se despliega automáticamente en GitHub Pages cuando haces push a la rama `main`.

### Configurar el Secret en GitHub:

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**
4. Nombre: `API_KEY`
5. Value: Tu API key de Bedrock (por ejemplo: `sk-6d8a39916ad44f09b4939abd2634cf26`)
6. Haz clic en **Add secret**

El workflow de GitHub Actions (`.github/workflows/deploy.yml`) usa este secret como `VITE_API_KEY` durante el build, por lo que la aplicación desplegada tendrá acceso a la API key sin exponerla en el código.

### Desplegar Manualmente:

También puedes desplegar manualmente con:
```bash
npm run deploy
```

**Nota**: El comando `npm run deploy` requiere que tengas el secret configurado localmente en tu archivo `.env`.
