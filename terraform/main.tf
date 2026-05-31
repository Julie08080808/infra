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

  depends_on = [helm_release.local_path_provisioner]
}

# ARC
module "arc" {
  source = "./modules/arc"

  depends_on = [module.namespaces]
}
