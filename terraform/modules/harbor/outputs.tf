output "robot_account_name" {
  value = harbor_robot_account.arc_runner.name
}

output "robot_account_secret" {
  value     = harbor_robot_account.arc_runner.secret
  sensitive = true
}
