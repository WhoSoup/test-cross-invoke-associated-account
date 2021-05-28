import {
    Token,
    TOKEN_PROGRAM_ID,
    MintLayout,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import {
    BPF_LOADER_PROGRAM_ID,
    BpfLoader,
    Keypair,
    LAMPORTS_PER_SOL,
    Transaction,
    TransactionInstruction,
    AccountMeta,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    sendAndConfirmTransaction,
    SystemProgram
} from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import * as fs from 'fs';

const connection = new Connection('http://localhost:8899');
const funder = new Keypair();

const token_id = new Keypair();

const mint_authority = new Keypair();
const deploy_key = new Keypair();
const programId = deploy_key.publicKey;

(async () => {
    console.log(`Funding ${funder.publicKey.toBase58()} with 20 SOL`);
    let sig = await connection.requestAirdrop(
        funder.publicKey,
        20 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig);

    console.log(`Deploy BPF to ${deploy_key.publicKey.toBase58()}`);
    const programdata = fs.readFileSync(
        '../program/target/deploy/test_treasury_program_address.so'
    );
    if (
        !(await BpfLoader.load(
            connection,
            funder,
            deploy_key,
            programdata,
            BPF_LOADER_PROGRAM_ID
        ))
    ) {
        console.log('Loading bpf failed');
        process.exit(1);
    }

    console.log(`Creating new SPL Token ${token_id.publicKey.toBase58()}`);

    // Allocate memory for the account
    const balanceNeeded = await Token.getMinBalanceRentForExemptMint(
        connection
    );

    const transaction = new Transaction();
    transaction.add(
        SystemProgram.createAccount({
            fromPubkey: funder.publicKey,
            newAccountPubkey: token_id.publicKey,
            lamports: balanceNeeded,
            space: MintLayout.span,
            programId: TOKEN_PROGRAM_ID
        })
    );

    transaction.add(
        Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            token_id.publicKey,
            0,
            mint_authority.publicKey,
            null
        )
    );

    await sendAndConfirmTransaction(connection, transaction, [
        funder,
        token_id
    ]);

    const normal = new Keypair();
    const normal_associated = await PublicKey.findProgramAddress(
        [
            normal.publicKey.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            token_id.publicKey.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    await (async () => {
        const keys: AccountMeta[] = [
            {
                pubkey: funder.publicKey,
                isSigner: true,
                isWritable: true
            },
            {
                pubkey: normal.publicKey,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: normal_associated[0],
                isSigner: false,
                isWritable: true
            },
            {
                pubkey: token_id.publicKey,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false
            }
        ];

        const t = new Transaction().add(
            new TransactionInstruction({
                keys,
                programId
            })
        );

        sig = await sendAndConfirmTransaction(connection, t, [funder]);
        console.log(`Normal associated created: ${sig}`);
    })();
})();
