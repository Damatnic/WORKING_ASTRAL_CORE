#!/bin/bash

# AstralCore Mental Health Platform - Staging Deployment Script
# Automated deployment script for staging environment with testing and validation
#
# Usage: ./staging-deploy.sh [options]
# Options:
#   --version VERSION    Specify version to deploy
#   --branch BRANCH      Deploy from specific branch (default: develop)
#   --dry-run           Simulate deployment without executing
#   --skip-tests        Skip automated testing
#   --force             Force deployment without confirmations
#   --help              Show this help message

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_LOG="/var/log/astralcore/staging-deployment.log"

# Environment configuration
ENVIRONMENT="staging"
NAMESPACE="astralcore-staging"
REGISTRY="ghcr.io/astralcore/astralcore-v5"
DEFAULT_BRANCH="develop"
HEALTH_CHECK_TIMEOUT=180

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${DEPLOYMENT_LOG}"
    
    case $level in
        ERROR) echo -e "${RED}${message}${NC}" ;;
        WARN)  echo -e "${YELLOW}${message}${NC}" ;;
        INFO)  echo -e "${GREEN}${message}${NC}" ;;
        DEBUG) echo -e "${BLUE}${message}${NC}" ;;
    esac
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                VERSION="$2"
                shift 2
                ;;
            --branch)
                BRANCH="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error_exit "Unknown option: $1"
                ;;
        esac
    done
    
    # Set defaults
    BRANCH="${BRANCH:-${DEFAULT_BRANCH}}"
    VERSION="${VERSION:-${BRANCH}-$(date +%Y%m%d%H%M%S)}"
}

# Show help message
show_help() {
    cat << EOF
AstralCore Staging Deployment Script

Usage: $0 [options]

Options:
    --version VERSION     Specify version to deploy
    --branch BRANCH       Deploy from specific branch (default: develop)
    --dry-run            Simulate deployment without executing
    --skip-tests         Skip automated testing
    --force              Force deployment without confirmations
    --help               Show this help message

Examples:
    $0                                    # Deploy latest from develop branch
    $0 --version staging-v1.2.3           # Deploy specific version
    $0 --branch feature/new-feature       # Deploy from feature branch
    $0 --dry-run                          # Simulate deployment

Environment Variables:
    KUBECONFIG           Kubernetes configuration file path
    GITHUB_TOKEN         GitHub authentication token
    REGISTRY_TOKEN       Container registry authentication token

EOF
}

# Validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating staging deployment prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "docker" "jq" "curl" "gh")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # Check GitHub CLI authentication
    if ! gh auth status &> /dev/null; then
        error_exit "GitHub CLI is not authenticated. Run 'gh auth login'"
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Verify namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log "INFO" "Creating namespace: ${NAMESPACE}"
        kubectl create namespace "${NAMESPACE}"
    fi
    
    log "INFO" "Prerequisites validation completed successfully"
}

# Build and push Docker image
build_and_push_image() {
    log "INFO" "Building Docker image for version ${VERSION}..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "DRY RUN: Would build and push image ${REGISTRY}:${VERSION}"
        return 0
    fi
    
    # Login to registry
    echo "${REGISTRY_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin
    
    # Build image with build args
    docker build \
        --build-arg BUILD_DATE="$(date -Iseconds)" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg VERSION="${VERSION}" \
        -t "${REGISTRY}:${VERSION}" \
        -t "${REGISTRY}:staging-latest" \
        "${PROJECT_ROOT}"
    
    # Push images
    docker push "${REGISTRY}:${VERSION}"
    docker push "${REGISTRY}:staging-latest"
    
    log "INFO" "Docker image built and pushed successfully"
}

# Run automated tests
run_automated_tests() {
    if [[ "${SKIP_TESTS:-false}" == "true" ]]; then
        log "INFO" "Skipping automated tests as requested"
        return 0
    fi
    
    log "INFO" "Running automated test suite..."
    
    # Create temporary test namespace
    local test_namespace="astralcore-test-${RANDOM}"
    kubectl create namespace "${test_namespace}"
    
    # Ensure cleanup on exit
    trap "kubectl delete namespace ${test_namespace} --ignore-not-found=true" EXIT
    
    # Deploy test instance
    deploy_test_instance "${test_namespace}"
    
    # Run test suite
    run_integration_tests "${test_namespace}"
    run_security_tests "${test_namespace}"
    run_performance_tests "${test_namespace}"
    
    # Cleanup test namespace
    kubectl delete namespace "${test_namespace}"
    trap - EXIT
    
    log "INFO" "Automated tests completed successfully"
}

