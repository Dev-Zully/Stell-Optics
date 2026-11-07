//! Placeholder Soroban contract.
//!
//! This exists so `contracts/` has a real, buildable example rather than an
//! empty folder. Nothing in the app calls this — Stell-Optics' escrow today
//! runs through the dedicated contracts in `data-escrow/`, `prepaid-balance/`
//! and `promo-program/`. Swap this out once there's another example contract
//! to write.
#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Env, Symbol, Vec};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        vec![&env, Symbol::new(&env, "Hello"), to]
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_hello() {
        let env = Env::default();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let words = client.hello(&Symbol::new(&env, "Dev"));
        assert_eq!(
            words,
            vec![&env, Symbol::new(&env, "Hello"), Symbol::new(&env, "Dev")]
        );
    }
}