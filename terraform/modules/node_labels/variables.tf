variable "ci_node_name" {
  description = "Kubernetes node name for CI worker"
  type        = string
  default     = "node2"
}

variable "production_node_name" {
  description = "Kubernetes node name for staging and production worker"
  type        = string
  default     = "node3"
}
