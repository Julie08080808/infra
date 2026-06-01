output "robot_account_name" {
  value = module.harbor.robot_account_name
}

output "robot_account_full_name" {
  value = module.harbor.robot_account_full_name
}

output "robot_account_secret" {
  value     = module.harbor.robot_account_secret
  sensitive = true
}
