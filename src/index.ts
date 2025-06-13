import { type Wallet, JsonRpcProvider, Contract, parseUnits, formatUnits, formatEther } from "ethers";
import { Token, Percent } from "@pancakeswap/sdk";
import { FeeAmount, Pool, v3PoolAbi, quoterV2ABI, swapRouterABI } from "@pancakeswap/v3-sdk";
import IUniswapV3FactoryABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

export class PancakeSwapV3TokenSwap {
  private provider: JsonRpcProvider;
  private swapRouterAddress: string;
  private quoterAddress: string;
  private factoryAddress: string;

  constructor(
    providerUrl: string = "https://bsc-dataseed.binance.org/",
    swapRouterAddress: string = "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    quoterAddress: string = "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
    factoryAddress: string = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
  ) {
    this.provider = new JsonRpcProvider(providerUrl);
    this.swapRouterAddress = swapRouterAddress;
    this.quoterAddress = quoterAddress;
    this.factoryAddress = factoryAddress;
  }

  async fetchPrice(
    token0: Token,
    token1: Token
  ): Promise<{ value: number; token0: string; token1: string; invert: () => number }> {
    const pool = await this.getPool(token0, token1);

    // Get sqrtPriceX96 from the pool and calculate the price
    const sqrtPriceX96 = pool.sqrtRatioX96.toString();
    const value = (Number(sqrtPriceX96) / 2 ** 96) ** 2;

    return {
      value,
      invert: () => 1 / value,
      token0: pool.token0.symbol,
      token1: pool.token1.symbol,
    };
  }

  async checkBalance(token: Token, address: string): Promise<string> {
    const contract = new Contract(token.address, ERC20_ABI, this.provider);
    const balance = await contract.balanceOf(address);
    return formatUnits(balance, token.decimals);
  }

  async checkBNBBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return formatEther(balance);
  }

  async approveToken(token: Token, amount: string, wallet: Wallet): Promise<void> {
    const tokenContract = new Contract(token.address, ERC20_ABI, wallet);
    const amountInWei = parseUnits(amount, token.decimals);

    // Check current allowance
    const currentAllowance = await tokenContract.allowance(wallet.address, this.swapRouterAddress);

    // If the current allowance is less than the amount we want to approve, we proceed with approval
    if (currentAllowance < amountInWei) {
      const approvalTx = await tokenContract.approve(this.swapRouterAddress, amountInWei);
      await approvalTx.wait(); // Wait for the transaction to be mined
      console.log(`Approved ${amount} of ${token.symbol} for spender: ${this.swapRouterAddress}`);
    } else {
      console.log(`Sufficient allowance already set for ${token.symbol}.`);
    }
  }

  async simpleSwap(
    inputAmount: string,
    tokenIn: Token,
    tokenOut: Token,
    wallet: Wallet,
    slippagePercent: number = 0.5
  ): Promise<void> {
    const pool = await this.getPool(tokenIn, tokenOut);
    const amountInWei = parseUnits(inputAmount, tokenIn.decimals);
    const quoterContract = new Contract(this.quoterAddress, quoterV2ABI, wallet);

    const [amountOutWei] = await quoterContract.quoteExactInputSingle.staticCallResult({
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: amountInWei,
      fee: pool.fee,
      sqrtPriceLimitX96: 0,
    });

    if (amountOutWei === 0n) {
      throw new Error("Zero output amount, cannot proceed with the trade.");
    }

    const slippageTolerance = new Percent(Math.floor(slippagePercent * 100), 10_000);
    const amountOutMinimum =
      amountOutWei - (amountOutWei * BigInt(slippageTolerance.numerator)) / BigInt(slippageTolerance.denominator);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      fee: pool.fee,
      recipient: wallet.address,
      deadline,
      amountIn: amountInWei,
      amountOutMinimum,
      sqrtPriceLimitX96: 0,
    };

    const swapRouterContract = new Contract(this.swapRouterAddress, swapRouterABI, wallet);
    await this.approveToken(tokenIn, inputAmount, wallet);

    const { gasPrice } = await this.provider.getFeeData();
    if (!gasPrice) throw new Error("Failed to retrieve gas price");

    const gasLimit = await swapRouterContract.exactInputSingle.estimateGas(params);
    await swapRouterContract.exactInputSingle(params, { gasLimit, gasPrice });
  }

  // Function to get the pool, assuming it is a V3 pool
  private async getPool(token0: Token, token1: Token, feeAmount = FeeAmount.MEDIUM): Promise<Pool> {
    const factoryContract = new Contract(this.factoryAddress, IUniswapV3FactoryABI.abi, this.provider);
    const poolAddress = await factoryContract.getPool.staticCall(token0.address, token1.address, feeAmount);

    if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("No pair address found for the provided token pair.");
    }

    const poolContract = new Contract(poolAddress, v3PoolAbi, this.provider);
    const [liquidity, { sqrtPriceX96, tick }] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

    return new Pool(token0, token1, feeAmount, BigInt(sqrtPriceX96.toString()), BigInt(liquidity.toString()), tick);
  }
}
