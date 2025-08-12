# CLAUDE.md - Sistema de Procesamiento de Colas

## 📋 Información del Proyecto

**Nombre**: Queue Processor System  
**Versión**: 1.0.0  
**Descripción**: Sistema robusto y escalable para el procesamiento de tareas en colas utilizando Node.js, TypeScript, Redis y PostgreSQL.

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Backend**: Node.js 18+ con TypeScript 5+
- **Base de Datos**: PostgreSQL 15+
- **Cache/Colas**: Redis 7+ con Bull.js
- **Contenedores**: Docker y Docker Compose
- **Logging**: Winston con rotación de archivos

### Estructura del Proyecto
```
src/
├── api/           # Servidor REST API con Express
├── config/        # Configuración del sistema
├── database/      # Conexiones y modelos de PostgreSQL
├── queue/         # Gestión de colas Redis y procesadores
├── services/      # Servicios principales (Worker, Monitor, Producer)
├── types/         # Definiciones TypeScript
└── utils/         # Utilidades (logger, helpers)
```

## 🚀 Comandos de Desarrollo

### Instalación y Setup
```bash
npm install                    # Instalar dependencias
cp .env.example .env          # Configurar variables de entorno
npm run build                 # Compilar TypeScript
```

### Desarrollo Local
```bash
npm run dev                   # Servidor API en modo desarrollo
npm run worker                # Worker de procesamiento
npm run monitor               # Monitor del sistema en tiempo real
npm run producer              # Productor de tareas de prueba
```

### Docker (Recomendado)
```bash
make start-all                # Iniciar todo el sistema
make demo                     # Crear tareas de ejemplo
make stats                    # Ver estadísticas del sistema
make docker-logs              # Ver logs en tiempo real
make stop-all                 # Detener todos los servicios
```

### Comandos de Gestión
```bash
make start-monitor            # Iniciar solo el monitor
make start-demo               # Iniciar productor de tareas
make docker-prod              # Modo producción
make clean                    # Limpiar volúmenes Docker
make reset                    # Reinicio completo del sistema
```

## 📊 Tipos de Tareas Soportadas

### 1. Email Notification (`email_notification`)
```json
{
  "type": "email_notification",
  "priority": 8,
  "data": {
    "to": ["user@example.com"],
    "subject": "Welcome Email",
    "body": "Content here",
    "template": "welcome",
    "attachments": ["file.pdf"]
  }
}
```

### 2. Image Processing (`image_processing`)
```json
{
  "type": "image_processing",
  "priority": 6,
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

### 3. File Processing (`file_processing`)
```json
{
  "type": "file_processing",
  "priority": 5,
  "data": {
    "filePath": "/data/file.csv",
    "operation": "parse",
    "params": {"format": "csv"}
  }
}
```

### 4. Data Export (`data_export`)
```json
{
  "type": "data_export",
  "priority": 3,
  "data": {
    "query": "SELECT * FROM users WHERE active = true",
    "format": "csv",
    "destination": "/exports/users.csv"
  }
}
```

### 5. API Integration (`api_integration`)
```json
{
  "type": "api_integration",
  "priority": 7,
  "data": {
    "endpoint": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {"Authorization": "Bearer token"},
    "payload": {"action": "sync"}
  }
}
```

### 6. Cleanup Tasks (`cleanup_tasks`)
```json
{
  "type": "cleanup_tasks",
  "priority": 2,
  "data": {
    "type": "temp_files",
    "params": {"olderThan": "7d", "path": "/tmp"}
  }
}
```

## 🔧 Configuración

### Variables de Entorno Principales
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

# Configuración de Colas
EMAIL_CONCURRENCY=3
IMAGE_CONCURRENCY=2
FILE_CONCURRENCY=3
EXPORT_CONCURRENCY=1
API_CONCURRENCY=5
CLEANUP_CONCURRENCY=1
```

### Configuración de Colas
Cada tipo de tarea tiene su propia configuración en `src/config/index.ts`:
- **Concurrencia**: Tareas simultáneas por cola
- **Reintentos**: Número máximo de reintentos
- **Backoff**: Estrategia de reintento (exponencial/fijo)
- **Limpieza**: Tareas completadas/fallidas a mantener

## 🌐 API Endpoints

### Gestión de Tareas
- `POST /api/tasks` - Crear nueva tarea
- `GET /api/tasks/{taskId}` - Obtener estado de tarea

### Estadísticas
- `GET /api/stats/system` - Métricas completas del sistema
- `GET /api/stats/queues` - Estado actual de todas las colas
- `GET /health` - Health check del sistema

