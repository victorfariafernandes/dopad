variable "compartment_ocid" {
  description = "OCI compartment OCID."
  type        = string
}

variable "availability_domain" {
  description = "OCI availability domain name."
  type        = string
}

variable "block_volume_size_gbs" {
  description = "Block volume size in GB."
  type        = number
  default     = 50
}

variable "object_storage_namespace" {
  description = "OCI Object Storage namespace."
  type        = string
}
