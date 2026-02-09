#!/bin/bash

# Script de inicialização para rodar Next.js e Nginx (Docusaurus)

# Iniciar nginx em background
echo "🚀 Iniciando nginx para documentação..."
nginx -g 'daemon on;'

# Iniciar aplicação Next.js
echo "🚀 Iniciando aplicação Next.js..."
exec node server.js
