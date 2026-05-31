terraform {
  required_providers {
    harbor = {
      source  = "goharbor/harbor"
      version = "~> 3.10"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }
}
