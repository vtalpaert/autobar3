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

# Get all local IP addresses (excluding loopback)
LOCAL_IPS=$(ip addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1')

# Create certificates directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Start building the alt_names section
ALT_NAMES="DNS.1 = localhost
DNS.2 = $COMMON_NAME
IP.1 = 127.0.0.1"

# Add all local IPs to the certificate
IP_COUNT=2
for ip in $LOCAL_IPS; do
    ALT_NAMES="$ALT_NAMES
IP.$IP_COUNT = $ip"
    ((IP_COUNT++))
done

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
$ALT_NAMES
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
echo ""
echo "Certificate includes the following IP addresses:"
echo "  - 127.0.0.1 (localhost)"
for ip in $LOCAL_IPS; do
    echo "  - $ip"
done
