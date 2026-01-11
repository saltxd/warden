FROM python:3.11-slim

WORKDIR /app

# Install SSH client for connecting to bastion
RUN apt-get update && apt-get install -y \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1000 warden && \
    useradd -u 1000 -g 1000 -m -s /bin/bash warden

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Create .ssh directory for SSH connections
RUN mkdir -p /home/warden/.ssh && \
    chown -R warden:warden /home/warden/.ssh && \
    chmod 700 /home/warden/.ssh

# Set timezone
ENV TZ=America/Denver

USER warden

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
