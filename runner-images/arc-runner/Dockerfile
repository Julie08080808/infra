FROM 10.32.20.51:30443/ci/buildkit:rootless AS buildkit

FROM ghcr.io/actions/actions-runner:latest

USER root

COPY --from=buildkit /usr/bin/buildctl /usr/local/bin/buildctl

RUN apt-get update \
    && apt-get install -y \
        bash \
        curl \
        ca-certificates \
        git \
        jq \
        unzip \
        tar \
        gzip \
        python3 \
        python3-pip \
        python3-venv \
    && curl --ipv4 -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g typescript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER runner
