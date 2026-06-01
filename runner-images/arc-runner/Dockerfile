FROM ghcr.io/actions/actions-runner:latest

USER root

RUN apt-get update \
    && apt-get install -y \
        curl \
        ca-certificates \
        git \
        jq \
        unzip \
        python3 \
        python3-pip \
        python3-venv \
    && curl --ipv4 -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g typescript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER runner
