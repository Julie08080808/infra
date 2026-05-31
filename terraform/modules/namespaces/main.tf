resource "kubernetes_namespace" "arc_systems" {
  metadata {
    name = "arc-systems"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "kubernetes_namespace" "arc_runners" {
  metadata {
    name = "arc-runners"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "kubernetes_namespace" "harbor" {
  metadata {
    name = "harbor"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}
