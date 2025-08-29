use anchor_lang::prelude::*;
use mpl_core::{
    instructions::{CreateV1CpiBuilder, UpdateV1CpiBuilder},
    types::{Attribute, Key, Plugin, PluginAuthorityPair},
};
use anchor_lang::solana_program::clock::Clock;

declare_id!("C9PLf3qMCVqtUCJtEBy8NCcseNp3KTZwFJxAtDdN1bto");

#[program]
pub mod nft_minter {
    use super::*;

    /// Instruction to mint an NFT with initial metadata and attributes
    /// This showcases basic NFT minting with Metaplex Core
    pub fn mint_nft(
        ctx: Context<MintNFT>,
        name: String,
        uri: String,
        level: u64,
        rarity: String,
    ) -> Result<()> {
        let payer = &ctx.accounts.payer;
        let asset = &ctx.accounts.asset;
        let collection = &ctx.accounts.collection;

        // Initialize comprehensive attributes for the NFT
        let attributes = vec![
            Attribute {
                key: "level".to_string(),
                value: level.to_string(),
            },
            Attribute {
                key: "rarity".to_string(),
                value: rarity,
            },
            Attribute {
                key: "mint_date".to_string(),
                value: Clock::get()?.unix_timestamp.to_string(),
            },
        ];

        // Build and invoke Metaplex Core CreateV1 CPI
        CreateV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
            .asset(&asset)
            .collection(Some(collection))
            .authority(Some(&payer))
            .owner(Some(&payer))
            .update_authority(Some(&payer))
            .name(name)
            .uri(uri)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Attributes { attributes },
                authority: None,
            }])
            .invoke()?;

        msg!("🎉 NFT minted successfully!");
        msg!("Asset: {}", asset.key());
        msg!("Level: {}", level);
        
        Ok(())
    }

    /// Instruction to update NFT metadata with time-based restrictions
    /// This demonstrates dynamic metadata updates and creative features
    pub fn update_nft_metadata(
        ctx: Context<UpdateNFTMetadata>,
        new_level: u64,
        min_time_elapsed: i64,
        new_rarity: Option<String>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        let nft_state = &mut ctx.accounts.nft_state;

        // Ensure enough time has passed since last update
        require!(
            current_time >= nft_state.last_updated + min_time_elapsed,
            NftError::UpdateTooSoon
        );

        // Validate level progression (can't go backwards)
        require!(
            new_level > nft_state.level,
            NftError::InvalidLevelProgression
        );

        // Build new attributes
        let mut new_attributes = vec![
            Attribute {
                key: "level".to_string(),
                value: new_level.to_string(),
            },
            Attribute {
                key: "last_updated".to_string(),
                value: current_time.to_string(),
            },
        ];

        // Add rarity if provided
        if let Some(rarity) = new_rarity {
            new_attributes.push(Attribute {
                key: "rarity".to_string(),
                value: rarity,
            });
        }

        // Build and invoke Metaplex Core UpdateV1 CPI
        UpdateV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
            .asset(&ctx.accounts.asset)
            .authority(&ctx.accounts.payer)
            .new_update_authority(None)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Attributes { attributes: new_attributes },
                authority: None,
            }])
            .invoke()?;

        // Update local state
        nft_state.level = new_level;
        nft_state.last_updated = current_time;
        if let Some(rarity) = new_rarity {
            nft_state.rarity = rarity;
        }

        msg!("🚀 NFT metadata updated successfully!");
        msg!("New level: {}", new_level);
        msg!("Update timestamp: {}", current_time);
        
        Ok(())
    }

    /// Instruction to evolve NFT based on time and owner actions
    /// This showcases creative gamification features
    pub fn evolve_nft(ctx: Context<EvolveNFT>) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        let nft_state = &mut ctx.accounts.nft_state;

        // Calculate evolution based on time and current level
        let time_since_mint = current_time - nft_state.mint_date;
        let evolution_threshold = nft_state.level * 86400; // 1 day per level

        require!(
            time_since_mint >= evolution_threshold,
            NftError::EvolutionNotReady
        );

        // Evolve the NFT
        let new_level = nft_state.level + 1;
        let evolved_rarity = match nft_state.rarity.as_str() {
            "Common" => "Uncommon",
            "Uncommon" => "Rare",
            "Rare" => "Epic",
            "Epic" => "Legendary",
            _ => "Mythic",
        };

        // Update attributes with evolution
        let evolved_attributes = vec![
            Attribute {
                key: "level".to_string(),
                value: new_level.to_string(),
            },
            Attribute {
                key: "rarity".to_string(),
                value: evolved_rarity.to_string(),
            },
            Attribute {
                key: "evolved_at".to_string(),
                value: current_time.to_string(),
            },
            Attribute {
                key: "evolution_count".to_string(),
                value: (nft_state.evolution_count + 1).to_string(),
            },
        ];

        // Update via Metaplex Core
        UpdateV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
            .asset(&ctx.accounts.asset)
            .authority(&ctx.accounts.payer)
            .new_update_authority(None)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Attributes { attributes: evolved_attributes },
                authority: None,
            }])
            .invoke()?;

        // Update local state
        nft_state.level = new_level;
        nft_state.rarity = evolved_rarity.to_string();
        nft_state.last_updated = current_time;
        nft_state.evolution_count += 1;

        msg!("🌟 NFT evolved to level {} with {} rarity!", new_level, evolved_rarity);
        
        Ok(())
    }
}

/// Context for minting an NFT
#[derive(Accounts)]
#[instruction(name: String, uri: String, level: u64, rarity: String)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub asset: AccountInfo<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub collection: AccountInfo<'info>,
    
    /// CHECK: Metaplex Core program
    pub mpl_core_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Context for updating NFT metadata
#[derive(Accounts)]
pub struct UpdateNFTMetadata<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub asset: AccountInfo<'info>,
    
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 8 + 8 + 32 + 8 + 8,
        seeds = [b"nft_state", asset.key().as_ref()],
        bump
    )]
    pub nft_state: Account<'info, NftState>,
    
    /// CHECK: Metaplex Core program
    pub mpl_core_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Context for evolving NFT
#[derive(Accounts)]
pub struct EvolveNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub asset: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"nft_state", asset.key().as_ref()],
        bump
    )]
    pub nft_state: Account<'info, NftState>,
    
    /// CHECK: Metaplex Core program
    pub mpl_core_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// State account to track NFT metadata and evolution
#[account]
pub struct NftState {
    pub level: u64,
    pub rarity: String,
    pub mint_date: i64,
    pub last_updated: i64,
    pub evolution_count: u64,
}

impl Default for NftState {
    fn default() -> Self {
        Self {
            level: 0,
            rarity: "Common".to_string(),
            mint_date: 0,
            last_updated: 0,
            evolution_count: 0,
        }
    }
}

/// Custom error codes for better user experience
#[error_code]
pub enum NftError {
    #[msg("Cannot update metadata too soon")]
    UpdateTooSoon,
    
    #[msg("Level progression must be forward-only")]
    InvalidLevelProgression,
    
    #[msg("NFT is not ready for evolution yet")]
    EvolutionNotReady,
} 