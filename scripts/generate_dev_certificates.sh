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

# Create certificates directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/private.key" 2048

# Generate Certificate Signing Request (CSR)
openssl req -new -key "$CERT_DIR/private.key" -out "$CERT_DIR/request.csr" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORGANIZATIONAL_UNIT/CN=$COMMON_NAME"

# Generate self-signed certificate
openssl x509 -req -days $DAYS_VALID \
    -in "$CERT_DIR/request.csr" \
    -signkey "$CERT_DIR/private.key" \
    -out "$CERT_DIR/certificate.crt"

# Clean up CSR as it's no longer needed
rm "$CERT_DIR/request.csr"

echo "SSL certificates generated successfully in $CERT_DIR/"
echo "  - Private key: $CERT_DIR/private.key"
echo "  - Certificate: $CERT_DIR/certificate.crt"
