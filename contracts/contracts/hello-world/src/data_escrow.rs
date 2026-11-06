//! Data purchase escrow contract.
//!
//! Holds XLM for a mobile data purchase under predefined conditions.
//!
//! The escrow is created and funded in a single step by the buyer. Funds can
//! only be released to the merchant once the backend confirms data delivery,
//! or refunded to the buyer if the purchase fails or the dispute window
//! expires. This keeps payment and fulfillment decoupled while giving both
//! parties on-chain guarantees about where the funds are.

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Map, Symbol, TokenClient};

/// How long a purchase stays in the "awaiting delivery" state before the
/// buyer can claim a refund. Measured in ledger close intervals.
pub const ESCROW_DISPUTE_WINDOW: u32 = 100_000;

#[contract]
pub struct DataEscrow;

#[contractimpl]
impl DataEscrow {
    /// Create and immediately fund an escrow for a data purchase.
    ///
    /// `purchase_id` is a unique identifier supplied by the backend. It is
    /// stored on-chain so duplicate creations are rejected.
    ///
    /// `token` is the address of the SEP-41 token (e.g. native XLM) used to
    /// fund the escrow.
    pub fn create(
        env: &Env,
        buyer: Address,
        merchant: Address,
        purchase_id: BytesN<32>,
        amount: i128,
        token: Address,
    ) {
        buyer.require_auth();

        let purchase_key = Self::purchase_key(env, &purchase_id);
        if env.storage().instance().has(&purchase_key) {
            panic!("purchase already exists");
        }

        let contract_addr = env.current_contract_address();
        TokenClient::new(env, &token).transfer_from(&buyer, &contract_addr, &amount);

        let mut ledger: Map<BytesN<32>, EscrowState> =
            env.storage().instance().get(&Self::ledger_key(env)).unwrap_or_else(|| Map::new(env));

        ledger.set(
            purchase_id.clone(),
            EscrowState {
                buyer: buyer.clone(),
                merchant: merchant.clone(),
                amount,
                token,
                status: EscrowStatus::AwaitingDelivery,
                created_ledger: env.ledger().sequence(),
            },
        );
        env.storage().instance().set(&Self::ledger_key(env), &ledger);
        env.storage().instance().set(&purchase_key, &true);
    }

    /// Release funds to the merchant. Only callable by the backend operator
    /// (the contract admin) after the mobile data provider has confirmed
    /// delivery.
    pub fn release(env: &Env, purchase_id: BytesN<32>) {
        let admin = Self::admin(env);
        admin.require_auth();

        let mut ledger: Map<BytesN<32>, EscrowState> =
            env.storage().instance().get(&Self::ledger_key(env)).expect("no ledger");
        let mut state = ledger.get(purchase_id.clone()).expect("unknown purchase");

        match state.status {
            EscrowStatus::AwaitingDelivery => {}
            EscrowStatus::Released | EscrowStatus::Refunded => {
                panic!("purchase already settled");
            }
        }

        let contract_addr = env.current_contract_address();
        TokenClient::new(env, &state.token).transfer(&contract_addr, &state.merchant, &state.amount);

        state.status = EscrowStatus::Released;
        ledger.set(purchase_id, state);
        env.storage().instance().set(&Self::ledger_key(env), &ledger);
    }

    /// Refund the buyer. Callable by the backend operator when the purchase
    /// fails, or by the buyer once the dispute window has elapsed.
    pub fn refund(env: &Env, purchase_id: BytesN<32>, caller: Address) {
        let mut ledger: Map<BytesN<32>, EscrowState> =
            env.storage().instance().get(&Self::ledger_key(env)).expect("no ledger");
        let mut state = ledger.get(purchase_id.clone()).expect("unknown purchase");

        match state.status {
            EscrowStatus::AwaitingDelivery => {}
            EscrowStatus::Released | EscrowStatus::Refunded => {
                panic!("purchase already settled");
            }
        }

        let admin = Self::admin(env);
        let is_admin = admin == caller;
        let is_buyer = state.buyer == caller;
        let window_elapsed = env.ledger().sequence() >= state.created_ledger + ESCROW_DISPUTE_WINDOW;

        if !(is_admin || (is_buyer && window_elapsed)) {
            panic!("not authorized to refund");
        }

        let contract_addr = env.current_contract_address();
        TokenClient::new(env, &state.token).transfer(&contract_addr, &state.buyer, &state.amount);

        state.status = EscrowStatus::Refunded;
        ledger.set(purchase_id, state);
        env.storage().instance().set(&Self::ledger_key(env), &ledger);
    }

    /// Look up the current status of a purchase.
    pub fn status(env: &Env, purchase_id: BytesN<32>) -> EscrowStatus {
        let ledger: Map<BytesN<32>, EscrowState> =
            env.storage().instance().get(&Self::ledger_key(env)).unwrap_or_else(|| Map::new(env));
        ledger
            .get(purchase_id)
            .map(|s| s.status)
            .unwrap_or(EscrowStatus::Unknown)
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

    fn purchase_key(env: &Env, purchase_id: &BytesN<32>) -> (Symbol, BytesN<32>) {
        (Symbol::new(env, "purchase"), purchase_id.clone())
    }

    fn ledger_key(env: &Env) -> Symbol {
        Symbol::new(env, "ledger")
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

#[derive(Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Unknown,
    AwaitingDelivery,
    Released,
    Refunded,
}

#[derive(Clone)]
struct EscrowState {
    buyer: Address,
    merchant: Address,
    amount: i128,
    token: Address,
    status: EscrowStatus,
    created_ledger: u32,
}