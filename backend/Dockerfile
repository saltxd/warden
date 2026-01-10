FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Node.js (required for Claude Code)
RUN apt-get update && apt-get install -y \
    openssh-client \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Create .ssh directory for SSH connections
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
