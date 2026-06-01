resource "kubernetes_secret" "harbor_registry_secret" {
  metadata {
    name      = "harbor-registry-secret"
    namespace = "arc-runners"
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        # 自動濾除 https://，變成 K8s 認得的 10.32.20.51:30443
        (replace(var.harbor_url, "https://", "")) = {
          username = var.harbor_runner_username
          password = var.harbor_runner_password
          auth     = base64encode("${var.harbor_runner_username}:${var.harbor_runner_password}")
        }
      }
    })
  }
}
