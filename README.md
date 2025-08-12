# Sistema de Procesamiento de Colas

Un sistema robusto y escalable para el procesamiento de tareas en colas utilizando Node.js, TypeScript, Redis y PostgreSQL.

## 🚀 Características

- **Múltiples tipos de colas**: Email, procesamiento de imágenes, archivos, exportación de datos, integración API y limpieza
- **Procesamiento concurrente**: Configurable por tipo de tarea
- **Reintentos automáticos**: Con estrategias de backoff exponencial y fijo
- **Monitoreo en tiempo real**: Métricas y estadísticas del sistema
- **API REST**: Para gestionar tareas y obtener estadísticas
- **Persistencia**: Almacenamiento de resultados en PostgreSQL
- **Logging avanzado**: Sistema de logs estructurado con Winston
- **Contenedorización**: Soporte completo para Docker

## 📋 Requisitos

- Node.js 18+
- TypeScript 5+
- Redis 7+
- PostgreSQL 15+
- Docker y Docker Compose (opcional)

## 🛠️ Instalación

### Con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone <repository-url>
cd queue-processor-system

# Construir y ejecutar con Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Instalación Manual

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Configurar las variables en .env
# Asegúrate de tener Redis y PostgreSQL ejecutándose

# Construir el proyecto
npm run build

# Ejecutar migraciones de base de datos
# (Crear la base de datos manualmente primero)

# Iniciar el servidor
npm start
```

## 🔧 Configuración

### Variables de Entorno

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=queue_system
DB_USER=postgres
DB_PASSWORD=password

# Aplicación
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Colas
MAX_CONCURRENT_JOBS=5
MAX_RETRIES=3
RETRY_DELAY=5000
```

## 🚦 Uso

### Iniciar los Servicios

```bash
# Servidor API principal
npm run dev

# Worker independiente (en otra terminal)
npm run worker

# Monitor del sistema (en otra terminal)
npm run monitor

# Productor de tareas de ejemplo (en otra terminal)
npm run producer
```

### API Endpoints

#### Crear una tarea
```bash
POST /tasks
Content-Type: application/json

{
  "type": "email_notification",
  "priority": 10,
  "data": {
    "to": ["user@example.com"],
    "subject": "Test Email",
    "body": "This is a test email"
  }
}
```

#### Consultar estado de una tarea
```bash
GET /tasks/{taskId}
```

#### Obtener estadísticas de colas
```bash
GET /stats/queues
```

#### Obtener métricas del sistema
```bash
GET /stats/system
```

#### Pausar una cola
```bash
POST /admin/queues/{taskType}/pause
```

#### Reanudar una cola
```bash
POST /admin/queues/{taskType}/resume
```

#### Reintentar tareas fallidas
```bash
POST /admin/retry-failed
{
  "taskType": "email_notification" // opcional
}
```

#### Crear tareas de ejemplo
```bash
POST /demo/create-sample-tasks
```

## 📝 Tipos de Tareas

### 1. Notificación por Email
```json
{
  "type": "email_notification",
  "data": {
    "to": ["recipient@example.com"],
    "subject": "Subject line",
    "body": "Email content",
    "template": "welcome",
    "attachments": ["file1.pdf"]
  }
}
```

### 2. Procesamiento de Imágenes
```json
{
  "type": "image_processing",
  "data": {
    "imagePath": "/uploads/image.jpg",
    "operations": [
      {"type": "resize", "params": {"width": 300, "height": 300}},
      {"type": "compress", "params": {"quality": 0.8}}
    ],
    "outputPath": "/processed/image-thumb.jpg"
  }
}
```

### 3. Procesamiento de Archivos
```json
{
  "type": "file_processing",
  "data": {
    "filePath": "/data/file.csv",
    "operation": "parse",
    "params": {"format": "csv"}
  }
}
```

### 4. Exportación de Datos
```json
{
  "type": "data_export",
  "data": {
    "query": "SELECT * FROM users WHERE active = true",
    "format": "csv",
    "destination": "/exports/users.csv"
  }
}
```

