# Builds dist/lambda_migrate.zip, the migration runner's deployment package.
# Terraform uploads it to S3 and rolls the Lambda forward when its hash
# changes, so the deploy flow is:
#
#   .\build_lambda_package.ps1
#   terraform apply
#   make migrate-deployed        # from grazioso_animal_shelter/
#
# Dependencies are installed inside a linux/amd64 python:3.12 container so the
# native wheels (asyncpg, pydantic-core, greenlet) match the Lambda runtime.
# They land in vendor/, which the function's PYTHONPATH points at; the app
# files sit at the zip root exactly like the container image's task root did.

param(
    [string]$PythonImage = "python:3.12-slim"
)

$ErrorActionPreference = "Stop"

$backendDir = Join-Path (Split-Path $PSScriptRoot -Parent) "grazioso_animal_shelter\backend"
$distDir = Join-Path $PSScriptRoot "dist"
New-Item -ItemType Directory -Force $distDir | Out-Null

docker run --rm --platform linux/amd64 `
    -v "${backendDir}:/src:ro" `
    -v "${distDir}:/dist" `
    $PythonImage sh -c @'
set -e
pip install --quiet --no-cache-dir -r /src/requirements.txt boto3 --target /build/out/vendor
cp -r /src/alembic /build/out/alembic
cp -r /src/app /build/out/app
cp /src/alembic.ini /src/lambda_migrate.py /build/out/
find /build/out -type d -name __pycache__ -exec rm -rf {} +
cd /build/out
python -m zipfile -c /dist/lambda_migrate.zip alembic alembic.ini app lambda_migrate.py vendor
'@
if ($LASTEXITCODE -ne 0) { throw "package build failed" }

$zip = Join-Path $distDir "lambda_migrate.zip"
$sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Built $zip ($sizeMb MB). Deploy with: terraform apply"
