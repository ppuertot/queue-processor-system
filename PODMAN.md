# Guía de Ejecución con Podman

## 🐾 Configuración para Podman

### Prerequisitos
```bash
# Fedora/RHEL/CentOS
sudo dnf install podman podman-compose

# Ubuntu/Debian
sudo apt install podman podman-compose

# Verificar instalación
podman --version
podman-compose --version
```

### Configuración Inicial
```bash
# Configurar variables de entorno
cp .env.podman .env

# Editar configuración si es necesario
nano .env
```

## 🚀 Comandos de Ejecución

### Desarrollo Local
```bash
# Usar Makefile específico para Podman
make -f Makefile.podman start-all

# O directamente con podman-compose
podman-compose -f podman-compose.yml up -d
```

### Producción
```bash
# Modo producción con optimizaciones
make -f Makefile.podman podman-prod

# O directamente
podman-compose -f podman-compose.prod.yml up -d
```

### Comandos Útiles
```bash
# Ver estado de contenedores
make -f Makefile.podman podman-ps

# Ver logs en tiempo real
make -f Makefile.podman podman-logs

# Estadísticas del sistema
make -f Makefile.podman stats

# Crear tareas de demostración
make -f Makefile.podman demo

# Detener todos los servicios
make -f Makefile.podman stop-all

# Limpiar volúmenes y reiniciar
make -f Makefile.podman reset
```

## 🔧 Diferencias con Docker

### Configuraciones Específicas de Podman

#### 1. **Volúmenes con SELinux**
```yaml
volumes:
  - ./logs:/app/logs:Z  # :Z para compatibilidad SELinux
```

#### 2. **Usuarios y Permisos**
```yaml
userns_mode: "keep-id"
security_opt:
  - label=disable
```

#### 3. **Réplicas de Workers**
```yaml
# En lugar de scale: 2
deploy:
  replicas: 2
```

### Variables de Entorno Adicionales
```bash
# En .env.podman
PODMAN_USERNS=keep-id
PODMAN_SECURITY_OPT=label=disable
```

## 📊 Monitoreo con Podman

### Estado de Contenedores
```bash
# Ver contenedores activos
podman ps

# Ver uso de recursos
podman stats

# Información del sistema
podman system info
```

### Gestión de Volúmenes
```bash
# Listar volúmenes
podman volume ls

# Inspeccionar volumen específico
podman volume inspect queue-processor-system_postgres_data
```

### Logs y Debugging
```bash
# Logs de un servicio específico
podman-compose logs -f api

# Ejecutar comandos en contenedor
podman-compose exec api /bin/sh

# Ver estadísticas de un contenedor
podman stats queue-processor-system_api_1
```

## 🛠️ Troubleshooting

### Problemas Comunes

#### **Error de permisos con volúmenes**
```bash
# Asegurar permisos correctos
sudo chown -R $(id -u):$(id -g) ./logs
sudo chmod -R 755 ./logs

# O usar modo sin root
podman-compose --userns=keep-id up -d
```

#### **Puerto ya en uso**
```bash
# Cambiar puertos en podman-compose.yml
ports:
  - "3001:3000"  # En lugar de 3000:3000
```

#### **Problemas de red**
```bash
# Crear red personalizada
podman network create queue-network

# Usar en compose (agregar a cada servicio):
networks:
  - queue-network
```

#### **Memoria insuficiente**
```bash
# Ajustar límites en podman-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 512M
```

### Comandos de Depuración
```bash
# Ver eventos del sistema
podman events

# Inspeccionar contenedor
podman inspect queue-processor-system_api_1

# Ver configuración de red
podman network ls
podman network inspect queue-processor-system_default
```

## 🔐 Seguridad con Podman

### Ejecución sin Root (Rootless)
```bash
# Podman se ejecuta sin root por defecto
podman-compose up -d

# Verificar modo rootless
podman system info | grep -i root
```

### SELinux y Contextos
```bash
# Si hay problemas con SELinux
sudo setsebool -P container_manage_cgroup on

# Verificar contextos
ls -laZ ./logs
```

## 📈 Optimizaciones para Producción

### Configuración Recomendada
```yaml
# En podman-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

### Variables de Entorno para Producción
```bash
# En .env
NODE_ENV=production
LOG_LEVEL=warn
WORKER_REPLICAS=3
DB_PASSWORD=secure_password_here
```

## 🚀 Migración desde Docker

### Comandos Equivalentes
| Docker | Podman |
|--------|--------|
| `docker-compose up` | `podman-compose up` |
| `docker ps` | `podman ps` |
| `docker images` | `podman images` |
| `docker logs` | `podman logs` |
| `docker exec` | `podman exec` |

### Alias para Compatibilidad
```bash
# Agregar a ~/.bashrc o ~/.zshrc
alias docker=podman
alias docker-compose=podman-compose
```

---

**Estado**: ✅ Configuración completa para Podman  
**Compatibilidad**: Fedora, RHEL, CentOS, Ubuntu, Debian  
**Modo**: Rootless por defecto, mayor seguridad