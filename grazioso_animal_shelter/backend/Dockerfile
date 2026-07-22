FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# Invoked via "sh" rather than relying on the executable bit: the backend
# directory is bind-mounted for hot reload in dev, and bind-mounted files
# from a Windows host don't reliably carry the executable bit into the
# container.
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
