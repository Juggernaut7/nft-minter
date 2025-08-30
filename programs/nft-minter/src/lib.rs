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

    /// 🎯 Advanced NFT Minting with Dynamic Attributes
    /// Features: Time-based rarity, fusion potential, achievement tracking
    pub fn mint_nft(
        ctx: Context<MintNFT>,
        name: String,
        uri: String,
        level: u64,
        rarity: String,
        fusion_potential: u64,
    ) -> Result<()> {
        let payer = &ctx.accounts.payer;
        let asset = &ctx.accounts.asset;
        let collection = &ctx.accounts.collection;
        let clock = Clock::get()?;

        // 🎲 Dynamic rarity based on mint time (more rare at specific hours)
        let hour = (clock.unix_timestamp / 3600) % 24;
        let dynamic_rarity = if hour == 0 || hour == 12 { "Legendary" } else { &rarity };

        // 🏆 Achievement system - track minting milestones
        let achievement_level = match level {
            1..=10 => "Novice",
            11..=25 => "Apprentice", 
            26..=50 => "Expert",
            51..=75 => "Master",
            _ => "Grandmaster",
        };

        // 🧬 Fusion potential affects future evolution
        let fusion_bonus = fusion_potential * 10;

        let attributes = vec![
            Attribute { key: "level".to_string(), value: level.to_string() },
            Attribute { key: "rarity".to_string(), value: dynamic_rarity.to_string() },
            Attribute { key: "mint_date".to_string(), value: clock.unix_timestamp.to_string() },
            Attribute { key: "fusion_potential".to_string(), value: fusion_potential.to_string() },
            Attribute { key: "achievement_level".to_string(), value: achievement_level.to_string() },
            Attribute { key: "fusion_bonus".to_string(), value: fusion_bonus.to_string() },
            Attribute { key: "mint_hour".to_string(), value: hour.to_string() },
        ];

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

        msg!("🎉 NFT minted with {} rarity at hour {}!", dynamic_rarity, hour);
        msg!("🏆 Achievement: {} | Fusion Potential: {}", achievement_level, fusion_potential);
        
        Ok(())
    }

    /// 🚀 Advanced Metadata Updates with Time-Locked Features
    /// Features: Cooldown periods, rarity-based rewards, achievement progression
    pub fn update_nft_metadata(
        ctx: Context<UpdateNFTMetadata>,
        new_level: u64,
        min_time_elapsed: i64,
        new_rarity: Option<String>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        let nft_state = &mut ctx.accounts.nft_state;

        // ⏰ Cooldown system with rarity-based timing
        let cooldown_multiplier = match nft_state.rarity.as_str() {
            "Common" => 1,
            "Uncommon" => 2,
            "Rare" => 3,
            "Epic" => 4,
            "Legendary" => 5,
            _ => 6,
        };
        
        let required_cooldown = min_time_elapsed * cooldown_multiplier;
        require!(
            current_time >= nft_state.last_updated + required_cooldown,
            NftError::UpdateTooSoon
        );

        // 📈 Progressive level validation
        require!(
            new_level > nft_state.level,
            NftError::InvalidLevelProgression
        );

        // 🎁 Rarity-based rewards
        let reward_multiplier = match nft_state.rarity.as_str() {
            "Common" => 1,
            "Uncommon" => 2,
            "Rare" => 3,
            "Epic" => 4,
            "Legendary" => 5,
            _ => 6,
        };

        let level_gain = new_level - nft_state.level;
        let bonus_experience = level_gain * reward_multiplier;

        let mut new_attributes = vec![
            Attribute { key: "level".to_string(), value: new_level.to_string() },
            Attribute { key: "last_updated".to_string(), value: current_time.to_string() },
            Attribute { key: "bonus_experience".to_string(), value: bonus_experience.to_string() },
            Attribute { key: "cooldown_multiplier".to_string(), value: cooldown_multiplier.to_string() },
        ];

        if let Some(rarity) = new_rarity {
            new_attributes.push(Attribute {
                key: "rarity".to_string(),
                value: rarity,
            });
        }

        UpdateV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
            .asset(&ctx.accounts.asset)
            .authority(&ctx.accounts.payer)
            .new_update_authority(None)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Attributes { attributes: new_attributes },
                authority: None,
            }])
            .invoke()?;

        nft_state.level = new_level;
        nft_state.last_updated = current_time;
        if let Some(rarity) = new_rarity {
            nft_state.rarity = rarity;
        }

        msg!("🚀 NFT updated! Level: {} | Bonus XP: {} | Cooldown: {}x", 
             new_level, bonus_experience, cooldown_multiplier);
        
        Ok(())
    }

    /// 🌟 Advanced NFT Evolution with Fusion Mechanics
    /// Features: Time-based evolution, fusion potential, rarity progression
    pub fn evolve_nft(ctx: Context<EvolveNFT>) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        let nft_state = &mut ctx.accounts.nft_state;

        // ⏱️ Time-based evolution with fusion bonus
        let base_evolution_time = nft_state.level * 86400; // 1 day per level
        let fusion_bonus = nft_state.fusion_potential * 3600; // 1 hour per fusion point
        let total_required_time = base_evolution_time - fusion_bonus;
        
        let time_since_mint = current_time - nft_state.mint_date;
        require!(
            time_since_mint >= total_required_time,
            NftError::EvolutionNotReady
        );

        // 🎲 Rarity evolution with probability system
        let evolution_chance = match nft_state.rarity.as_str() {
            "Common" => 100,      // 100% chance to evolve
            "Uncommon" => 85,     // 85% chance
            "Rare" => 70,         // 70% chance
            "Epic" => 50,         // 50% chance
            "Legendary" => 25,    // 25% chance
            _ => 10,             // 10% chance for Mythic
        };

        // 🎯 Random evolution success check
        let random_seed = current_time % 100;
        require!(
            random_seed <= evolution_chance,
            NftError::EvolutionFailed
        );

        let new_level = nft_state.level + 1;
        let evolved_rarity = match nft_state.rarity.as_str() {
            "Common" => "Uncommon",
            "Uncommon" => "Rare",
            "Rare" => "Epic",
            "Epic" => "Legendary",
            "Legendary" => "Mythic",
            _ => "Divine",
        };

        let evolved_attributes = vec![
            Attribute { key: "level".to_string(), value: new_level.to_string() },
            Attribute { key: "rarity".to_string(), value: evolved_rarity.to_string() },
            Attribute { key: "evolved_at".to_string(), value: current_time.to_string() },
            Attribute { key: "evolution_count".to_string(), value: (nft_state.evolution_count + 1).to_string() },
            Attribute { key: "fusion_bonus_used".to_string(), value: fusion_bonus.to_string() },
            Attribute { key: "evolution_chance".to_string(), value: evolution_chance.to_string() },
        ];

        UpdateV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
            .asset(&ctx.accounts.asset)
            .authority(&ctx.accounts.payer)
            .new_update_authority(None)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Attributes { attributes: evolved_attributes },
                authority: None,
            }])
            .invoke()?;

        nft_state.level = new_level;
        nft_state.rarity = evolved_rarity.to_string();
        nft_state.last_updated = current_time;
        nft_state.evolution_count += 1;

        msg!("🌟 NFT evolved to {} rarity! Level: {} | Fusion bonus: {} hours", 
             evolved_rarity, new_level, fusion_bonus / 3600);
        
        Ok(())
    }

    /// 🔥 NFT Fusion - Combine two NFTs for enhanced attributes
    /// Features: Fusion mechanics, attribute inheritance, rarity boost
    pub fn fuse_nfts(
        ctx: Context<FuseNFTs>,
        fusion_type: String,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        
        let nft_state_1 = &ctx.accounts.nft_state_1;
        let nft_state_2 = &ctx.accounts.nft_state_2;
        let result_nft_state = &mut ctx.accounts.result_nft_state;

        // 🔬 Fusion validation
        require!(
            nft_state_1.asset != nft_state_2.asset,
            NftError::CannotFuseSameNFT
        );

        // 🧬 Fusion type determines outcome
        let fusion_multiplier = match fusion_type.as_str() {
            "Power" => 2,
            "Speed" => 3,
            "Magic" => 4,
            "Legendary" => 5,
            _ => 1,
        };

        // 📊 Attribute fusion calculation
        let combined_level = (nft_state_1.level + nft_state_2.level) * fusion_multiplier / 2;
        let fusion_potential = nft_state_1.fusion_potential + nft_state_2.fusion_potential + 1;
        
        // 🎲 Rarity fusion with bonus chance
        let rarity_bonus = match (nft_state_1.rarity.as_str(), nft_state_2.rarity.as_str()) {
            ("Legendary", "Legendary") => "Divine",
            ("Epic", "Epic") => "Legendary",
            ("Rare", "Rare") => "Epic",
            _ => "Rare",
        };

        let fused_attributes = vec![
            Attribute { key: "level".to_string(), value: combined_level.to_string() },
            Attribute { key: "rarity".to_string(), value: rarity_bonus.to_string() },
            Attribute { key: "fusion_type".to_string(), value: fusion_type },
            Attribute { key: "fusion_potential".to_string(), value: fusion_potential.to_string() },
            Attribute { key: "fused_at".to_string(), value: current_time.to_string() },
            Attribute { key: "fusion_multiplier".to_string(), value: fusion_multiplier.to_string() },
        ];

        UpdateV1CpiBuilder::new(&ctx.accounts.mpl_core_program)
            .asset(&ctx.accounts.result_asset)
            .authority(&ctx.accounts.payer)
            .new_update_authority(None)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::Attributes { attributes: fused_attributes },
                authority: None,
            }])
            .invoke()?;

        // Update result NFT state
        result_nft_state.level = combined_level;
        result_nft_state.rarity = rarity_bonus.to_string();
        result_nft_state.fusion_potential = fusion_potential;
        result_nft_state.last_updated = current_time;
        result_nft_state.evolution_count = nft_state_1.evolution_count + nft_state_2.evolution_count;

        msg!("🔥 Fusion successful! New level: {} | Rarity: {} | Type: {}", 
             combined_level, rarity_bonus, fusion_type);
        
        Ok(())
    }
}

