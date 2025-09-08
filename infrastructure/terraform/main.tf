# AstralCore Mental Health Platform - Infrastructure as Code
# HIPAA-compliant cloud infrastructure using Terraform
# Supports AWS and Azure deployments

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  
  # Remote state backend configuration
  backend "s3" {
    # Configure via terraform init -backend-config
    # bucket         = "astralcore-terraform-state"
    # key            = "infrastructure/terraform.tfstate"
    # region         = "us-east-1"
    # encrypt        = true
    # dynamodb_table = "astralcore-terraform-locks"
  }
}

# Local variables
locals {
  project_name = "astralcore"
  environment  = var.environment
  
  # Common tags for all resources
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    Purpose     = "mental-health-platform"
    Compliance  = "HIPAA"
    ManagedBy   = "terraform"
    Owner       = var.owner
    CostCenter  = var.cost_center
  }
  
  # HIPAA compliance metadata
  hipaa_tags = {
    "hipaa:compliant"     = "true"
    "hipaa:data-type"     = "phi"
    "hipaa:encryption"    = "required"
    "hipaa:audit-logging" = "enabled"
    "hipaa:backup"        = "encrypted"
  }
  
  # Security tags
  security_tags = {
    "security:level"           = "high"
    "security:network-access"  = "restricted"
    "security:data-at-rest"    = "encrypted"
    "security:data-in-transit" = "encrypted"
    "security:monitoring"      = "enabled"
  }
  
  # Merge all tags
  tags = merge(
    local.common_tags,
    local.hipaa_tags,
    local.security_tags,
    var.additional_tags
  )
}

# Data sources
data "aws_caller_identity" "current" {
  count = var.cloud_provider == "aws" ? 1 : 0
}

data "aws_region" "current" {
  count = var.cloud_provider == "aws" ? 1 : 0
}

data "azurerm_client_config" "current" {
  count = var.cloud_provider == "azure" ? 1 : 0
}

# Random password generation for secure defaults
resource "random_password" "database_password" {
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
  upper   = true
  lower   = true
  numeric = true
}

# TLS certificate for SSL/TLS encryption
resource "tls_private_key" "ca_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "ca_cert" {
  private_key_pem = tls_private_key.ca_key.private_key_pem
  
  subject {
    common_name         = "AstralCore CA"
    organization        = "AstralCore"
    organizational_unit = "Security"
    country            = "US"
    province           = "CA"
    locality           = "San Francisco"
  }
  
  validity_period_hours = 8760 # 1 year
  is_ca_certificate     = true
  
  allowed_uses = [
    "cert_signing",
    "key_encipherment",
    "digital_signature"
  ]
}

# Conditional AWS infrastructure
module "aws_infrastructure" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  source = "./modules/aws"
  
  environment           = var.environment
  project_name          = local.project_name
  tags                  = local.tags
  
  # Network configuration
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  private_subnet_cidrs  = var.private_subnet_cidrs
  public_subnet_cidrs   = var.public_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  
  # EKS configuration
  eks_cluster_version = var.kubernetes_version
  eks_node_groups     = var.eks_node_groups
  
  # Database configuration
  rds_instance_class     = var.database_instance_class
  rds_allocated_storage  = var.database_storage_gb
  rds_engine_version     = var.database_version
  database_password      = random_password.database_password.result
  
  # Cache configuration
  elasticache_node_type = var.redis_node_type
  redis_password        = random_password.redis_password.result
  
  # Security configuration
  enable_waf           = var.enable_waf
  enable_guardduty     = var.enable_guardduty
  enable_config        = var.enable_aws_config
  enable_cloudtrail    = var.enable_cloudtrail
  
  # Backup configuration
  backup_retention_days = var.backup_retention_days
  
  # Monitoring configuration
  enable_cloudwatch_insights = var.enable_cloudwatch_insights
  log_retention_days         = var.log_retention_days
}

# Conditional Azure infrastructure
module "azure_infrastructure" {
  count  = var.cloud_provider == "azure" ? 1 : 0
  source = "./modules/azure"
  
  environment      = var.environment
  project_name     = local.project_name
  tags             = local.tags
  location         = var.azure_location
  
  # Network configuration
  vnet_cidr              = var.vpc_cidr
  private_subnet_cidrs   = var.private_subnet_cidrs
  public_subnet_cidrs    = var.public_subnet_cidrs
  database_subnet_cidrs  = var.database_subnet_cidrs
  
  # AKS configuration
  aks_kubernetes_version = var.kubernetes_version
  aks_node_pools         = var.aks_node_pools
  
  # Database configuration
  postgres_sku_name     = var.database_instance_class
  postgres_storage_mb   = var.database_storage_gb * 1024
  postgres_version      = var.database_version
  database_password     = random_password.database_password.result
  
  # Cache configuration
  redis_sku_name = var.redis_node_type
  redis_password = random_password.redis_password.result
  
  # Security configuration
  enable_security_center = var.enable_security_center
  enable_key_vault       = true
  
