#!/bin/bash

# AstralCore Mental Health Platform - Production Deployment Script
# HIPAA-compliant zero-downtime deployment with comprehensive rollback capabilities
#
# Usage: ./production-deploy.sh [options]
# Options:
#   --version VERSION    Specify version to deploy
#   --rollback VERSION   Rollback to specific version
#   --dry-run           Simulate deployment without executing
#   --force             Force deployment without confirmations
#   --health-timeout N   Health check timeout in seconds (default: 300)
#   --help              Show this help message

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_LOG="/var/log/astralcore/deployment.log"
BACKUP_DIR="/var/backups/astralcore"
ROLLBACK_LIMIT=5

# Environment configuration
ENVIRONMENT="production"
NAMESPACE="astralcore-prod"
REGISTRY="ghcr.io/astralcore/astralcore-v5"
HEALTH_CHECK_TIMEOUT=300
DEPLOYMENT_TIMEOUT=600

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    cleanup_on_failure
    exit 1
}

# Cleanup function for failed deployments
cleanup_on_failure() {
    log "WARN" "Deployment failed, initiating cleanup..."
    
    # Remove failed deployment artifacts
    if [[ -n "${NEW_VERSION:-}" ]]; then
        kubectl delete deployment "${NAMESPACE}-${NEW_VERSION}" --ignore-not-found=true -n "${NAMESPACE}" || true
        kubectl delete service "${NAMESPACE}-${NEW_VERSION}" --ignore-not-found=true -n "${NAMESPACE}" || true
    fi
    
    # Restore previous version if rollback is needed
    if [[ "${AUTO_ROLLBACK:-false}" == "true" ]] && [[ -n "${PREVIOUS_VERSION:-}" ]]; then
        log "INFO" "Auto-rollback enabled, reverting to version ${PREVIOUS_VERSION}"
        rollback_deployment "${PREVIOUS_VERSION}"
    fi
}

# Trap signals for graceful shutdown
trap 'error_exit "Deployment interrupted"' INT TERM

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                VERSION="$2"
                shift 2
                ;;
            --rollback)
                ROLLBACK_VERSION="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --health-timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
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
}

# Show help message
show_help() {
    cat << EOF
AstralCore Production Deployment Script

Usage: $0 [options]

Options:
    --version VERSION      Specify version to deploy (required for new deployments)
    --rollback VERSION     Rollback to specific version
    --dry-run             Simulate deployment without executing
    --force               Force deployment without confirmations
    --health-timeout N    Health check timeout in seconds (default: 300)
    --help                Show this help message

Examples:
    $0 --version v1.2.3                    # Deploy version v1.2.3
    $0 --rollback v1.2.2                   # Rollback to version v1.2.2
    $0 --version v1.2.3 --dry-run          # Simulate deployment of v1.2.3
    $0 --version v1.2.3 --force            # Force deployment without confirmations

Environment Variables:
    KUBECONFIG           Kubernetes configuration file path
    REGISTRY_TOKEN       Container registry authentication token
    DEPLOYMENT_TIMEOUT   Deployment timeout in seconds (default: 600)
    AUTO_ROLLBACK        Enable automatic rollback on failure (default: false)

EOF
}

# Validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating deployment prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "docker" "jq" "curl" "envsubst")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Verify namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        error_exit "Namespace '${NAMESPACE}' does not exist"
    fi
    
    # Check registry access
    if [[ -z "${REGISTRY_TOKEN:-}" ]]; then
        error_exit "REGISTRY_TOKEN environment variable is not set"
    fi
    
    # Validate version format
    if [[ -n "${VERSION:-}" ]] && [[ ! "${VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        error_exit "Invalid version format: ${VERSION}. Expected format: v1.2.3 or v1.2.3-alpha"
    fi
    
    log "INFO" "Prerequisites validation completed successfully"
}

# Create backup of current deployment
create_backup() {
    log "INFO" "Creating backup of current deployment..."
    
    local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_path="${BACKUP_DIR}/${backup_timestamp}"
    
    mkdir -p "${backup_path}"
    
    # Backup Kubernetes manifests
    kubectl get all -n "${NAMESPACE}" -o yaml > "${backup_path}/k8s-manifests.yaml"
    
    # Backup ConfigMaps and Secrets
    kubectl get configmaps -n "${NAMESPACE}" -o yaml > "${backup_path}/configmaps.yaml"
    kubectl get secrets -n "${NAMESPACE}" -o yaml > "${backup_path}/secrets.yaml"
    
    # Backup database
    create_database_backup "${backup_path}"
    
    # Store current version info
    get_current_version > "${backup_path}/current_version.txt"
    
    log "INFO" "Backup created at: ${backup_path}"
    echo "${backup_path}" > /tmp/astralcore_backup_path
}

# Create database backup
create_database_backup() {
    local backup_path="$1"
    log "INFO" "Creating database backup..."
    
    # Get database credentials from secrets
    local db_host=$(kubectl get secret astralcore-db-secret -n "${NAMESPACE}" -o jsonpath='{.data.host}' | base64 -d)
    local db_user=$(kubectl get secret astralcore-db-secret -n "${NAMESPACE}" -o jsonpath='{.data.username}' | base64 -d)
    local db_password=$(kubectl get secret astralcore-db-secret -n "${NAMESPACE}" -o jsonpath='{.data.password}' | base64 -d)
    local db_name=$(kubectl get secret astralcore-db-secret -n "${NAMESPACE}" -o jsonpath='{.data.database}' | base64 -d)
    
    # Create encrypted database dump
    PGPASSWORD="${db_password}" pg_dump \
        -h "${db_host}" \
        -U "${db_user}" \
        -d "${db_name}" \
        --no-owner \
        --no-privileges \
        --clean \
        --create | gzip | openssl enc -aes-256-cbc -salt -pass pass:"${DB_BACKUP_ENCRYPTION_KEY}" > "${backup_path}/database_backup.sql.gz.enc"
    
    log "INFO" "Database backup completed"
}

# Get current version
get_current_version() {
    kubectl get deployment astralcore-app -n "${NAMESPACE}" -o jsonpath='{.metadata.labels.version}' 2>/dev/null || echo "unknown"
}

# Pre-deployment health checks
pre_deployment_checks() {
    log "INFO" "Running pre-deployment health checks..."
    
    # Check cluster resources
    local cpu_usage=$(kubectl top nodes --no-headers | awk '{sum+=$3} END {print sum}')
    local memory_usage=$(kubectl top nodes --no-headers | awk '{sum+=$5} END {print sum}')
    
    log "INFO" "Cluster CPU usage: ${cpu_usage}m"
    log "INFO" "Cluster memory usage: ${memory_usage}Mi"
    
    # Check database connectivity
    if ! kubectl exec -n "${NAMESPACE}" deployment/astralcore-app -- pg_isready -h "${DB_HOST}" -p 5432; then
        error_exit "Database connectivity check failed"
    fi
    
    # Check Redis connectivity
    if ! kubectl exec -n "${NAMESPACE}" deployment/astralcore-app -- redis-cli -h "${REDIS_HOST}" ping | grep -q PONG; then
        error_exit "Redis connectivity check failed"
    fi
    
    # Verify image exists in registry
    if ! docker manifest inspect "${REGISTRY}:${VERSION}" &> /dev/null; then
        error_exit "Image ${REGISTRY}:${VERSION} not found in registry"
    fi
    
    log "INFO" "Pre-deployment checks completed successfully"
}

# Deploy new version using blue-green strategy
deploy_new_version() {
    log "INFO" "Deploying version ${VERSION} using blue-green strategy..."
    
    local deployment_name="astralcore-app-${VERSION//./-}"
    NEW_VERSION="${VERSION}"
    
    # Generate deployment manifest
    envsubst < "${PROJECT_ROOT}/k8s/production/deployment.yaml" | \
    sed "s/{{VERSION}}/${VERSION}/g" | \
    sed "s/{{DEPLOYMENT_NAME}}/${deployment_name}/g" > "/tmp/deployment-${VERSION}.yaml"
    
    # Apply deployment
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "DRY RUN: Would deploy with manifest:"
        cat "/tmp/deployment-${VERSION}.yaml"
        return 0
    fi
    
    kubectl apply -f "/tmp/deployment-${VERSION}.yaml" -n "${NAMESPACE}"
    
    # Wait for deployment to be ready
    log "INFO" "Waiting for deployment to be ready..."
    kubectl rollout status deployment/"${deployment_name}" -n "${NAMESPACE}" --timeout="${DEPLOYMENT_TIMEOUT}s"
    
    # Run health checks on new deployment
    if ! run_health_checks "${deployment_name}"; then
        error_exit "Health checks failed for new deployment"
    fi
    
    log "INFO" "New version ${VERSION} deployed successfully"
}

# Run comprehensive health checks
run_health_checks() {
    local deployment_name="$1"
    log "INFO" "Running health checks for ${deployment_name}..."
    
    # Get pod IP for direct health check
    local pod_ip=$(kubectl get pod -l app=astralcore,version="${VERSION}" -n "${NAMESPACE}" -o jsonpath='{.items[0].status.podIP}')
    
    # Health check endpoints
    local health_endpoints=(
        "/api/health"
        "/api/health/database"
        "/api/health/redis"
        "/api/health/encryption"
        "/api/health/audit"
    )
    
    local check_timeout=30
    local retry_count=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / check_timeout))
    
    while [[ $retry_count -lt $max_retries ]]; do
        local all_healthy=true
        
        for endpoint in "${health_endpoints[@]}"; do
            log "DEBUG" "Checking endpoint: ${endpoint}"
            
            if ! kubectl exec -n "${NAMESPACE}" deployment/"${deployment_name}" -- \
                curl -f -s -m "${check_timeout}" "http://localhost:3000${endpoint}" > /dev/null; then
                log "WARN" "Health check failed for endpoint: ${endpoint}"
                all_healthy=false
                break
            fi
        done
        
        if [[ "$all_healthy" == "true" ]]; then
            log "INFO" "All health checks passed"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log "INFO" "Health check attempt $retry_count/$max_retries failed, retrying in ${check_timeout}s..."
        sleep "${check_timeout}"
    done
    
    log "ERROR" "Health checks failed after ${max_retries} attempts"
    return 1
}