/// 🎯 Enhanced Context for Advanced NFT Minting
#[derive(Accounts)]
#[instruction(name: String, uri: String, level: u64, rarity: String, fusion_potential: u64)]
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

/// 🚀 Enhanced Context for Advanced Metadata Updates
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
        space = 8 + 8 + 32 + 8 + 8 + 8 + 8 + 8, // Enhanced space for new fields
        seeds = [b"nft_state", asset.key().as_ref()],
        bump
    )]
    pub nft_state: Account<'info, NftState>,
    
    /// CHECK: Metaplex Core program
    pub mpl_core_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// 🌟 Enhanced Context for Advanced NFT Evolution
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

/// 🔥 Context for NFT Fusion
#[derive(Accounts)]
pub struct FuseNFTs<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub asset_1: AccountInfo<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub asset_2: AccountInfo<'info>,
    
    /// CHECK: Handled by mpl-core
    #[account(mut)]
    pub result_asset: AccountInfo<'info>,
    
    #[account(
        seeds = [b"nft_state", asset_1.key().as_ref()],
        bump
    )]
    pub nft_state_1: Account<'info, NftState>,
    
    #[account(
        seeds = [b"nft_state", asset_2.key().as_ref()],
        bump
    )]
    pub nft_state_2: Account<'info, NftState>,
    
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 8 + 32 + 8 + 8 + 8 + 8 + 8,
        seeds = [b"nft_state", result_asset.key().as_ref()],
        bump
    )]
    pub result_nft_state: Account<'info, NftState>,
    
    /// CHECK: Metaplex Core program
    pub mpl_core_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// 🏆 Enhanced State Account with Advanced Features
