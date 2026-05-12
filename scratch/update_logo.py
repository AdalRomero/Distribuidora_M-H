import os

scratch_path = r'scratch\logo_b64.txt'
target_path = r'constants\logo_base64.ts'

# Read the base64 string. 
# We need to be careful with encoding since it was written by PowerShell Out-File which defaults to UTF-16LE in some versions or has a BOM.
# However, run_command output showed it as plain text. 
# Let's try to read it as bytes and decode, or just use PowerShell to do the replacement if it's easier.

# Actually, let's use PowerShell to do the replacement directly, it's more idiomatic for this environment.
# $b64 = Get-Content scratch\logo_b64.txt -Raw
# $content = 'export const LOGO_MH_B64 = "data:image/svg+xml;base64,' + $b64.Trim() + '";'
# Set-Content constants\logo_base64.ts $content -Encoding UTF8