# Switch traffic to new version
switch_traffic() {
    log "INFO" "Switching traffic to new version ${VERSION}..."
    
    local service_selector="version=${VERSION}"
    
    # Update service selector
    kubectl patch service astralcore-app -n "${NAMESPACE}" -p '{"spec":{"selector":{"version":"'${VERSION}'"}}}'
    
    # Wait for service endpoints to update
    sleep 30
    
    # Verify traffic is routing to new version
    local new_pod_count=$(kubectl get endpoints astralcore-app -n "${NAMESPACE}" -o json | jq '.subsets[0].addresses | length')
    if [[ "${new_pod_count}" -eq 0 ]]; then
        error_exit "No endpoints available after traffic switch"
    fi
    
    log "INFO" "Traffic switched successfully to ${new_pod_count} pods running version ${VERSION}"
}

# Cleanup old versions (keep last N versions)
cleanup_old_versions() {
    log "INFO" "Cleaning up old versions (keeping last ${ROLLBACK_LIMIT})..."
    
    # Get all deployments sorted by creation time
    local old_deployments=$(kubectl get deployments -n "${NAMESPACE}" -l app=astralcore --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[*].metadata.name}')
    local deployment_array=($old_deployments)
    local total_deployments=${#deployment_array[@]}
    
    if [[ $total_deployments -gt $ROLLBACK_LIMIT ]]; then
        local deployments_to_delete=$((total_deployments - ROLLBACK_LIMIT))
        
        for ((i=0; i<deployments_to_delete; i++)); do
            local deployment_to_delete=${deployment_array[$i]}
            log "INFO" "Deleting old deployment: ${deployment_to_delete}"
            kubectl delete deployment "${deployment_to_delete}" -n "${NAMESPACE}"
        done
    fi
}

# Rollback to previous version
rollback_deployment() {
    local rollback_version="$1"
    log "INFO" "Rolling back to version ${rollback_version}..."
    
    # Verify rollback version exists
    local rollback_deployment="astralcore-app-${rollback_version//./-}"
    if ! kubectl get deployment "${rollback_deployment}" -n "${NAMESPACE}" &> /dev/null; then
        error_exit "Rollback version ${rollback_version} deployment not found"
    fi
    
    # Switch traffic back
    kubectl patch service astralcore-app -n "${NAMESPACE}" -p '{"spec":{"selector":{"version":"'${rollback_version}'"}}}'
    
    # Scale up rollback version
    kubectl scale deployment "${rollback_deployment}" --replicas=3 -n "${NAMESPACE}"
    
    # Wait for rollback to be ready
    kubectl rollout status deployment/"${rollback_deployment}" -n "${NAMESPACE}" --timeout=300s
    
    # Run health checks
    if run_health_checks "${rollback_deployment}"; then
        log "INFO" "Rollback to version ${rollback_version} completed successfully"
        
        # Scale down current version
        if [[ -n "${NEW_VERSION:-}" ]]; then
            kubectl scale deployment "astralcore-app-${NEW_VERSION//./-}" --replicas=0 -n "${NAMESPACE}"
        fi
    else
        error_exit "Rollback health checks failed"
    fi
}

# Send deployment notifications
send_notifications() {
    local status="$1"
    local version="$2"
    local message="$3"
    
    log "INFO" "Sending deployment notification: ${status}"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 AstralCore ${status}: ${version}\\n${message}\"}" \
            "${SLACK_WEBHOOK_URL}" || log "WARN" "Failed to send Slack notification"
    fi
    
    # Email notification
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "${message}" | mail -s "AstralCore ${status}: ${version}" "${NOTIFICATION_EMAIL}" || \
            log "WARN" "Failed to send email notification"
    fi
}

# Generate deployment report
generate_deployment_report() {
    local deployment_status="$1"
    local report_file="/tmp/deployment-report-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "${report_file}" << EOF
{
    "deployment": {
        "status": "${deployment_status}",
        "version": "${VERSION:-unknown}",
        "timestamp": "$(date -Iseconds)",
        "environment": "${ENVIRONMENT}",
        "namespace": "${NAMESPACE}",
        "previous_version": "${PREVIOUS_VERSION:-unknown}",
        "duration_seconds": $(($(date +%s) - ${START_TIME})),
        "rollback_available": $(kubectl get deployments -n "${NAMESPACE}" -l app=astralcore | wc -l)
    },
    "health_checks": {
        "database": "$(kubectl exec -n "${NAMESPACE}" deployment/astralcore-app -- pg_isready -h "${DB_HOST}" -p 5432 &>/dev/null && echo 'healthy' || echo 'unhealthy')",
        "redis": "$(kubectl exec -n "${NAMESPACE}" deployment/astralcore-app -- redis-cli -h "${REDIS_HOST}" ping 2>/dev/null | grep -q PONG && echo 'healthy' || echo 'unhealthy')",
        "application": "$(kubectl exec -n "${NAMESPACE}" deployment/astralcore-app -- curl -f -s http://localhost:3000/api/health &>/dev/null && echo 'healthy' || echo 'unhealthy')"
    },
    "resources": {
        "pods": $(kubectl get pods -n "${NAMESPACE}" -l app=astralcore --field-selector=status.phase=Running | wc -l),
        "services": $(kubectl get services -n "${NAMESPACE}" -l app=astralcore | wc -l),
        "deployments": $(kubectl get deployments -n "${NAMESPACE}" -l app=astralcore | wc -l)
    }
}
EOF
    
    log "INFO" "Deployment report generated: ${report_file}"
    cat "${report_file}"
}

# Main deployment function
main() {
    START_TIME=$(date +%s)
    
    # Initialize logging
    mkdir -p "$(dirname "${DEPLOYMENT_LOG}")"
    
    log "INFO" "Starting AstralCore production deployment..."
    log "INFO" "Script version: 1.0.0"
    log "INFO" "Environment: ${ENVIRONMENT}"
    
    # Parse arguments
    parse_arguments "$@"
    
    # Handle rollback request
    if [[ -n "${ROLLBACK_VERSION:-}" ]]; then
        log "INFO" "Rollback requested to version: ${ROLLBACK_VERSION}"
        validate_prerequisites
        rollback_deployment "${ROLLBACK_VERSION}"
        send_notifications "ROLLBACK_SUCCESS" "${ROLLBACK_VERSION}" "Rollback completed successfully"
        generate_deployment_report "ROLLBACK_SUCCESS"
        exit 0
    fi
    
    # Validate version is provided for new deployment
    if [[ -z "${VERSION:-}" ]]; then
        error_exit "Version must be specified for deployment. Use --version flag or set VERSION environment variable"
    fi
    
    # Store current version for potential rollback
    PREVIOUS_VERSION=$(get_current_version)
    log "INFO" "Current version: ${PREVIOUS_VERSION}"
    log "INFO" "Target version: ${VERSION}"
    
    # Confirmation prompt (unless forced)
    if [[ "${FORCE_DEPLOY:-false}" != "true" ]] && [[ "${DRY_RUN:-false}" != "true" ]]; then
        echo -e "${YELLOW}Are you sure you want to deploy version ${VERSION} to ${ENVIRONMENT}? (y/N)${NC}"
        read -r confirmation
        if [[ ! "${confirmation}" =~ ^[Yy]$ ]]; then
            log "INFO" "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Execute deployment steps
    validate_prerequisites
    create_backup
    pre_deployment_checks
    deploy_new_version
    switch_traffic
    cleanup_old_versions
    
    # Success notification
    send_notifications "DEPLOYMENT_SUCCESS" "${VERSION}" "Deployment completed successfully"
    generate_deployment_report "SUCCESS"
    
    log "INFO" "🎉 Deployment completed successfully!"
    log "INFO" "Version ${VERSION} is now live in ${ENVIRONMENT}"
    log "INFO" "Previous version ${PREVIOUS_VERSION} available for rollback"
    log "INFO" "Deployment duration: $(($(date +%s) - START_TIME)) seconds"
}

# Execute main function with all arguments
main "$@"