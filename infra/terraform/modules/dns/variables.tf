variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain."
  type        = string
}

variable "vm_public_ip" {
  description = "Public IP of the VM. Cloudflare A record points here directly."
  type        = string
}

variable "domain" {
  description = "Apex domain name (e.g. zeropad.dev)."
  type        = string
}
