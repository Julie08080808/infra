locals {
  harbor_primary_registry = replace(var.harbor_url, "https://", "")

  harbor_registry_hosts = distinct(concat(
    [local.harbor_primary_registry],
    var.harbor_registry_aliases
  ))

  harbor_docker_auths = {
    for registry_host in local.harbor_registry_hosts :
    registry_host => {
      username = var.harbor_runner_username
      password = var.harbor_runner_password
      auth     = base64encode("${var.harbor_runner_username}:${var.harbor_runner_password}")
    }
  }
}

resource "kubernetes_secret" "harbor_registry_secret" {
  metadata {
    name      = "harbor-registry-secret"
    namespace = "arc-runners"
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = local.harbor_docker_auths
    })
  }
}

resource "kubernetes_secret" "harbor_registry_secret_extra" {
  for_each = toset(var.extra_image_pull_secret_namespaces)

  metadata {
    name      = "harbor-registry-secret"
    namespace = each.value
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = local.harbor_docker_auths
    })
  }
}

