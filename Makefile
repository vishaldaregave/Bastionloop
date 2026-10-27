PYTHON ?= python
NPM ?= npm
WEB := apps/web

.PHONY: install dev dev-stop demo integration integration-strict integration-faults web build-web test e2e up down reset logs keys export-keys policy-sign report verify judge check check-compose

install:
	$(PYTHON) -m pip install -e ".[dev]"
	$(NPM) --prefix $(WEB) install --include=dev

dev:
	$(PYTHON) scripts/dev.py

dev-stop:
	$(PYTHON) scripts/stop_dev.py

demo:
	$(PYTHON) scripts/dev.py --demo --once --clean

web:
	$(NPM) --prefix $(WEB) run dev

build-web:
	$(NPM) --prefix $(WEB) run build

test:
	$(PYTHON) -m pytest -q

e2e:
	$(PYTHON) scripts/dev.py --demo --once --clean

integration:
	$(PYTHON) scripts/integration_test.py --clean --allow-model-failures

integration-strict:
	$(PYTHON) scripts/integration_test.py --clean

integration-faults:
	$(PYTHON) scripts/integration_test.py --clean --faults --allow-model-failures

up:
	@test -f .env || (echo "Missing .env. Copy .env.example for development or .env.production.example for production." && exit 2)
	docker compose up --build -d
	@echo "Dashboard: http://localhost:8080  (credentials from .env; no fallback demo credentials)"

down:
	docker compose down

reset:
	docker compose down -v

logs:
	docker compose logs -f --tail=120

keys:
	$(PYTHON) -m bastion_cli.main keys init

export-keys:
	@test -n "$(OUT)" || (echo "usage: make export-keys OUT=keys.json" && exit 2)
	BASTION_DATA_DIR=$${BASTION_DATA_DIR:-var} $(PYTHON) scripts/export_pinned.py $(OUT)

policy-sign:
	$(PYTHON) -m bastion_cli.main policy sign

report:
	$(PYTHON) -m bastion_cli.main report

verify:
	@test -n "$(FILE)" || (echo "usage: make verify FILE=finding.json" && exit 2)
	$(PYTHON) -m bastion_cli.main verify $(FILE)

judge:
	@test -n "$(TOKEN)" -a -n "$(RUN)" || (echo "usage: make judge TOKEN=... RUN=run_..." && exit 2)
	docker compose exec red $(PYTHON) -m workers.red.challenge --gateway http://gateway:8000 --token $(TOKEN) --run $(RUN)

check: test build-web check-compose

check-compose:
	$(PYTHON) scripts/check_compose.py
