output "subnet_id" {
  description = "OCID of the primary public subnet (AD-1)."
  value       = oci_core_subnet.public.id
}

output "vcn_id" {
  description = "OCID of the VCN."
  value       = oci_core_vcn.this.id
}
