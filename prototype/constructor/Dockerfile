# SmartMach — Конструктор типовых узлов
# Базовый образ с conda: pythonocc-core недоступен через pip
FROM continuumio/miniconda3:latest

WORKDIR /app

# Геометрическое ядро Open Cascade (LGPL, свободная лицензия)
RUN conda install -y -c conda-forge pythonocc-core=7.7.2 python=3.11 \
    && conda clean -afy

# Системные библиотеки для генерации PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt weasyprint

COPY app/ ./app/
COPY examples/ ./examples/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
