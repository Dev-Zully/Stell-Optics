//! Stell-Optics Soroban contracts.
//!
//! This crate contains the on-chain logic used by Stell-Optics to back
//! selected purchase guarantees. Direct Stellar payments with backend
//! verification remain the simpler starting point; these contracts are
//! introduced where on-chain guarantees are valuable.
//!
//! - [`data_escrow`] — holds XLM for a mobile data purchase under
//!   predefined conditions (Phase 3 escrow mechanism).
//! - [`prepaid_balance`] — tracks on-chain prepaid balances for supported
//!   use cases (Phase 3 prepaid service mechanism).
//! - [`promo_program`] — transparent, rule-based rewards and incentives
//!   (Phase 3 promotional program).

#![no_std]

#[cfg(test)]
extern crate std;

pub mod data_escrow;
pub mod prepaid_balance;
pub mod promo_program;