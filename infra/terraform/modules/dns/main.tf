terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

resource "cloudflare_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "A"
  content = var.vm_public_ip
  proxied = true
  ttl     = 1
  comment = "Managed by Terraform — zeropad VM"
}

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  type    = "A"
  content = var.vm_public_ip
  proxied = true
  ttl     = 1
  comment = "Managed by Terraform — zeropad API"
}

resource "cloudflare_record" "www" {
  zone_id         = var.cloudflare_zone_id
  name            = "www"
  type            = "CNAME"
  content         = var.domain
  proxied         = true
  ttl             = 1
  comment         = "Managed by Terraform — zeropad www"
  allow_overwrite = true
}
