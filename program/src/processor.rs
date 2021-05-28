use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke,
    pubkey::Pubkey,
};

pub struct Processor {}
impl Processor {
    pub fn process(_program_id: &Pubkey, accounts: &[AccountInfo], _input: &[u8]) -> ProgramResult {
        let iter = &mut accounts.iter();
        let funder_info = next_account_info(iter)?;
        let owner_info = next_account_info(iter)?;
        let owner_associated_info = next_account_info(iter)?;

        let mint_info = next_account_info(iter)?;
        let rent_info = next_account_info(iter)?;
        let spl_token_info = next_account_info(iter)?;
        let spl_assoc_info = next_account_info(iter)?;

        invoke(
            &spl_associated_token_account::create_associated_token_account(
                funder_info.key,
                owner_info.key,
                mint_info.key,
            ),
            &[
                funder_info.clone(),
                owner_info.clone(),
                owner_associated_info.clone(),
                mint_info.clone(),
                rent_info.clone(),
                spl_token_info.clone(),
                spl_assoc_info.clone(),
            ],
        )
    }
}
