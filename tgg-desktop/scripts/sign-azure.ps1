param([Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference = 'Stop'
Import-Module ArtifactSigning -RequiredVersion 0.1.20 -ErrorAction Stop
$params = @{
  Endpoint = $env:TGG_AZURE_SIGNING_ENDPOINT
  CodeSigningAccountName = $env:TGG_AZURE_SIGNING_ACCOUNT
  CertificateProfileName = $env:TGG_AZURE_CERTIFICATE_PROFILE
  Files = $FilePath
  FileDigest = 'SHA256'
  TimestampDigest = 'SHA256'
  TimestampRfc3161 = 'http://timestamp.acs.microsoft.com'
  ExcludeEnvironmentCredential = $true
  ExcludeWorkloadIdentityCredential = $true
  ExcludeManagedIdentityCredential = $true
  ExcludeAzureCliCredential = $false
  ExcludeInteractiveBrowserCredential = $true
}
Invoke-ArtifactSigning @params
