output "vm_public_ip" {
  description = "Public IP of the VM — Cloudflare A record and SSH both point here."
  value       = module.compute.vm_public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the VM."
  value       = "ssh opc@${module.compute.vm_public_ip}"
}

output "object_storage_namespace" {
  description = "OCI Object Storage namespace (needed for future S3-compat config)."
  value       = data.oci_objectstorage_namespace.ns.namespace
}

output "frontend_api_url" {
  description = "Set this as NEXT_PUBLIC_API_URL in GitHub Actions variables."
  value       = "https://${var.domain}"
}
