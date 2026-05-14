package encryption

// Deriver identifies which key derivation method was used to encrypt a pad.
// Values must match the KeyDeriver id strings in the frontend's crypto.ts.
type Deriver string

const (
	DeriverPassword Deriver = "password"
	DeriverSIWE     Deriver = "siwe"
)
