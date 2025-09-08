# AstralCore Infrastructure Variables
# HIPAA-compliant mental health platform infrastructure configuration

# General Configuration
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "astralcore"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "AstralCore Team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "mental-health-platform"
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Cloud Provider Configuration
variable "cloud_provider" {
  description = "Cloud provider to use (aws or azure)"
  type        = string
  default     = "aws"
  validation {
    condition     = contains(["aws", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be aws or azure."
  }
}

variable "azure_location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC/VNet"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# Kubernetes Configuration
variable "kubernetes_version" {
  description = "Kubernetes cluster version"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "EKS node group configuration"
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
    capacity_type  = string
  }))
  default = {
    general = {
      instance_types = ["t3.large"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 50
      capacity_type  = "ON_DEMAND"
    }
    compute = {
      instance_types = ["c5.xlarge"]
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 100
      capacity_type  = "SPOT"
    }
  }
}

variable "aks_node_pools" {
  description = "AKS node pool configuration"
  type = map(object({
    vm_size    = string
    min_count  = number
    max_count  = number
    node_count = number
    disk_size  = number
  }))
  default = {
    general = {
      vm_size    = "Standard_D4s_v3"
      min_count  = 2
      max_count  = 10
      node_count = 3
      disk_size  = 50
    }
    compute = {
      vm_size    = "Standard_F8s_v2"
      min_count  = 1
      max_count  = 5
      node_count = 2
      disk_size  = 100
    }
  }
}

# Database Configuration
variable "database_instance_class" {
  description = "Database instance class/SKU"
  type        = string
  default     = "db.t3.large"
}

variable "database_storage_gb" {
  description = "Database storage size in GB"
  type        = number
  default     = 100
  validation {
    condition     = var.database_storage_gb >= 20
    error_message = "Database storage must be at least 20 GB."
  }
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "astralcore"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "astralcore_admin"
  sensitive   = true
}

variable "backup_retention_days" {
  description = "Database backup retention period in days"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days for HIPAA compliance."
  }
}

# Cache Configuration
variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

# Application Configuration
variable "app_image_tag" {
  description = "Application Docker image tag"
  type        = string
  default     = "latest"
}

variable "app_replicas" {
  description = "Number of application replicas"
  type        = number
  default     = 3
  validation {
    condition     = var.app_replicas >= 2
    error_message = "At least 2 replicas required for high availability."
  }
}

variable "app_resources" {
  description = "Application resource requests and limits"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "500m"
      memory = "1Gi"
    }
    limits = {
      cpu    = "2000m"
      memory = "4Gi"
    }
  }
}

# Security Configuration
variable "enable_waf" {
  description = "Enable Web Application Firewall"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
}

variable "enable_aws_config" {
  description = "Enable AWS Config"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable AWS CloudTrail"
  type        = bool
  default     = true
}

variable "enable_security_center" {
  description = "Enable Azure Security Center"
  type        = bool
  default     = true
}

variable "enable_network_policies" {
  description = "Enable Kubernetes network policies"
  type        = bool
  default     = true
}

variable "enable_pod_security_policies" {
  description = "Enable Pod Security Policies"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = []
}

variable "encryption_key_rotation_days" {
  description = "Number of days between encryption key rotations"
  type        = number
  default     = 90
  validation {
    condition     = var.encryption_key_rotation_days <= 365
    error_message = "Key rotation must occur at least annually for HIPAA compliance."
  }
}

variable "enable_vulnerability_scanning" {
  description = "Enable container vulnerability scanning"
  type        = bool
  default     = true
}

variable "enable_compliance_scanning" {
  description = "Enable HIPAA compliance scanning"
  type        = bool
  default     = true
}

# SSL/TLS Configuration
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "astralcore.app"
}

# Monitoring Configuration
variable "enable_prometheus" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "enable_grafana" {
  description = "Enable Grafana dashboards"
  type        = bool
  default     = true
}

variable "enable_loki" {
  description = "Enable Loki log aggregation"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_insights" {
  description = "Enable CloudWatch Container Insights"
  type        = bool
  default     = true
}

variable "enable_log_analytics" {
  description = "Enable Azure Log Analytics"
  type        = bool
  default     = true
}

variable "prometheus_storage_size" {
  description = "Prometheus storage size"
  type        = string
  default     = "50Gi"
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 90
  validation {
    condition     = var.log_retention_days >= 30
    error_message = "Log retention must be at least 30 days for HIPAA compliance."
  }
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = null
}

# Alerting Configuration
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "alerts@astralcore.app"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = null
}

variable "pagerduty_service_key" {
  description = "PagerDuty service integration key"
  type        = string
  sensitive   = true
  default     = null
}

# Backup Configuration
variable "backup_schedule" {
  description = "Backup schedule in cron format"
  type        = string
  default     = "0 2 * * *" # Daily at 2 AM
}

variable "backup_storage_class" {
  description = "Storage class for backups"
  type        = string
  default     = "GLACIER"
}

variable "backup_encryption_key" {
  description = "KMS key for backup encryption"
  type        = string
  sensitive   = true
  default     = null
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

variable "disaster_recovery_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

# HIPAA Compliance Configuration
variable "enable_hipaa_logging" {
  description = "Enable HIPAA-compliant audit logging"
  type        = bool
  default     = true
}

variable "enable_phi_protection" {
  description = "Enable PHI data protection measures"
  type        = bool
  default     = true
}

variable "enable_access_controls" {
  description = "Enable strict access controls"
  type        = bool
  default     = true
}

# Development and Testing
variable "enable_development_tools" {
  description = "Enable development and debugging tools"
  type        = bool
  default     = false
}

variable "enable_test_data" {
  description = "Enable test data population"
  type        = bool
  default     = false
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for non-critical workloads"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable cluster auto-scaling"
  type        = bool
  default     = true
}

variable "scale_down_delay_after_add" {
  description = "Time to wait before scaling down after scale up"
  type        = string
  default     = "10m"
}

variable "scale_down_unneeded_time" {
  description = "Time a node should be unneeded before eligible for scale down"
  type        = string
  default     = "10m"
}

# Feature Flags
variable "enable_ai_features" {
  description = "Enable AI-powered mental health features"
  type        = bool
  default     = true
}

variable "enable_crisis_detection" {
  description = "Enable crisis detection capabilities"
  type        = bool
  default     = true
}

variable "enable_peer_support" {
  description = "Enable peer support community features"
  type        = bool
  default     = true
}

variable "enable_professional_services" {
  description = "Enable professional mental health services"
  type        = bool
  default     = true
}

# Validation Rules for Production Environment
variable "production_validations" {
  description = "Additional validations for production environment"
  type = object({
    min_node_count          = number
    required_backup_regions = list(string)
    required_monitoring     = bool
    required_security_scans = bool
  })
  default = {
    min_node_count          = 3
    required_backup_regions = ["us-west-2"]
    required_monitoring     = true
    required_security_scans = true
  }
  
  validation {
    condition = var.environment == "production" ? var.production_validations.min_node_count >= 3 : true
    error_message = "Production environment must have at least 3 nodes for high availability."
  }
  
  validation {
    condition = var.environment == "production" ? var.production_validations.required_monitoring == true : true
    error_message = "Production environment must have monitoring enabled."
  }
}