#[account]
pub struct NftState {
    pub level: u64,
    pub rarity: String,
    pub mint_date: i64,
    pub last_updated: i64,
    pub evolution_count: u64,
    pub fusion_potential: u64,
    pub asset: Pubkey,
    pub achievement_points: u64,
}

impl Default for NftState {
    fn default() -> Self {
        Self {
            level: 0,
            rarity: "Common".to_string(),
            mint_date: 0,
            last_updated: 0,
            evolution_count: 0,
            fusion_potential: 0,
            asset: Pubkey::default(),
            achievement_points: 0,
        }
    }
}

/// 🎯 Comprehensive Error Codes for Better UX
#[error_code]
pub enum NftError {
    #[msg("Cannot update metadata too soon - cooldown period active")]
    UpdateTooSoon,
    
    #[msg("Level progression must be forward-only - cannot decrease level")]
    InvalidLevelProgression,
    
    #[msg("NFT is not ready for evolution - time requirement not met")]
    EvolutionNotReady,
    
    #[msg("Evolution failed - probability check unsuccessful")]
    EvolutionFailed,
    
    #[msg("Cannot fuse the same NFT with itself")]
    CannotFuseSameNFT,
    
    #[msg("Fusion requirements not met - check NFT compatibility")]
    FusionRequirementsNotMet,
    
    #[msg("Invalid rarity level specified")]
    InvalidRarity,
    
    #[msg("Achievement points insufficient for this action")]
    InsufficientAchievementPoints,
    
    #[msg("Time-locked feature - wait for unlock period")]
    TimeLockedFeature,
    
    #[msg("Fusion potential exhausted")]
    FusionPotentialExhausted,
} 