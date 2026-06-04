# infra

這個 repo 存放整個專案的基礎設施程式碼（Infrastructure as Code），包含 Terraform modules、自訂 Runner Image、BuildKit Image 以及 Kubernetes manifests。

所有平台元件都透過這個 repo 管理，不手動在 VM 上執行 kubectl apply 或 helm install。

---

## Repository 結構

```
infra/
├── k8s/
│   ├── harbor-certs/       Harbor 憑證相關 manifests
│   └── kyverno/            Kyverno 政策 manifests
│
├── runner-images/
│   ├── arc-runner/         自訂 ARC Runner Image Dockerfile
│   └── buildkit/           BuildKit Image Dockerfile
│
└── terraform/
    ├── main.tf
    ├── variables.tf
    ├── versions.tf
    ├── outputs.tf
    ├── terraform.tfvars        ← 不 commit（含敏感資料）
    ├── terraform.tfvars.example
    └── modules/
        ├── namespaces/         建立所有 K8s namespace
        ├── harbor/             安裝 Harbor + Project + Robot Account
        ├── arc/                安裝 ARC Controller + RunnerScaleSet
        ├── secrets/            建立 K8s secret
        ├── kyverno/            安裝 Kyverno
        ├── runtimeclass/       建立 RuntimeClass kata
        └── argocd_apps/        建立 Argo CD Application
```

> `terraform.tfvars` 和 `terraform.tfstate` 絕對不能 commit。

---

## Terraform 管理的資源

| 資源 | 說明 |
|------|------|
| Namespace | `arc-systems`、`arc-runners`、`harbor`、`monitoring`、staging / production namespace |
| StorageClass | `local-path`（default） |
| Harbor Helm release | 安裝 Harbor 到 VM3 |
| Harbor Project | `ci` project |
| Harbor Robot Account | `arc-runner`（push/pull 權限） |
| ARC Controller | 監聽 GitHub job，動態建立 Runner Pod |
| ARC RunnerScaleSet | 綁定 Kata RuntimeClass + nodeSelector |
| K8s Secrets | `github-app-secret`、`harbor-registry-secret` |
| RuntimeClass | `kata`（讓 Pod 跑在 Kata MicroVM） |
| Kyverno | K8s admission control |
| Argo CD Applications | `youtube-music-bot-staging`、`youtube-music-bot-production` |

---

## 自訂 Runner Image

```
harbor.jlsa.local:30443/ci/arc-runner:v0.4.0
```

位置：`runner-images/arc-runner/Dockerfile`

內建工具：

```
kubectl     buildctl    syft        grype
cosign      jq          yq          git
curl        node        npm         tsc
python3
```

**為什麼要自訂 image：**
不需要每次 CI job 臨時下載工具，減少外網依賴，工具版本集中管理。

**Build 和 Push（在 VM2 執行）：**

```bash
docker login harbor.jlsa.local:30443

docker build \
  -t harbor.jlsa.local:30443/ci/arc-runner:v0.4.0 \
  -f runner-images/arc-runner/Dockerfile \
  runner-images/arc-runner/

docker push harbor.jlsa.local:30443/ci/arc-runner:v0.4.0
```

更新 image 版本後，修改 `terraform/modules/arc/main.tf` 裡的 image tag，再執行 `terraform apply`。

---

## 使用方式

### 初次部署

```bash
# Clone repo 到 VM1
git clone https://github.com/Julie08080808/infra.git
cd infra/terraform

# 複製範本並填入真實值
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 執行
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

### 更新設定

修改對應的 `.tf` 檔案，然後：

```bash
terraform plan   # 確認變更內容
terraform apply  # 套用
```

### 查看目前狀態

```bash
terraform show
terraform state list
```

---

## terraform.tfvars 需要填寫的值

```hcl
harbor_admin_password      = "Harbor 管理員密碼"
github_token               = "GitHub PAT"
github_owner               = "GitHub 帳號"
github_app_id              = "GitHub App ID"
github_app_installation_id = "GitHub App Installation ID"
harbor_url                 = "https://VM3_IP:30443"
harbor_runner_username     = "robot$arc-runner"
harbor_runner_password     = "Robot Account secret"
gitops_repo_token          = "操作 GitOps repo 的 PAT"

github_app_private_key = <<EOT
-----BEGIN RSA PRIVATE KEY-----
.pem 檔案內容
-----END RSA PRIVATE KEY-----
EOT
```

---

## 相關 Repository

```
youtube-music-bot          App 程式碼與 GitHub Actions workflows
youtube-music-bot-gitops   GitOps 部署 manifests
infra                      本 repo，基礎設施管理
```

