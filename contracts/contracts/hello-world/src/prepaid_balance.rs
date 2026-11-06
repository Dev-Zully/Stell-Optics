//! Prepaid balance contract.
//!
//! Tracks on-chain prepaid balances for supported use cases.
//!
//! A user can top up their balance by transferring tokens into the contract.
//! The balance can then be consumed by the backend operator when a data
//! purchase is fulfilled, providing an on-chain record of the prepaid amount
//! without requiring a separate payment per purchase.

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Map, Symbol, TokenClient};

/// Key used to store the per-user balance map.
const BALANCES_KEY: Symbol = Symbol::new_const("balances");

#[contract]
pub struct PrepaidBalance;

#[contractimpl]
impl PrepaidBalance {
    /// Top up a user's prepaid balance by transferring tokens into the
    /// contract. The caller must be the user whose balance is being topped up.
    pub fn top_up(env: &Env, user: Address, token: Address, amount: i128) {
        user.require_auth();

        let contract_addr = env.current_contract_address();
        TokenClient::new(env, &token).transfer(&user, &contract_addr, &amount);

        let mut balances: Map<Address, i128> =
            env.storage().instance().get(&BALANCES_KEY).unwrap_or_else(|| Map::new(env));
        let current = balances.get(user.clone()).unwrap_or(0);
        balances.set(user, current + amount);
        env.storage().instance().set(&BALANCES_KEY, &balances);
    }

    /// Consume an amount from a user's prepaid balance. Only callable by the
    /// backend operator when a data purchase is fulfilled.
    pub fn consume(env: &Env, user: Address, amount: i128) {
        let admin = Self::admin(env);
        admin.require_auth();

        let mut balances: Map<Address, i128> =
            env.storage().instance().get(&BALANCES_KEY).unwrap_or_else(|| Map::new(env));
        let current = balances.get(user.clone()).expect("insufficient balance");
        if current < amount {
            panic!("insufficient balance");
        }
        balances.set(user, current - amount);
        env.storage().instance().set(&BALANCES_KEY, &balances);
    }

    /// Read the current prepaid balance for a user.
    pub fn balance_of(env: &Env, user: Address) -> i128 {
        let balances: Map<Address, i128> =
            env.storage().instance().get(&BALANCES_KEY).unwrap_or_else(|| Map::new(env));
        balances.get(user).unwrap_or(0)
    }

    /// Set the admin address. Callable once during deployment.
    pub fn set_admin(env: &Env, admin: Address) {
        let key = Self::admin_key(env);
        if env.storage().instance().has(&key) {
            panic!("admin already set");
        }
        admin.require_auth();
        env.storage().instance().set(&key, &admin);
    }

    fn admin_key(env: &Env) -> Symbol {
        Symbol::new(env, "admin")
    }

    fn admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&Self::admin_key(env))
            .expect("admin not set")
    }
}