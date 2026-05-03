


// programs/mock_protocol/src/lib.rs
//
// A minimal DeFi protocol that SentinelGuard can watch.
// Simulates a USDC lending/liquidity pool with:
//   - deposit()       — add USDC to the vault
//   - withdraw()      — remove USDC from the vault
//   - flash_borrow()  — uncollateralized borrow (must repay in same tx)
//   - flash_repay()   — repay the flash loan
//   - drain_vault()   — ONLY in test mode — simulates an exploit drain
//
// The vault is a PDA token account holding USDC.
// SentinelGuard watches this program's ID for TVL changes.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln");
#[program]
pub mod mock_protocol {
    use super::*;

    /// Initialize the vault. Called once at setup.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.authority = ctx.accounts.authority.key();
        vault_state.vault = ctx.accounts.vault.key();
        vault_state.total_deposited = 0;
        vault_state.flash_loan_active = false;
        vault_state.bump = ctx.bumps.vault_state;
        vault_state.vault_bump = ctx.bumps.vault;
        msg!("MockProtocol vault initialized");
        Ok(())
    }

    /// Deposit USDC into the vault.
    /// TVL increases — SentinelGuard should see positive delta.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        vault_state.total_deposited += amount;
        msg!("Deposited {} USDC. New TVL: {}", amount, vault_state.total_deposited);
        Ok(())
    }

    /// Withdraw USDC from the vault.
    /// TVL decreases — normal operation, should NOT trigger alert.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault_state_acc_info = ctx.accounts.vault_state.to_account_info();
        let vault_state = &mut ctx.accounts.vault_state;
        require!(vault_state.total_deposited >= amount, MockError::InsufficientFunds);

        let seeds = &[
            b"vault_state",
            ctx.accounts.authority.key.as_ref(),
            &[vault_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: vault_state_acc_info
                },
                signer,
            ),
            amount,
        )?;

        vault_state.total_deposited -= amount;
        msg!("Withdrew {} USDC. New TVL: {}", amount, vault_state.total_deposited);
        Ok(())
    }

    /// Initiate a flash loan.
    /// Transfers `amount` USDC out of vault to borrower.
    /// flash_repay() MUST be called in the same transaction.
    pub fn flash_borrow(ctx: Context<FlashBorrow>, amount: u64) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        require!(!vault_state.flash_loan_active, MockError::FlashLoanAlreadyActive);
        require!(vault_state.total_deposited >= amount, MockError::InsufficientFunds);

        vault_state.flash_loan_active = true;
        vault_state.flash_loan_amount = amount;

        let seeds = &[
            b"vault_state",
            ctx.accounts.authority.key.as_ref(),
            &[vault_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.borrower_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // This log keyword is what Method 2 (log scan) detects
        msg!("flash_loan: borrowed {} USDC", amount);
        Ok(())
    }

    /// Repay the flash loan.
    /// Must be called after flash_borrow in the same transaction.
    pub fn flash_repay(ctx: Context<FlashRepay>, amount: u64) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        require!(vault_state.flash_loan_active, MockError::NoActiveFlashLoan);
        require!(amount >= vault_state.flash_loan_amount, MockError::InsufficientRepayment);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.borrower_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.borrower.to_account_info(),
                },
            ),
            amount,
        )?;

        vault_state.flash_loan_active = false;
        vault_state.flash_loan_amount = 0;
        msg!("flash_loan: repaid {} USDC", amount);
        Ok(())
    }

    /// Simulates an exploit drain — moves most of the vault to attacker.
    /// Only callable in test mode (no auth check intentionally — simulates vuln).
    pub fn drain_vault(ctx: Context<DrainVault>, amount: u64) -> Result<()> {
          let vault_state_acc_info = ctx.accounts.vault_state.to_account_info();
        let vault_state = &mut ctx.accounts.vault_state;
        require!(vault_state.total_deposited >= amount, MockError::InsufficientFunds);

        let seeds = &[
            b"vault_state",
            ctx.accounts.authority.key.as_ref(),
            &[vault_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.attacker_account.to_account_info(),
                    authority: vault_state_acc_info,
                },
                signer,
            ),
            amount,
        )?;

        vault_state.total_deposited -= amount;
        msg!("DRAIN: {} USDC removed from vault", amount);
        Ok(())
    }
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VaultState::INIT_SPACE,
        seeds = [b"vault_state", authority.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = vault_state,
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault_state", authority.key().as_ref()], bump = vault_state.bump)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, seeds = [b"vault", authority.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    /// CHECK: authority is stored in vault_state
    pub authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault_state", authority.key().as_ref()], bump = vault_state.bump)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, seeds = [b"vault", authority.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    /// CHECK: authority pubkey
    pub authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FlashBorrow<'info> {
    #[account(mut, seeds = [b"vault_state", authority.key().as_ref()], bump = vault_state.bump)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, seeds = [b"vault", authority.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub borrower_account: Account<'info, TokenAccount>,
    pub borrower: Signer<'info>,
    /// CHECK: authority pubkey
    pub authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FlashRepay<'info> {
    #[account(mut, seeds = [b"vault_state", authority.key().as_ref()], bump = vault_state.bump)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, seeds = [b"vault", authority.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub borrower_account: Account<'info, TokenAccount>,
    pub borrower: Signer<'info>,
    /// CHECK: authority pubkey
    pub authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DrainVault<'info> {
    #[account(mut, seeds = [b"vault_state", authority.key().as_ref()], bump = vault_state.bump)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, seeds = [b"vault", authority.key().as_ref()], bump = vault_state.vault_bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub attacker_account: Account<'info, TokenAccount>,
    /// CHECK: no auth check — simulates vulnerable protocol
    pub authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

// ─── State ────────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub authority: Pubkey,
    pub vault: Pubkey,
    pub total_deposited: u64,
    pub flash_loan_active: bool,
    pub flash_loan_amount: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum MockError {
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    #[msg("Flash loan already active")]
    FlashLoanAlreadyActive,
    #[msg("No active flash loan to repay")]
    NoActiveFlashLoan,
    #[msg("Repayment amount less than borrowed amount")]
    InsufficientRepayment,
}
