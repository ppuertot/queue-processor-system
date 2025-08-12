.DEFAULT_GOAL := help

help: ## Mostrar ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias
	npm install

build: ## Construir el proyecto
	npm run build

dev: ## Iniciar en modo desarrollo
	npm run dev

worker: ## Iniciar worker
	npm run worker

monitor: ## Iniciar monitor del sistema
	npm run monitor

producer: ## Iniciar productor de tareas
	npm run producer

docker-up: ## Iniciar servicios con Docker
	docker-compose up -d

docker-down: ## Detener servicios Docker
	docker-compose down

docker-logs: ## Ver logs de los servicios
	docker-compose logs -f

docker-build: ## Construir imagen Docker
	docker-compose build

docker-prod: ## Iniciar en modo producción
	docker-compose -f docker-compose.prod.yml up -d

docker-prod-down: ## Detener modo producción
	docker-compose -f docker-compose.prod.yml down

start-all: docker-up ## Iniciar todos los servicios
	@echo "Sistema iniciado! Accede a http://localhost:3000/health"

stop-all: docker-down ## Detener todos los servicios

start-monitor: ## Iniciar monitor con Docker
	docker-compose --profile monitor up -d monitor

start-demo: ## Iniciar demo con productor
	docker-compose --profile demo up -d producer

demo: ## Crear tareas de demostración
	curl -X POST http://localhost:3000/api/demo/create-sample-tasks -H "Content-Type: application/json" -d '{}'

stats: ## Mostrar estadísticas del sistema
	curl -s http://localhost:3000/api/stats/system | jq

queue-stats: ## Mostrar estadísticas de colas
	curl -s http://localhost:3000/api/stats/queues | jq

health: ## Verificar salud del sistema
	curl -s http://localhost:3000/health | jq

clean: ## Limpiar volúmenes Docker
	docker-compose down -v
	docker system prune -f

reset: clean docker-build start-all ## Reiniciar completamente el sistema

.PHONY: help install build dev worker monitor producer docker-up docker-down start-all stop-all demo stats
