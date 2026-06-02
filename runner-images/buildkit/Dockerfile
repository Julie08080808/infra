FROM 10.32.20.51:30443/ci/buildkit:rootless

USER root

COPY harbor-ca.crt /usr/local/share/ca-certificates/harbor-ca.crt

RUN update-ca-certificates

USER user
