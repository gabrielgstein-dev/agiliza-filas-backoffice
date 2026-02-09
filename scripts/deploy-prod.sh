#!/bin/bash

# Script de deploy para produção no Cloud Run - Backoffice
# Uso: ./scripts/deploy-prod.sh [PROJECT_ID] [REGION]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
DEFAULT_PROJECT_ID=""
DEFAULT_REGION="us-central1"
SERVICE_NAME="agiliza-backoffice"

# Parâmetros
PROJECT_ID=${1:-$DEFAULT_PROJECT_ID}
REGION=${2:-$DEFAULT_REGION}

echo -e "${BLUE}🚀 Iniciando deploy da Agiliza Backoffice para Cloud Run${NC}"
echo -e "${BLUE}========================================================${NC}"

# Verificar se PROJECT_ID foi fornecido
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Erro: PROJECT_ID é obrigatório${NC}"
    echo -e "${YELLOW}Uso: ./scripts/deploy-prod.sh PROJECT_ID [REGION]${NC}"
    echo -e "${YELLOW}Exemplo: ./scripts/deploy-prod.sh agiliza-prod us-central1${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configurações:${NC}"
echo -e "  Project ID: ${PROJECT_ID}"
echo -e "  Região: ${REGION}"
echo -e "  Serviço: ${SERVICE_NAME}"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI não encontrado. Instale o Google Cloud SDK.${NC}"
    exit 1
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Instale o Docker.${NC}"
    exit 1
fi

# Configurar projeto
echo -e "${BLUE}🔧 Configurando projeto...${NC}"
gcloud config set project $PROJECT_ID

# Verificar se as APIs necessárias estão habilitadas
echo -e "${BLUE}🔍 Verificando APIs necessárias...${NC}"
REQUIRED_APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo -e "${YELLOW}⚡ Habilitando API: $api${NC}"
        gcloud services enable $api
    else
        echo -e "${GREEN}✅ API já habilitada: $api${NC}"
    fi
done

# Build e push da imagem
echo -e "${BLUE}🏗️ Fazendo build da imagem...${NC}"
IMAGE_TAG="us-central1-docker.pkg.dev/$PROJECT_ID/agiliza-backoffice/agiliza-backoffice:$(date +%Y%m%d-%H%M%S)"
LATEST_TAG="us-central1-docker.pkg.dev/$PROJECT_ID/agiliza-backoffice/agiliza-backoffice:latest"

docker build -t $IMAGE_TAG -t $LATEST_TAG .

echo -e "${BLUE}📤 Fazendo push da imagem...${NC}"
docker push $IMAGE_TAG
docker push $LATEST_TAG

# Deploy no Cloud Run
echo -e "${BLUE}🚀 Fazendo deploy no Cloud Run...${NC}"
VERSION=$(date +%Y%m%d-%H%M%S)
gcloud run deploy $SERVICE_NAME \
    --image us-central1-docker.pkg.dev/$PROJECT_ID/agiliza-backoffice/agiliza-backoffice:$VERSION \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 20 \
    --set-env-vars NODE_ENV=production \
    --set-env-vars NEXT_TELEMETRY_DISABLED=1 \
    --set-env-vars NEXT_PUBLIC_API_URL=https://agiliza-api-nafwgg52oq-uc.a.run.app \
    --set-env-vars NEXT_PUBLIC_WS_URL=wss://agiliza-api-nafwgg52oq-uc.a.run.app \
    --set-env-vars NEXT_PUBLIC_APP_NAME="Agiliza Backoffice"

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}🌐 URL do serviço: $SERVICE_URL${NC}"
echo -e "${GREEN}📚 Aplicação: $SERVICE_URL${NC}"
echo -e "${GREEN}🏥 Health check: $SERVICE_URL/api/health${NC}"

echo -e "${YELLOW}📝 Nota:${NC}"
echo -e "  Este script é para deploy manual. Para ambiente QA, use:"
echo -e "  ${BLUE}pnpm run version:patch${NC} (ou minor/major)"
echo -e ""
echo -e "${YELLOW}🚀 Para automação completa via GitHub Actions:${NC}"
echo -e "  1. Configure secrets no GitHub"
echo -e "  2. Use os comandos de versionamento"
echo -e "  3. Deploy automático será acionado"
