import hashlib
import time

class Block:
    def __init__(self, index, timestamp, data, previous_hash):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()

    def calculate_hash(self):
        """Generate SHA-256 hash for the block."""
        block_string = str(self.index) + str(self.timestamp) + str(self.data) + str(self.previous_hash)
        return hashlib.sha256(block_string.encode()).hexdigest()


class Blockchain:
    def __init__(self):
        # create the first block (genesis block)
        self.chain = [self.create_genesis_block()]

    def create_genesis_block(self):
        """Manually create the first block (Genesis Block)."""
        return Block(0, time.ctime(), "Genesis Block", "0")

    def get_latest_block(self):
        return self.chain[-1]

    def add_block(self, new_data):
        """Add a block with new data to the chain."""
        prev_block = self.get_latest_block()
        new_block = Block(len(self.chain), time.ctime(), new_data, prev_block.hash)
        self.chain.append(new_block)

    def is_chain_valid(self):
        """Check the validity of the blockchain."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            prev = self.chain[i-1]

            if current.hash != current.calculate_hash():
                print("Block", i, "has been tampered!")
                return False
            if current.previous_hash != prev.hash:
                print("Block", i, "previous hash does not match!")
                return False
        return True


# ---------- Example usage ----------
my_chain = Blockchain()
my_chain.add_block("Alice pays Bob 10 coins")
my_chain.add_block("Bob pays Charlie 5 coins")
my_chain.add_block("Charlie pays Dave 2 coins")

# Print blockchain
for block in my_chain.chain:
    print("Index:", block.index)
    print("Timestamp:", block.timestamp)
    print("Data:", block.data)
    print("Hash:", block.hash)
    print("Previous Hash:", block.previous_hash)
    print("-" * 50)

# Validate blockchain
print("Is blockchain valid?", my_chain.is_chain_valid())