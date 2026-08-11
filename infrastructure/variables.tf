variable "aws_region" {
  description = "Region hosting the migration runner stack"
  type        = string
  default     = "us-east-2"
}

variable "function_name" {
  description = "Name of the Alembic migration runner Lambda"
  type        = string
  default     = "grazioso-migration-runner"
}

variable "lambda_package_path" {
  description = "Path to the zip built by build_lambda_package.ps1"
  type        = string
  default     = "dist/lambda_migrate.zip"
}

variable "role_name" {
  description = "IAM role the Lambda executes as"
  type        = string
  default     = "grazioso-migration-runner-role"
}

variable "secret_name" {
  description = "Secrets Manager secret holding the database connection string"
  type        = string
  default     = "grazioso/database-url"
}