### 5. Integración API
```json
{
  "type": "api_integration",
  "data": {
    "endpoint": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {"Authorization": "Bearer token"},
    "payload": {"action": "sync"}
  }
}
```

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │    │     Worker      │    │     Monitor     │
│                 │    │                 │    │                 │
│  - REST API     │    │  - Task Proc.   │    │  - Metrics      │
│  - Task Creation│    │  - Queue Listen │    │  - Health Check │
│  - Status Query │    │  - Error Handle │    │  - Alerts       │
└─────────┬───────┘    └─────────┬───────┘    └─────────────────┘
          │                      │                       
          │                      │                       
          └─────────┬────────────┘                       
                    │                                    
         ┌─────────────────┐                            
         │   Queue Manager │                            
         │                 │                            
         │  - Bull Queues  │                            
         │  - Task Routing │                            
         │  - Retry Logic  │                            
         └─────────┬───────┘                            
                   │                                    
    ┌──────────────┼──────────────┐                    
    │              │              │                    
┌───▼───┐    ┌─────▼─────┐    ┌───▼────┐               
│ Redis │    │PostgreSQL │    │ Logger │               
│       │    │           │    │        │               
│Queues │    │ Results   │    │ Files  │               
│States │    │ Metrics   │    │ Console│               
└───────┘    └───────────┘    └────────┘               
```

## 🔍 Monitoreo

El sistema incluye un monitor en tiempo real que muestra:

- **Métricas generales**: Total de tareas, completadas, fallidas, pendientes
- **Estadísticas por cola**: Estado actual de cada tipo de cola
- **Indicadores de rendimiento**: Tiempo promedio, throughput, tasa de éxito
- **Indicadores de salud**: Estado general del sistema

### Ejecutar el Monitor
```bash
npm run monitor
```

## 📊 Logging

Los logs se almacenan en:
- `logs/error.log` - Solo errores
- `logs/combined.log` - Todos los logs
- Consola (en desarrollo)

Niveles de log: `error`, `warn`, `info`, `debug`

## 🔧 Configuración Avanzada

### Configurar Colas Personalizadas

Edita `src/config/index.ts` para ajustar:
- Concurrencia por tipo de tarea
- Estrategias de reintento
- Prioridades
- Delays de backoff

### Agregar Nuevos Tipos de Tarea

1. Agrega el tipo en `src/types/index.ts`
2. Configura la cola en `src/config/index.ts`
3. Implementa el procesador en `src/queue/TaskProcessor.ts`

## 🚀 Despliegue en Producción

### Con Docker Compose
```bash
# Configurar para producción
cp .env.example .env.production

# Editar variables de producción
nano .env.production

# Desplegar
docker-compose -f docker-compose.prod.yml up -d
```

### Consideraciones de Producción

- **Escalabilidad**: Ejecuta múltiples workers en diferentes servidores
- **Monitoreo**: Configura alertas basadas en métricas
- **Backup**: Implementa respaldo de Redis y PostgreSQL
- **SSL**: Configura HTTPS para la API
- **Rate Limiting**: Implementa límites de velocidad en la API

## 🧪 Testing

```bash
# Ejecutar tests unitarios
npm test

# Tests de integración
npm run test:integration

# Cobertura
npm run test:coverage
```

## 🛡️ Manejo de Errores

El sistema implementa:
- **Reintentos automáticos** con backoff exponencial
- **Dead Letter Queues** para tareas que fallan repetidamente
- **Circuit Breakers** para servicios externos
- **Logging detallado** de errores y excepciones
- **Graceful Shutdown** para cerrar conexiones limpiamente

## 📈 Optimización de Rendimiento

### Tuning de Redis
```bash
# En redis.conf
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

### Tuning de PostgreSQL
```sql
-- Ajustar según tu hardware
shared_buffers = '256MB'
effective_cache_size = '1GB'
work_mem = '4MB'
```

### Optimización de Workers
- Ajusta `concurrency` según CPU disponible
- Monitor el uso de memoria por worker
- Implementa health checks regulares

## 🔒 Seguridad

- **Autenticación**: Implementa JWT tokens para la API
- **Autorización**: Control de acceso basado en roles
- **Validación**: Sanitización de inputs y validación de esquemas
- **Rate Limiting**: Prevención de abuso de API
- **Encryption**: Cifrado de datos sensibles en colas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para detalles.

## 🆘 Soporte

- **Documentación**: Consulta este README y los comentarios en el código
- **Issues**: Reporta bugs o solicita features en GitHub Issues
- **Logs**: Revisa los logs del sistema para debugging
- **Monitoring**: Usa el monitor del sistema para diagnósticos

## 🔄 Roadmap

- [ ] Dashboard web para monitoreo
- [ ] Soporte para colas prioritarias avanzadas
- [ ] Integración con sistemas de alertas
- [ ] API GraphQL
- [ ] Soporte para tareas programadas (cron)
- [ ] Clustering automático de workers
- [ ] Métricas de Prometheus/Grafana