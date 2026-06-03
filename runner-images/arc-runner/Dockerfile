FROM harbor.jlsa.local:30443/ci/buildkit:rootless AS buildkit

FROM ghcr.io/actions/actions-runner:2.334.0

USER root

ARG TARGETARCH=amd64
ARG KUBECTL_VERSION=v1.30.14
ARG COSIGN_VERSION=v2.4.1
ARG SYFT_VERSION=1.20.0
ARG GRYPE_VERSION=0.92.0
ARG YQ_VERSION=v4.44.3

COPY --from=buildkit /usr/bin/buildctl /usr/local/bin/buildctl

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
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
        gnupg \
    && curl --ipv4 -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g typescript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# kubectl
RUN curl -L --fail --retry 3 \
    -o /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
    && chmod +x /usr/local/bin/kubectl

# cosign
RUN curl -L --fail --retry 3 \
    -o /usr/local/bin/cosign \
    "https://github.com/sigstore/cosign/releases/download/${COSIGN_VERSION}/cosign-linux-${TARGETARCH}" \
    && chmod +x /usr/local/bin/cosign

# syft
RUN curl -L --fail --retry 3 \
    -o /tmp/syft.tgz \
    "https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_${TARGETARCH}.tar.gz" \
    && tar -xzf /tmp/syft.tgz -C /tmp syft \
    && mv /tmp/syft /usr/local/bin/syft \
    && chmod +x /usr/local/bin/syft \
    && rm -f /tmp/syft.tgz

# grype
RUN curl -L --fail --retry 3 \
    -o /tmp/grype.tgz \
    "https://github.com/anchore/grype/releases/download/v${GRYPE_VERSION}/grype_${GRYPE_VERSION}_linux_${TARGETARCH}.tar.gz" \
    && tar -xzf /tmp/grype.tgz -C /tmp grype \
    && mv /tmp/grype /usr/local/bin/grype \
    && chmod +x /usr/local/bin/grype \
    && rm -f /tmp/grype.tgz

# yq
RUN curl -L --fail --retry 3 \
    -o /usr/local/bin/yq \
    "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_${TARGETARCH}" \
    && chmod +x /usr/local/bin/yq

RUN kubectl version --client=true \
    && buildctl --version \
    && cosign version \
    && syft version \
    && grype version \
    && jq --version \
    && yq --version \
    && git --version \
    && node --version \
    && npm --version \
    && tsc --version \
    && python3 --version

USER runner
