# @theothergothamdev/pancakeswap-v3-sdk

<!-- [START badges] -->

[![NPM version](https://img.shields.io/npm/v/@theothergothamdev/pancakeswap-v3-sdk.svg)](https://www.npmjs.com/package/@theothergothamdev/pancakeswap-v3-sdk)
[![NPM downloads](https://img.shields.io/npm/dm/@theothergothamdev/pancakeswap-v3-sdk.svg)](https://www.npmjs.com/package/@theothergothamdev/pancakeswap-v3-sdk)

![build](https://github.com/theothergothamdev/pancakeswap-v3-sdk-nodejs/actions/workflows/build.yml/badge.svg)

<!-- [END badges] -->

This is a small wrapper around the official PancakeSwap SDK, designed to simplify interactions with the PancakeSwap V3 API.

## Disclaimer

⚠️ This SDK is **not affiliated with or endorsed by PancakeSwap**. Usage must comply with PancakeSwap's terms of service. The authors are not responsible for any misuse of the API or any financial losses incurred through its use.

## Features

- Lightweight wrapper for PancakeSwap V3 SDK
- Simplified API interactions
- TypeScript support

## Installation

```bash
npm install @theothergothamdev/pancakeswap-v3-sdk
```

## Usage

### Importing the SDK

```javascript
import { PancakeSwapV3TokenSwap } from "@theothergothamdev/pancakeswap-v3-sdk";
import { Token } from "@pancakeswap/sdk";
import { Wallet } from "ethers";
```

### Initializing the SDK

```javascript
// Initialize with default BSC network
const swap = new PancakeSwapV3TokenSwap();

// Or with custom configuration
const swap = new PancakeSwapV3TokenSwap(
  "https://bsc-dataseed.binance.org/",
  "0x1b81D678ffb9C0263b24A97847620C99d213eB14", // Swap Router
  "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997", // Quoter
  "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"  // Factory
);
```

### Fetching Token Prices

```javascript
// Create token instances
const token0 = new Token(
  56, // BSC chain ID
  "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", // CAKE token
  18
);
const token1 = new Token(
  56,
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB token
  18
);

// Get price information
const price = await swap.fetchPrice(token0, token1);
console.log(`Price of ${price.token0} in ${price.token1}: ${price.value}`);
console.log(`Price of ${price.token1} in ${price.token0}: ${price.invert()}`);
```

### Checking Balances

```javascript
const address = "0xYourWalletAddress";

// Check token balance
const tokenBalance = await swap.checkBalance(token0, address);
console.log(`Token balance: ${tokenBalance}`);

// Check BNB balance
const bnbBalance = await swap.checkBNBBalance(address);
console.log(`BNB balance: ${bnbBalance}`);
```

### Performing Token Swaps

```javascript
// Create a wallet instance
const wallet = new Wallet("YOUR_PRIVATE_KEY", provider);

// Approve tokens for swapping
await swap.approveToken(token0, "1.0", wallet); // Approve 1.0 tokens

// Perform the swap
await swap.simpleSwap(
  "1.0",           // Amount to swap
  token0,          // Token to swap from
  token1,          // Token to swap to
  wallet,          // Wallet instance
  0.5              // Slippage percentage (0.5%)
);
```

### Error Handling

```javascript
try {
  await swap.simpleSwap("1.0", token0, token1, wallet);
} catch (error) {
  if (error.message === "Zero output amount, cannot proceed with the trade.") {
    console.error("Insufficient liquidity for this trade");
  } else if (error.message === "No pair address found for the provided token pair.") {
    console.error("Trading pair does not exist");
  } else {
    console.error("An error occurred:", error);
  }
}
```

## Contributing

Feel free to open issues or submit pull requests if you find any bugs or have suggestions for improvements. If you're feeling generous and want to send me a tip, that'd also be welcome!

## Support

If you find this project useful, consider giving it a ⭐ on GitHub! Your support helps keep development active. 🚀

| Crypto                    | Address                                      |
| ------------------------- | -------------------------------------------- |
| Binance Smart Chain (BSC) | 0x32a1511e239a4c28f5c75b52f16f34d59783c55e   |
| Ethereum (ETH)            | 0x32a1511e239a4c28f5c75b52f16f34d59783c55e   |
| Solana (SOL)              | GjCAtQni2NU9xpCvTBqQVL7wN9TdY9WXiXyQ3ZRiN6LR |

### Disclaimer
Donations are **voluntary and non-refundable**. Contributing funds does **not** grant any ownership, rights, or special privileges related to this project. This project is **not affiliated with PancakeSwap**. Please verify addresses before sending any funds, as transactions **cannot** be reversed.

**Note:** Donations are **anonymous** unless you notify us. If you'd like to be recognized, feel free to open an issue or reach out.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
