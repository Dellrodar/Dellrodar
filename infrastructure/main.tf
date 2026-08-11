data "aws_caller_identity" "current" {}

locals {
  artifact_bucket = "grazioso-lambda-artifacts-${data.aws_caller_identity.current.account_id}"
  artifact_key    = "grazioso-migration-runner/lambda_migrate.zip"
}

# The secret's value is intentionally not managed here. The real connection
# string never enters version control or Terraform state; set it with
#   aws secretsmanager put-secret-value --secret-id grazioso/database-url --secret-string "<url>"
resource "aws_secretsmanager_secret" "database_url" {
  name = var.secret_name
}

resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = local.artifact_bucket
}

resource "aws_s3_bucket_public_access_block" "lambda_artifacts" {
  bucket                  = aws_s3_bucket.lambda_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# build_lambda_package.ps1 produces this zip; apply uploads it and rolls the
# Lambda forward when its hash changes.
resource "aws_s3_object" "lambda_package" {
  bucket      = aws_s3_bucket.lambda_artifacts.id
  key         = local.artifact_key
  source      = var.lambda_package_path
  source_hash = filemd5(var.lambda_package_path)
}

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "migration_runner" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.migration_runner.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "read_secret" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.database_url.arn]
  }
}

resource "aws_iam_role_policy" "read_secret" {
  name   = "read-database-url-secret"
  role   = aws_iam_role.migration_runner.name
  policy = data.aws_iam_policy_document.read_secret.json
}

resource "aws_lambda_function" "migration_runner" {
  function_name = var.function_name
  role          = aws_iam_role.migration_runner.arn
  runtime       = "python3.12"
  handler       = "lambda_migrate.handler"
  timeout       = 120
  memory_size   = 512

  s3_bucket        = aws_s3_object.lambda_package.bucket
  s3_key           = aws_s3_object.lambda_package.key
  source_code_hash = filebase64sha256(var.lambda_package_path)

  environment {
    variables = {
      DATABASE_URL_SECRET_ARN = aws_secretsmanager_secret.database_url.arn
      # Dependencies are vendored under vendor/ in the zip; the migration
      # folder alembic/ has no __init__.py, so the real alembic package on
      # this path still wins the import.
      PYTHONPATH = "/var/task/vendor"
    }
  }

  depends_on = [aws_iam_role_policy_attachment.basic_execution]
}
