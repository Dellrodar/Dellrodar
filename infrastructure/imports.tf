# Adoption and retirement plumbing.
#
# The import blocks adopt the stack originally created by deploy_lambda.ps1
# when the local state is fresh; they are inert when the resources are already
# in state. The Lambda imports as a container-image function and is then
# replaced, because this configuration packages it as a zip served from S3.
#
# The removed block drops the old ECR repository from state without deleting
# it. Once the zip flow is verified, delete the repository manually:
#   aws ecr delete-repository --repository-name grazioso-migration-runner --region us-east-2 --force

removed {
  from = aws_ecr_repository.migration_runner

  lifecycle {
    destroy = false
  }
}

import {
  to = aws_secretsmanager_secret.database_url
  id = "arn:aws:secretsmanager:us-east-2:363454423518:secret:grazioso/database-url-5lshSn"
}

import {
  to = aws_iam_role.migration_runner
  id = "grazioso-migration-runner-role"
}

import {
  to = aws_iam_role_policy_attachment.basic_execution
  id = "grazioso-migration-runner-role/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

import {
  to = aws_iam_role_policy.read_secret
  id = "grazioso-migration-runner-role:read-database-url-secret"
}

import {
  to = aws_lambda_function.migration_runner
  id = "grazioso-migration-runner"
}
