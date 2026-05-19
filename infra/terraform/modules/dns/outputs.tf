output "apex_record_id" {
  description = "Cloudflare record ID for the apex A record."
  value       = cloudflare_record.apex.id
}

output "www_record_id" {
  description = "Cloudflare record ID for the www CNAME record."
  value       = cloudflare_record.www.id
}
