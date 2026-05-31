variable "harbor_url" {
  description = "Harbor registry URL"
  default     = "https://10.32.20.51:30443"
}

variable "harbor_admin_password" {
  description = "Harbor admin password"
  sensitive   = true
}

variable "github_token" {
  description = "GitHub Personal Access Token"
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub owner/organization"
  default     = "Julie08080808"
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  default     = "~/.kube/config"
}
