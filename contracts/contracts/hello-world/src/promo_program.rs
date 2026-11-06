//! Promotional program contract.
//!
//! Transparent, rule-based rewards and incentives.
//!
//! An admin defines reward rules (a percentage of each qualifying purchase that
//! is credited back to the buyer as a promo balance). Purchases are recorded
//! on-chain and the credited promo balance can be claimed back to the buyer's
//! wallet, providing a transparent record of the incentive program.

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Map, Symbol, TokenClient};

/// Key used to store the per-user promo balance map.
const PROMO_BALANCES_KEY: Symbol = Symbol::new_const("promo_balances");

/// Key used to store the per-purchase credited amount, keyed by purchase id.
const PURCHASE_CREDIT_KEY: Symbol = Symbol::new_const("purchase_credit");

#[contract]
pub struct PromoProgram;

#[contractimpl]
impl PromoProgram {
    /// Record a qualifying purchase and credit the buyer's promo balance.
    ///
    /// `purchase_id` is a unique identifier supplied by the backend. The
    /// `credit` amount is the reward value derived from the admin-defined
    /// rule for that purchase.
    pub fn credit_purchase(env: &Env, buyer: Address, purchase_id: BytesN<32>, credit: i128) {
        let admin = Self::admin(env);
        admin.require_auth();

        let credit_key = (PURCHASE_CREDIT_KEY, purchase_id.clone());
        if env.storage().instance().has(&credit_key) {
            panic!("purchase already credited");
        }

        let mut balances: Map<Address, i128> =
            env.storage().instance().get(&PROMO_BALANCES_KEY).unwrap_or_else(|| Map::new(env));
        let current = balances.get(buyer.clone()).unwrap_or(0);
        balances.set(buyer, current + credit);
        env.storage().instance().set(&PROMO_BALANCES_KEY, &balances);

        env.storage().instance().set(&credit_key, &credit);
    }

    /// Claim the credited promo balance back to the buyer's wallet.
    pub fn claim(env: &Env, buyer: Address, token: Address) {
        buyer.require_auth();

        let mut balances: Map<Address, i128> =
            env.storage().instance().get(&PROMO_BALANCES_KEY).unwrap_or_else(|| Map::new(env));
        let current = balances.get(buyer.clone()).expect("no promo balance");
        if current <= 0 {
            panic!("nothing to claim");
        }
        balances.set(buyer, 0);
        env.storage().instance().set(&PROMO_BALANCES_KEY, &balances);

        let contract_addr = env.current_contract_address();
        TokenClient::new(env, &token).transfer(&contract_addr, &buyer, &current);
    }

    /// Read the current promo balance for a user.
    pub fn balance_of(env: &Env, user: Address) -> i128 {
        let balances: Map<Address, i128> =
            env.storage().instance().get(&PROMO_BALANCES_KEY).unwrap_or_else(|| Map::new(env));
        balances.get(user).unwrap_or(0)
    }

    /// Look up the credited amount for a purchase.
    pub fn purchase_credit(env: &Env, purchase_id: BytesN<32>) -> i128 {
        let credit_key = (PURCHASE_CREDIT_KEY, purchase_id);
        env.storage().instance().get(&credit_key).unwrap_or(0)
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