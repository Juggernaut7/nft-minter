# NFT Minter Setup Guide

## Prerequisites

Before setting up the NFT Minter project, ensure you have the following installed:

### Required Software
- **Node.js** (v16 or higher)
- **Rust** (latest stable version)
- **Solana CLI** (latest version)
- **Anchor CLI** (latest version)

### System Requirements
- **Operating System**: macOS, Linux, or Windows (WSL recommended for Windows)
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: At least 10GB free space
- **Network**: Stable internet connection

## Installation Steps

### 1. Install Rust

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart your terminal or run:
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### 2. Install Solana CLI

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

### 3. Install Anchor CLI

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Verify installation
avm --version
```

### 4. Install Node.js Dependencies

```bash
# Install project dependencies
npm install

# Or using yarn
yarn install
```

## Project Setup

### 1. Clone and Navigate

```bash
# Clone the repository
git clone <your-repo-url>
cd nft-minter

# Install dependencies
npm install
```

### 2. Configure Solana

```bash
# Set Solana to devnet for development
solana config set --url devnet

# Create a new wallet (if you don't have one)
solana-keygen new

# Check your wallet
solana address

# Airdrop SOL for testing (devnet only)
solana airdrop 2
```

### 3. Configure Anchor

```bash
# Build the project
anchor build

# Generate program ID
solana address -k target/deploy/nft_minter-keypair.json

# Update Anchor.toml with the generated program ID
# Update the declare_id!() in lib.rs with the same ID
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
ANCHOR_WALLET=~/.config/solana/id.json
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_CLUSTER=devnet
```

## Building and Testing

### 1. Build the Program

```bash
# Build the Anchor program
anchor build

# Verify build artifacts
ls target/deploy/
```

### 2. Run Tests

```bash
# Start local validator (in a separate terminal)
solana-test-validator

# Run the test suite
anchor test

# Run specific tests
anchor test tests/nft_minter_test.ts

# Run with verbose output
anchor test -- --verbose
```

### 3. Deploy to Devnet

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <PROGRAM_ID> --url devnet
```

## Development Workflow

### 1. Local Development

```bash
# Start local validator
solana-test-validator

# In another terminal, run tests
anchor test

# Make changes and rebuild
anchor build
anchor test
```

### 2. Devnet Testing

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests against devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com anchor test
```

### 3. Program Updates

```bash
# After making changes
anchor build
anchor deploy --provider.cluster devnet

# Verify the update
solana program show <PROGRAM_ID> --url devnet
```

## Troubleshooting

### Common Issues

#### 1. Build Errors

```bash
# Clean and rebuild
anchor clean
anchor build

# Check Rust version
rustc --version
```

#### 2. Test Failures

```bash
# Check Solana validator
solana-test-validator --reset

# Verify wallet configuration
solana config get
```

#### 3. Deployment Issues

```bash
# Check network status
solana cluster-version --url devnet

# Verify wallet balance
solana balance --url devnet
```

#### 4. Dependency Issues

```bash
# Update dependencies
cargo update
npm update

# Clean and reinstall
rm -rf node_modules
npm install
```

### Performance Optimization

#### 1. Build Optimization

```bash
# Use release build for production
cargo build --release

# Enable LTO for smaller binary size
# (Already configured in Cargo.toml)
```

#### 2. Test Optimization

```bash
# Run tests in parallel
anchor test -- --parallel

# Use specific test filters
anchor test -- --grep "NFT Minting"
```

## Production Deployment

### 1. Mainnet Preparation

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Verify wallet has sufficient SOL
solana balance

# Deploy with caution
anchor deploy --provider.cluster mainnet-beta
```

### 2. Security Checklist

- [ ] Program ID is final and verified
- [ ] All tests pass on mainnet
- [ ] Wallet has sufficient SOL for deployment
- [ ] Program logic is thoroughly reviewed
- [ ] Error handling is comprehensive

### 3. Monitoring

```bash
# Monitor program logs
solana logs <PROGRAM_ID> --url mainnet-beta

# Check program account
solana program show <PROGRAM_ID> --url mainnet-beta
```

## Next Steps

After successful setup:

1. **Read the API Documentation** (`docs/api.md`)
2. **Review Usage Examples** (`docs/usage.md`)
3. **Run the Test Suite** to verify functionality
4. **Deploy to Devnet** for testing
5. **Integrate with Frontend** applications
6. **Submit to Codigo DevQuest** #3

## Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review Anchor documentation** at https://book.anchor-lang.com/
3. **Check Solana documentation** at https://docs.solana.com/
4. **Review Metaplex documentation** at https://docs.metaplex.com/

## Contributing

To contribute to the project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

**Happy Building! 🚀** 