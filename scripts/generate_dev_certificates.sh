#!/bin/bash

# Script to generate self-signed SSL certificates for development

# Exit on error
set -e

# Configuration
CERT_DIR="./certificates"
DAYS_VALID=365
COUNTRY="US"
STATE="State"
LOCALITY="City"
ORGANIZATION="Development"
ORGANIZATIONAL_UNIT="IT"
COMMON_NAME="localhost"

# Get local IP address
LOCAL_IP=$(hostname -i | cut -d' ' -f1)

# Create certificates directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Create OpenSSL config file with SAN
cat > "$CERT_DIR/openssl.cnf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = $COUNTRY
ST = $STATE
L = $LOCALITY
O = $ORGANIZATION
OU = $ORGANIZATIONAL_UNIT
CN = $COMMON_NAME

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $COMMON_NAME
IP.1 = 127.0.0.1
IP.2 = $LOCAL_IP
EOF

# Generate private key
openssl genrsa -out "$CERT_DIR/private.key" 2048

# Generate Certificate Signing Request (CSR) with config
openssl req -new -key "$CERT_DIR/private.key" -out "$CERT_DIR/request.csr" -config "$CERT_DIR/openssl.cnf"

# Generate self-signed certificate
openssl x509 -req -days $DAYS_VALID \
    -in "$CERT_DIR/request.csr" \
    -signkey "$CERT_DIR/private.key" \
    -out "$CERT_DIR/certificate.crt" \
    -extensions req_ext \
    -extfile "$CERT_DIR/openssl.cnf"

# Clean up temporary config file
rm "$CERT_DIR/openssl.cnf"

# Clean up CSR as it's no longer needed
rm "$CERT_DIR/request.csr"

# Copy certificate to ESP32 firmware directory
mkdir -p main
cp "$CERT_DIR/certificate.crt" main/server_cert.pem

echo "SSL certificates generated successfully in $CERT_DIR/"
echo "  - Private key: $CERT_DIR/private.key"
echo "  - Certificate: $CERT_DIR/certificate.crt"
echo "  - ESP32 PEM: main/server_cert.pem"
