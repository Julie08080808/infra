output "robot_account_name" {
  value = module.harbor.robot_account_name
}

output "robot_account_secret" {
  value     = module.harbor.robot_account_secret
  sensitive = true
}
