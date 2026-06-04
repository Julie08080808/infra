resource "kubernetes_labels" "ci_worker_labels" {
  api_version = "v1"
  kind        = "Node"

  metadata {
    name = var.ci_node_name
  }

  labels = {
    "node-role.kubernetes.io/ci-worker" = "true"
    "dedicated"                         = "ci-security"
  }
}

resource "kubernetes_labels" "production_worker_labels" {
  api_version = "v1"
  kind        = "Node"

  metadata {
    name = var.production_node_name
  }

  labels = {
    "node-role.kubernetes.io/production-worker" = "true"
    "dedicated"                                 = "production-storage"
  }
}
