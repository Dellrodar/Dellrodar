# Infrastructure

Terraform for the Alembic migration runner Lambda, ported from `grazioso_animal_shelter/backend/deploy_lambda.ps1`. Terraform owns everything except building the deployment package: the Secrets Manager secret, the artifacts S3 bucket, the IAM role, and the Lambda itself. `build_lambda_package.ps1` builds the zip; `terraform apply` uploads it to S3 and rolls the Lambda forward whenever the zip's hash changes.

Everything lives in **us-east-2**, the same region as the Neon database. The secret, role, and function already exist in account 363454423518 (created by the retired PowerShell deploy script); `imports.tf` adopts them when the local state is fresh and is inert once they are in state. The switch from the original container-image deploy means the next apply **replaces** the function (Image to Zip) and forgets the old ECR repository without deleting it. The function is stateless, so the replacement is safe.

## Prerequisites

- Terraform >= 1.7 (`winget install HashiCorp.Terraform`)
- AWS CLI configured for account 363454423518 (`aws configure`)
- Docker Desktop running (the package build runs pip inside linux/amd64 python:3.12)

## Deploy flow

```powershell
cd infrastructure
.\build_lambda_package.ps1   # builds dist/lambda_migrate.zip
terraform init               # first time only
terraform apply              # uploads the zip, creates/updates the stack
```

Then run migrations against the deployed database from `grazioso_animal_shelter/`:

```powershell
make migrate-deployed
```

which invokes the Lambda with an empty payload, running `alembic upgrade head`. The response reports the alembic revision before and after. Other actions: pass `{"action": "downgrade", "revision": "<target>"}` or `{"action": "stamp", ...}` via `aws lambda invoke` directly.

On the first apply after the container-to-zip switch expect: the S3 bucket, public access block, and package object created, and the Lambda replaced (Image → Zip). After that, a routine code deploy plans as one changed `aws_s3_object` and one in-place Lambda update.

## Package layout

The zip mirrors the old container image's task root: `lambda_migrate.py`, `alembic.ini`, `alembic/` (migration scripts), and `app/` at the root, with all pip dependencies under `vendor/`. The function sets `PYTHONPATH=/var/task/vendor` so imports find them; the migrations folder `alembic/` has no `__init__.py`, so the real alembic library in `vendor/` still wins the import.

## Secret value

Terraform manages the secret container only, never its value, so the connection string stays out of state and version control. To rotate it:

```powershell
aws secretsmanager put-secret-value --secret-id grazioso/database-url --region us-east-2 --secret-string "<postgresql+asyncpg url with ?ssl=require>"
```

Use the Neon **direct** endpoint here, not the pooler; Alembic holds session-level locks that pooling interferes with.

## Cleanup of the old container flow

Once the zip flow is verified, the ECR repository from the old script is orphaned and can be deleted:

```powershell
aws ecr delete-repository --repository-name grazioso-migration-runner --region us-east-2 --force
```

## Notes

- State is local (`terraform.tfstate`, gitignored). Fine for a single-operator course project; a remote backend would be the next step if anyone else ever runs this.
- `terraform plan`/`apply` need `dist/lambda_migrate.zip` to exist — run the build script first.
- `deploy_lambda.ps1` is superseded by this folder but kept for reference.