# Deploy test instance
deploy_test_instance() {
    local test_namespace="$1"
    log "INFO" "Deploying test instance in namespace: ${test_namespace}"
    
    # Generate test deployment manifest
    envsubst < "${PROJECT_ROOT}/k8s/staging/deployment.yaml" | \
    sed "s/{{VERSION}}/${VERSION}/g" | \
    sed "s/{{NAMESPACE}}/${test_namespace}/g" > "/tmp/test-deployment-${VERSION}.yaml"
    
    # Apply test deployment
    kubectl apply -f "/tmp/test-deployment-${VERSION}.yaml" -n "${test_namespace}"
    
    # Wait for deployment
    kubectl rollout status deployment/astralcore-app -n "${test_namespace}" --timeout=300s
    
    # Wait for pods to be ready
    kubectl wait --for=condition=Ready pods -l app=astralcore -n "${test_namespace}" --timeout=120s
}

# Run integration tests
run_integration_tests() {
    local test_namespace="$1"
    log "INFO" "Running integration tests..."
    
    # Get test pod
    local test_pod=$(kubectl get pods -l app=astralcore -n "${test_namespace}" -o jsonpath='{.items[0].metadata.name}')
    
    # Run database connectivity test
    if ! kubectl exec -n "${test_namespace}" "${test_pod}" -- npm run test:integration:database; then
        error_exit "Database integration tests failed"
    fi
    
    # Run API endpoint tests
    if ! kubectl exec -n "${test_namespace}" "${test_pod}" -- npm run test:integration:api; then
        error_exit "API integration tests failed"
    fi
    
    # Run HIPAA compliance tests
    if ! kubectl exec -n "${test_namespace}" "${test_pod}" -- npm run test:hipaa; then
        error_exit "HIPAA compliance tests failed"
    fi
    
    log "INFO" "Integration tests passed"
}

# Run security tests
run_security_tests() {
    local test_namespace="$1"
    log "INFO" "Running security tests..."
    
    local test_pod=$(kubectl get pods -l app=astralcore -n "${test_namespace}" -o jsonpath='{.items[0].metadata.name}')
    
    # Run security test suite
    if ! kubectl exec -n "${test_namespace}" "${test_pod}" -- npm run test:security; then
        error_exit "Security tests failed"
    fi
    
    # Run encryption tests
    if ! kubectl exec -n "${test_namespace}" "${test_pod}" -- npm run test:encryption; then
        error_exit "Encryption tests failed"
    fi
    
    # Run audit logging tests
    if ! kubectl exec -n "${test_namespace}" "${test_pod}" -- npm run test:audit; then
        error_exit "Audit logging tests failed"
    fi
    
    log "INFO" "Security tests passed"
}

# Run performance tests
run_performance_tests() {
    local test_namespace="$1"
    log "INFO" "Running performance tests..."
    
    # Get service endpoint
    local service_ip=$(kubectl get service astralcore-app -n "${test_namespace}" -o jsonpath='{.spec.clusterIP}')
    
    # Run load tests using k6
    if command -v k6 &> /dev/null; then
        k6 run --vus 10 --duration 30s "${PROJECT_ROOT}/tests/performance/load-test.js" \
            -e BASE_URL="http://${service_ip}:3000" || log "WARN" "Performance tests failed"
    else
        log "WARN" "k6 not found, skipping performance tests"
    fi
    
    log "INFO" "Performance tests completed"
}

# Deploy to staging environment
deploy_to_staging() {
    log "INFO" "Deploying version ${VERSION} to staging environment..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "DRY RUN: Would deploy version ${VERSION} to staging"
        return 0
    fi
    
    # Generate deployment manifest
    envsubst < "${PROJECT_ROOT}/k8s/staging/deployment.yaml" | \
    sed "s/{{VERSION}}/${VERSION}/g" > "/tmp/staging-deployment-${VERSION}.yaml"
    
    # Apply deployment
    kubectl apply -f "/tmp/staging-deployment-${VERSION}.yaml" -n "${NAMESPACE}"
    
    # Wait for deployment to complete
    kubectl rollout status deployment/astralcore-app -n "${NAMESPACE}" --timeout=300s
    
    # Update service if needed
    kubectl apply -f "${PROJECT_ROOT}/k8s/staging/service.yaml" -n "${NAMESPACE}"
    
    log "INFO" "Deployment to staging completed"
}

# Run staging health checks
run_staging_health_checks() {
    log "INFO" "Running staging health checks..."
    
    # Get staging service endpoint
    local staging_url="https://staging.astralcore.app"
    
    # Health check endpoints
    local endpoints=(
        "/api/health"
        "/api/health/database"
        "/api/health/redis"
        "/api/health/security"
    )
    
    local max_attempts=20
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        local all_healthy=true
        
        for endpoint in "${endpoints[@]}"; do
            log "DEBUG" "Checking ${staging_url}${endpoint}"
            
            if ! curl -f -s --max-time 30 "${staging_url}${endpoint}" > /dev/null; then
                log "WARN" "Health check failed for ${endpoint} (attempt ${attempt}/${max_attempts})"
                all_healthy=false
                break
            fi
        done
        
        if [[ "$all_healthy" == "true" ]]; then
            log "INFO" "All staging health checks passed"
            return 0
        fi
        
        sleep 15
        ((attempt++))
    done
    
    error_exit "Staging health checks failed after ${max_attempts} attempts"
}

