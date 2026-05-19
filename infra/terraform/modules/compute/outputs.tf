output "vm_public_ip" {
  description = "Public IP of the VM."
  value       = oci_core_instance.this.public_ip
}

output "vm_private_ip" {
  description = "Private IP of the VM (used by the load balancer backend)."
  value       = oci_core_instance.this.private_ip
}
