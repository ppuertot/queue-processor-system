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

start-all: docker-up ## Iniciar todos los servicios
	@echo "Sistema iniciado! Accede a http://localhost:3000/health"

stop-all: docker-down ## Detener todos los servicios

demo: ## Crear tareas de demostración
	curl -X POST http://localhost:3000/demo/create-sample-tasks -H "Content-Type: application/json" -d '{}'

stats: ## Mostrar estadísticas del sistema
	curl -s http://localhost:3000/stats/system

.PHONY: help install build dev worker monitor producer docker-up docker-down start-all stop-all demo stats
