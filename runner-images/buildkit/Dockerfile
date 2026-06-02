FROM 10.32.20.51:30443/ci/buildkit:rootless

USER root

COPY harbor-ca.crt /usr/local/share/ca-certificates/harbor-ca.crt

RUN mkdir -p /etc/ssl/certs \
    && if [ -f /etc/ssl/certs/ca-certificates.crt ]; then \
         cat /usr/local/share/ca-certificates/harbor-ca.crt >> /etc/ssl/certs/ca-certificates.crt; \
       else \
         cp /usr/local/share/ca-certificates/harbor-ca.crt /etc/ssl/certs/ca-certificates.crt; \
       fi

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

USER user
