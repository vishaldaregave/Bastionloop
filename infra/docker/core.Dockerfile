FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY pyproject.toml ./
COPY bastion_core ./bastion_core
COPY services ./services
COPY workers ./workers
COPY bastion_cli ./bastion_cli
COPY scripts ./scripts
COPY benchmarks ./benchmarks
COPY security ./security

RUN pip install --no-cache-dir . \
 && groupadd --gid 10001 bastion \
 && useradd --uid 10001 --gid 10001 --create-home bastion \
 && mkdir -p /data && chown -R bastion:bastion /app /data

USER 10001:10001

ENTRYPOINT ["python", "-m", "uvicorn"]