### Administración
- `POST /api/admin/queues/{taskType}/pause` - Pausar cola específica
- `POST /api/admin/queues/{taskType}/resume` - Reanudar cola
- `POST /api/admin/retry-failed` - Reintentar tareas fallidas

### Demo
- `POST /api/demo/create-sample-tasks` - Crear tareas de ejemplo

## 📈 Monitoreo y Logging

### Logs del Sistema
- **Ubicación**: `logs/` directory
- **Archivos**: `error.log`, `combined.log`
- **Formato**: JSON estructurado con timestamps
- **Rotación**: Automática (10MB, 5 archivos)

### Monitor en Tiempo Real
El monitor (`npm run monitor`) muestra:
- Métricas generales (uptime, memoria, throughput)
- Estado de cada cola (waiting, active, completed, failed)
- Indicadores de salud del sistema
- Tendencias de rendimiento

### Métricas Disponibles
- **Total de tareas**: Procesadas desde el inicio
- **Tasa de éxito**: Porcentaje de tareas completadas exitosamente
- **Tiempo promedio**: Tiempo de procesamiento por tarea
- **Throughput**: Tareas procesadas por hora
- **Uso de memoria**: Heap utilizado vs total

## 🛠️ Desarrollo y Debugging

### Testing Local
```bash
# Crear tareas de prueba
curl -X POST http://localhost:3000/api/demo/create-sample-tasks

# Ver estadísticas
curl -s http://localhost:3000/api/stats/system | jq

# Verificar salud del sistema
curl -s http://localhost:3000/health | jq
```

### Logs y Debugging
```bash
# Ver logs en tiempo real
make docker-logs

# Logs específicos de un servicio
docker-compose logs -f api
docker-compose logs -f worker
```

### Base de Datos
```sql
-- Conectar a PostgreSQL
docker-compose exec postgres psql -U postgres -d queue_system

-- Ver tareas recientes
SELECT id, type, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 10;

-- Estadísticas por tipo
SELECT type, status, COUNT(*) FROM tasks GROUP BY type, status;
```

## 🚀 Despliegue en Producción

### Docker Compose Producción
```bash
# Configurar variables de producción
cp .env.example .env.production
nano .env.production

# Desplegar
make docker-prod
```

### Consideraciones de Producción
- **Escalabilidad**: Ajustar `WORKER_REPLICAS` según carga
- **Recursos**: Configurar memoria y CPU limits
- **Persistencia**: Backup de volúmenes Redis y PostgreSQL
- **Monitoreo**: Implementar alertas basadas en métricas
- **SSL**: Configurar HTTPS para la API

## 🔒 Seguridad

### Buenas Prácticas Implementadas
- Variables sensibles en archivos `.env`
- Validación de inputs en API
- Rate limiting implícito por cola
- Logs sin información sensible
- Conexiones seguras a base de datos

## 📝 Troubleshooting

### Problemas Comunes

**Error de conexión a Redis:**
```bash
# Verificar estado del contenedor
docker-compose ps redis
# Ver logs
docker-compose logs redis
```

**Error de conexión a PostgreSQL:**
```bash
# Verificar estado
docker-compose ps postgres
# Conectar manualmente
docker-compose exec postgres psql -U postgres -d queue_system
```

**Worker no procesa tareas:**
```bash
# Ver logs del worker
docker-compose logs worker
# Verificar estado de las colas
curl -s http://localhost:3000/api/stats/queues | jq
```

**Alto uso de memoria:**
```bash
# Ver métricas del sistema
curl -s http://localhost:3000/api/stats/system | jq '.memoryUsage'
# Ajustar configuración de Bull
# Configurar límites de Docker
```

## 📚 Recursos Adicionales

### Documentación de Dependencias
- [Bull.js](https://github.com/OptimalBits/bull) - Queue management
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Express](https://expressjs.com/) - Web framework
- [pg](https://node-postgres.com/) - PostgreSQL client

### Estructura de Archivos Importantes
- `src/config/index.ts` - Configuración central
- `src/types/index.ts` - Definiciones TypeScript
- `src/queue/QueueManager.ts` - Gestión de colas
- `src/queue/TaskProcessor.ts` - Procesadores de tareas
- `sql/init.sql` - Schema de base de datos

---

## 🎯 Próximos Pasos

Para extender el sistema:
1. **Nuevos tipos de tareas**: Agregar en `src/types/index.ts` y crear procesador
2. **Dashboard web**: Implementar interfaz web para monitoreo
3. **Métricas avanzadas**: Integrar Prometheus/Grafana
4. **Autenticación**: Implementar JWT para API
5. **Clustering**: Configurar múltiples instancias

---

**Estado del Proyecto**: ✅ Completamente funcional y listo para producción  
**Última actualización**: Sistema implementado según especificaciones del README