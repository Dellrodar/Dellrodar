# Deploys the Alembic migration runner Lambda (see lambda_migrate.py).
#
# Idempotent - safe to re-run. On first run it creates the Secrets Manager
# secret, ECR repository, IAM role, and Lambda function. On later runs it
# rebuilds and pushes the image and updates the function code.
#
# Usage:
#   .\deploy_lambda.ps1 -DatabaseUrl "postgresql+asyncpg://...direct-host.../neondb?ssl=require"
#   .\deploy_lambda.ps1              # skip secret update, just rebuild + redeploy code
#
# Invoke after deploying:
#   aws lambda invoke --function-name grazioso-migration-runner --region us-east-2 `
#     --cli-binary-format raw-in-base64-out --payload '{}' out.json
#   Get-Content out.json

param(
    [string]$DatabaseUrl,
    [string]$Region = "us-east-2",
    [string]$FunctionName = "grazioso-migration-runner",
    [string]$RepoName = "grazioso-migration-runner",
    [string]$RoleName = "grazioso-migration-runner-role",
    [string]$SecretName = "grazioso/database-url"
)

$ErrorActionPreference = "Stop"

$account = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) { throw "AWS credentials not configured - run 'aws configure' first" }
$registry = "$account.dkr.ecr.$Region.amazonaws.com"
$imageUri = "${registry}/${RepoName}:latest"

# --- Secret ---------------------------------------------------------------
$secretArn = aws secretsmanager describe-secret --secret-id $SecretName --region $Region --query ARN --output text
if ($LASTEXITCODE -ne 0) {
    if (-not $DatabaseUrl) { throw "Secret $SecretName does not exist yet - pass -DatabaseUrl on first run" }
    Write-Host "Creating secret $SecretName"
    $secretArn = aws secretsmanager create-secret --name $SecretName --region $Region --secret-string $DatabaseUrl --query ARN --output text
} elseif ($DatabaseUrl) {
    Write-Host "Updating secret $SecretName"
    aws secretsmanager put-secret-value --secret-id $SecretName --region $Region --secret-string $DatabaseUrl | Out-Null
}

# --- ECR repository + image ----------------------------------------------
aws ecr describe-repositories --repository-names $RepoName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECR repository $RepoName"
    aws ecr create-repository --repository-name $RepoName --region $Region | Out-Null
}

Write-Host "Building and pushing image"
# cmd pipes raw bytes; a PowerShell 5.1 pipe re-encodes the token and breaks the login
cmd /c "aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $registry"
if ($LASTEXITCODE -ne 0) { throw "docker login failed" }
# provenance/sbom attestations create a manifest list, which Lambda rejects
docker build --platform linux/amd64 --provenance=false --sbom=false -f "$PSScriptRoot\Dockerfile.lambda" -t $imageUri $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }
docker push $imageUri
if ($LASTEXITCODE -ne 0) { throw "docker push failed" }

# --- IAM role -------------------------------------------------------------
$roleArn = aws iam get-role --role-name $RoleName --query Role.Arn --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating IAM role $RoleName"
    $trustPath = Join-Path $env:TEMP "lambda-trust.json"
    @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
'@ | Out-File -Encoding ascii $trustPath
    $roleArn = aws iam create-role --role-name $RoleName --assume-role-policy-document "file://$trustPath" --query Role.Arn --output text
    aws iam attach-role-policy --role-name $RoleName --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

    $secretPolicyPath = Join-Path $env:TEMP "lambda-secret-policy.json"
    @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "$secretArn"
    }
  ]
}
"@ | Out-File -Encoding ascii $secretPolicyPath
    aws iam put-role-policy --role-name $RoleName --policy-name read-database-url-secret --policy-document "file://$secretPolicyPath"

    Write-Host "Waiting for role propagation"
    Start-Sleep -Seconds 12
}

# --- Lambda function ------------------------------------------------------
aws lambda get-function --function-name $FunctionName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating Lambda function $FunctionName"
    aws lambda create-function `
        --function-name $FunctionName `
        --region $Region `
        --package-type Image `
        --code ImageUri=$imageUri `
        --role $roleArn `
        --timeout 120 `
        --memory-size 512 `
        --environment "Variables={DATABASE_URL_SECRET_ARN=$secretArn}" | Out-Null
} else {
    Write-Host "Updating Lambda function code"
    aws lambda update-function-code --function-name $FunctionName --region $Region --image-uri $imageUri | Out-Null
}

aws lambda wait function-active-v2 --function-name $FunctionName --region $Region
Write-Host "Done. Invoke with:"
Write-Host "  aws lambda invoke --function-name $FunctionName --region $Region --cli-binary-format raw-in-base64-out --payload '{}' out.json"
