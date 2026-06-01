variable "harbor_url" {
  description = "Harbor registry URL (e.g., https://10.32.20.51:30443)"
  type        = string
}

variable "harbor_runner_username" {
  description = "Harbor Robot Account username"
  type        = string
}

variable "harbor_runner_password" {
  description = "Harbor Robot Account password"
  type        = string
  sensitive   = true
}
