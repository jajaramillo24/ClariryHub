<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ClarityHub - AI-Powered Project Management

ClarityHub es una aplicación de gestión de proyectos potenciada por IA que te ayuda a organizar ideas, analizar requisitos no funcionales, y generar tarjetas de proyecto detalladas.

## Características

- 🧠 **Free Jam Session**: Captura y organiza ideas libremente
- � **Análisis de Documentos**: Soporta múltiples formatos de archivo
  - 📄 Word Documents (.doc, .docx)
  - 📊 Excel Spreadsheets (.xls, .xlsx)
  - 🖼️ Imágenes (png, jpg, etc.)
  - 📝 PDFs y archivos de texto
  - 🎵 Archivos de audio
- �🛡️ **Análisis de NFRs**: Define y analiza requisitos no funcionales
- 📋 **Generación de Tarjetas**: Crea tarjetas de proyecto detalladas con estimaciones
- 📊 **Exportación a Jira**: Exporta historias y subtareas en formato CSV optimizado para Jira
  - ✅ Incluye subtareas como issues separadas
  - ✅ Prioridad automática basada en story points
  - ✅ Campos estándar de Jira (Summary, Description, Issue Type, Priority, Labels, Parent ID)
  - ✅ Mapeo automático de relaciones padre-hijo para subtareas

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

## Exportación a Jira

ClarityHub incluye una funcionalidad completa de exportación a Jira que permite:

1. **Exportar historias de usuario** con todos sus campos estándar
2. **Incluir subtareas automáticamente** como issues separadas vinculadas
3. **Configurar columnas** según las necesidades de tu proyecto
4. **Preview en tiempo real** de cómo se verá en Jira

### Características de Exportación:

- **Subtareas inteligentes**: Cada subtarea se exporta como un "Sub-task" en Jira con referencia a su historia padre
- **Prioridad automática**: Se calcula basándose en story points (High: >13, Medium: 6-13, Low: ≤5)
- **Tipos de subtareas**: Backend, Frontend, Testing, DevOps, Docs
- **Campos personalizables**: Activa/desactiva columnas según tu configuración de Jira
- **Múltiples delimitadores**: Soporta coma (`,`) y punto y coma (`;`)

Para más detalles sobre cómo importar el CSV en Jira, consulta [JIRA_EXPORT_GUIDE.md](./JIRA_EXPORT_GUIDE.md)

**Nota**: El comando `npm run deploy` requiere que tengas el secret configurado localmente en tu archivo `.env`.
