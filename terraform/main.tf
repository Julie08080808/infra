provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

provider "harbor" {
  url      = var.harbor_url
  username = "admin"
  password = var.harbor_admin_password
  insecure = true
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}

# Namespaces
module "namespaces" {
  source = "./modules/namespaces"
}

# local-path-provisioner
resource "helm_release" "local_path_provisioner" {
  name             = "local-path-provisioner"
  repository       = "https://charts.containeroo.ch"
  chart            = "local-path-provisioner"
  namespace        = "local-path-storage"
  create_namespace = true

  set {
    name  = "storageClass.defaultClass"
    value = "true"
  }
}

# Harbor
module "harbor" {
  source = "./modules/harbor"

  harbor_admin_password = var.harbor_admin_password

  providers = {
    helm   = helm
    harbor = harbor
  }

  depends_on = [
    module.namespaces,
    helm_release.local_path_provisioner
  ]
}

# Secrets
module "secrets" {
  source = "./modules/secrets"

  harbor_url             = var.harbor_url
  harbor_runner_username = var.harbor_runner_username
  harbor_runner_password = var.harbor_runner_password

  depends_on = [module.namespaces]
}


# ARC
module "arc" {
  source = "./modules/arc"

  github_app_id              = var.github_app_id
  github_app_installation_id = var.github_app_installation_id
  github_app_private_key     = var.github_app_private_key
  github_owner               = var.github_owner
  github_repo                = "youtube-music-bot"

  depends_on = [
    module.namespaces,
    module.secrets
  ]
}
