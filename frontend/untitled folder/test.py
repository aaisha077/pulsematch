import subprocess

def generate_rsa_keys(private_key_file="private.pem", public_key_file="public.pem", bits=2048):
    # Generate private key
    subprocess.run([
        "openssl", "genpkey",
        "-algorithm", "RSA",
        "-pkeyopt", f"rsa_keygen_bits:{bits}",
        "-out", private_key_file
    ], check=True)

    # Generate public key from private key
    subprocess.run([
        "openssl", "pkey",
        "-in", private_key_file,
        "-pubout",
        "-out", public_key_file
    ], check=True)

    # Read and print the public key
    with open(public_key_file, "r") as f:
        public_key_content = f.read()

    print(f"Keys generated successfully")
    print(f"Private key saved in: {private_key_file}")
    print(f"Public key saved in: {public_key_file}\n")
    print("Public Key (PEM format):\n")
    print(public_key_content)

# Example usage
generate_rsa_keys()