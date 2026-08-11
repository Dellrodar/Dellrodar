output "lambda_function_name" {
  description = "Invoke this function to run alembic upgrade head against the deployed database"
  value       = aws_lambda_function.migration_runner.function_name
}

output "artifact_bucket" {
  description = "S3 bucket holding the Lambda deployment package"
  value       = aws_s3_bucket.lambda_artifacts.bucket
}

output "artifact_key" {
  description = "S3 key of the Lambda deployment package"
  value       = aws_s3_object.lambda_package.key
}

output "secret_arn" {
  description = "Secrets Manager secret the Lambda reads DATABASE_URL from"
  value       = aws_secretsmanager_secret.database_url.arn
}