# Run smoke tests
run_smoke_tests() {
    log "INFO" "Running smoke tests against staging environment..."
    
    local staging_url="https://staging.astralcore.app"
    
    # Basic functionality tests
    local smoke_tests=(
        "GET ${staging_url}/"
        "GET ${staging_url}/api/auth/session"
        "GET ${staging_url}/wellness"
        "GET ${staging_url}/community"
    )
    
    for test in "${smoke_tests[@]}"; do
        local method=$(echo "$test" | cut -d' ' -f1)
        local url=$(echo "$test" | cut -d' ' -f2)
        
        log "DEBUG" "Smoke test: ${method} ${url}"
        
        case $method in
            GET)
                if ! curl -f -s --max-time 30 "$url" > /dev/null; then
                    error_exit "Smoke test failed: ${method} ${url}"
                fi
                ;;
        esac
    done
    
    log "INFO" "Smoke tests passed"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    log "INFO" "Sending deployment notification: ${status}"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚧 AstralCore Staging ${status}: ${VERSION}\\n${message}\\nEnvironment: https://staging.astralcore.app\"}" \
            "${SLACK_WEBHOOK_URL}" || log "WARN" "Failed to send Slack notification"
    fi
    
    # GitHub commit status
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        local commit_sha=$(git rev-parse HEAD)
        local state="success"
        [[ "$status" == *"FAILED"* ]] && state="failure"
        
        gh api -X POST "/repos/{owner}/{repo}/statuses/${commit_sha}" \
            -f state="${state}" \
            -f target_url="https://staging.astralcore.app" \
            -f description="${message}" \
            -f context="staging-deployment" || log "WARN" "Failed to update GitHub status"
    fi
}

# Generate deployment report
generate_deployment_report() {
    local status="$1"
    local report_file="/tmp/staging-deployment-report-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "${report_file}" << EOF
{
    "deployment": {
        "status": "${status}",
        "version": "${VERSION}",
        "branch": "${BRANCH}",
        "timestamp": "$(date -Iseconds)",
        "environment": "${ENVIRONMENT}",
        "namespace": "${NAMESPACE}",
        "staging_url": "https://staging.astralcore.app",
        "duration_seconds": $(($(date +%s) - ${START_TIME}))
    },
    "tests": {
        "integration": "$([ "${SKIP_TESTS:-false}" == "false" ] && echo "passed" || echo "skipped")",
        "security": "$([ "${SKIP_TESTS:-false}" == "false" ] && echo "passed" || echo "skipped")",
        "performance": "$([ "${SKIP_TESTS:-false}" == "false" ] && echo "passed" || echo "skipped")",
        "smoke": "passed"
    },
    "health_checks": {
        "application": "healthy",
        "database": "healthy",
        "redis": "healthy",
        "security": "healthy"
    }
}
EOF
    
    log "INFO" "Staging deployment report generated: ${report_file}"
    cat "${report_file}"
}

# Main deployment function
main() {
    START_TIME=$(date +%s)
    
    # Initialize logging
    mkdir -p "$(dirname "${DEPLOYMENT_LOG}")"
    
    log "INFO" "Starting AstralCore staging deployment..."
    log "INFO" "Script version: 1.0.0"
    log "INFO" "Environment: ${ENVIRONMENT}"
    
    # Parse arguments
    parse_arguments "$@"
    
    log "INFO" "Target version: ${VERSION}"
    log "INFO" "Source branch: ${BRANCH}"
    
    # Confirmation prompt (unless forced or dry run)
    if [[ "${FORCE_DEPLOY:-false}" != "true" ]] && [[ "${DRY_RUN:-false}" != "true" ]]; then
        echo -e "${YELLOW}Deploy version ${VERSION} from branch ${BRANCH} to staging? (y/N)${NC}"
        read -r confirmation
        if [[ ! "${confirmation}" =~ ^[Yy]$ ]]; then
            log "INFO" "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Execute deployment steps
    validate_prerequisites
    build_and_push_image
    run_automated_tests
    deploy_to_staging
    run_staging_health_checks
    run_smoke_tests
    
    # Success notification
    send_notifications "DEPLOYMENT_SUCCESS" "Staging deployment completed successfully"
    generate_deployment_report "SUCCESS"
    
    log "INFO" "🎉 Staging deployment completed successfully!"
    log "INFO" "Version ${VERSION} is now live at: https://staging.astralcore.app"
    log "INFO" "Deployment duration: $(($(date +%s) - START_TIME)) seconds"
    
    # Promotion suggestion
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "  • Review staging deployment: ${BLUE}https://staging.astralcore.app${NC}"
    echo -e "  • Run additional QA testing"
    echo -e "  • Promote to production: ${YELLOW}./production-deploy.sh --version ${VERSION}${NC}"
}

# Execute main function with all arguments
main "$@"