  # Backup configuration
  backup_retention_days = var.backup_retention_days
  
  # Monitoring configuration
  enable_log_analytics = var.enable_log_analytics
  log_retention_days   = var.log_retention_days
}

# Kubernetes configuration (common for both AWS and Azure)
module "kubernetes" {
  source = "./modules/kubernetes"
  
  environment  = var.environment
  project_name = local.project_name
  
  # Cluster configuration
  cluster_endpoint = var.cloud_provider == "aws" ? module.aws_infrastructure[0].eks_cluster_endpoint : module.azure_infrastructure[0].aks_cluster_endpoint
  cluster_ca_cert  = var.cloud_provider == "aws" ? module.aws_infrastructure[0].eks_cluster_ca_certificate : module.azure_infrastructure[0].aks_cluster_ca_certificate
  
  # Database connection
  database_host     = var.cloud_provider == "aws" ? module.aws_infrastructure[0].rds_endpoint : module.azure_infrastructure[0].postgres_fqdn
  database_name     = var.database_name
  database_username = var.database_username
  database_password = random_password.database_password.result
  
  # Redis connection
  redis_host     = var.cloud_provider == "aws" ? module.aws_infrastructure[0].elasticache_endpoint : module.azure_infrastructure[0].redis_hostname
  redis_password = random_password.redis_password.result
  
  # Application configuration
  app_image_tag    = var.app_image_tag
  app_replicas     = var.app_replicas
  app_resources    = var.app_resources
  
  # Security configuration
  enable_network_policies = var.enable_network_policies
  enable_pod_security     = var.enable_pod_security_policies
  
  # Monitoring and logging
  enable_prometheus = var.enable_prometheus
  enable_grafana   = var.enable_grafana
  enable_loki      = var.enable_loki
  
  # HIPAA compliance features
  enable_audit_logging = true
  enable_encryption    = true
  enable_backup        = true
  
  depends_on = [
    module.aws_infrastructure,
    module.azure_infrastructure
  ]
}

# SSL/TLS certificates
module "certificates" {
  source = "./modules/certificates"
  
  environment  = var.environment
  project_name = local.project_name
  domain_name  = var.domain_name
  
  # Certificate configuration
  certificate_authority_key  = tls_private_key.ca_key.private_key_pem
  certificate_authority_cert = tls_self_signed_cert.ca_cert.cert_pem
  
  # DNS configuration
  dns_zone_id = var.cloud_provider == "aws" ? module.aws_infrastructure[0].route53_zone_id : module.azure_infrastructure[0].dns_zone_id
  
  depends_on = [
    module.aws_infrastructure,
    module.azure_infrastructure
  ]
}

# Monitoring and observability
module "monitoring" {
  source = "./modules/monitoring"
  
  environment  = var.environment
  project_name = local.project_name
  
  # Monitoring configuration
  prometheus_storage_size = var.prometheus_storage_size
  grafana_admin_password  = var.grafana_admin_password
  
  # Alerting configuration
  alert_email           = var.alert_email
  slack_webhook_url     = var.slack_webhook_url
  pagerduty_service_key = var.pagerduty_service_key
  
  # Log aggregation
  log_retention_days = var.log_retention_days
  
  # HIPAA audit requirements
  enable_audit_dashboard = true
  enable_compliance_alerts = true
  
  depends_on = [
    module.kubernetes
  ]
}

# Backup and disaster recovery
module "backup" {
  source = "./modules/backup"
  
  environment  = var.environment
  project_name = local.project_name
  
  # Backup configuration
  backup_schedule       = var.backup_schedule
  backup_retention_days = var.backup_retention_days
  
  # Database backup
  database_host     = var.cloud_provider == "aws" ? module.aws_infrastructure[0].rds_endpoint : module.azure_infrastructure[0].postgres_fqdn
  database_name     = var.database_name
  database_username = var.database_username
  database_password = random_password.database_password.result
  
  # Storage configuration
  backup_storage_class = var.backup_storage_class
  backup_encryption_key = var.backup_encryption_key
  
  # Disaster recovery
  enable_cross_region_backup = var.enable_cross_region_backup
  dr_region                  = var.disaster_recovery_region
  
  depends_on = [
    module.kubernetes
  ]
}

# Security hardening
module "security" {
  source = "./modules/security"
  
  environment  = var.environment
  project_name = local.project_name
  
  # Security scanning
  enable_vulnerability_scanning = var.enable_vulnerability_scanning
  enable_compliance_scanning    = var.enable_compliance_scanning
  
  # Network security
  enable_network_policies = var.enable_network_policies
  allowed_cidr_blocks     = var.allowed_cidr_blocks
  
  # Encryption configuration
  encryption_key_rotation_days = var.encryption_key_rotation_days
  enable_encryption_at_rest    = true
  enable_encryption_in_transit = true
  
  # HIPAA compliance
  enable_hipaa_logging    = true
  enable_phi_protection   = true
  enable_access_controls  = true
  
  depends_on = [
    module.kubernetes
  ]
}