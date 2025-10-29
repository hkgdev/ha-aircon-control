ARG BUILD_FROM
FROM $BUILD_FROM

# Install required packages
RUN apk add --no-cache \
    php82 \
    php82-apache2 \
    php82-curl \
    php82-json \
    php82-session \
    php82-xml \
    curl \
    apache2 \
    apache2-proxy \
    && rm -rf /var/cache/apk/*

# Configure Apache
RUN mkdir -p /run/apache2 \
    && sed -i 's/#LoadModule proxy_module/LoadModule proxy_module/' /etc/apache2/httpd.conf \
    && sed -i 's/#LoadModule proxy_http_module/LoadModule proxy_http_module/' /etc/apache2/httpd.conf \
    && sed -i 's/#LoadModule rewrite_module/LoadModule rewrite_module/' /etc/apache2/httpd.conf \
    && echo "ServerName localhost" >> /etc/apache2/httpd.conf

# Copy aircon app files
COPY rootfs /

# Make scripts executable
RUN chmod +x /etc/services.d/apache/run \
    && chmod +x /etc/services.d/apache/finish

# Expose port
EXPOSE 8099

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8099/ || exit 1